/* Stage 2 of the fact-checking pipeline: the independent check (Anthropic).

   Run:  node scripts/check-facts.mjs                 # dry run, costs nothing
         node scripts/check-facts.mjs --limit 10 --apply
         node scripts/check-facts.mjs --apply

   ---------------------------------------------------------------------------
   WHY THE CHECK IS BLIND -- the single most important property of this file
   ---------------------------------------------------------------------------
   The checker is sent the CLAIM AND NOTHING ELSE. Not the stored value, not
   `context`, not `goDeeper`, not `source`, not `approx`. It is asked to
   establish the answer from its own knowledge and to cite where it would be
   confirmed. Only afterwards, in this process, is its answer compared to what
   the corpus holds.

   The reason is anchoring. Ask a language model "we have 1776, is that right?"
   and it will agree -- with 1776, and just as readily with 1775. Agreement
   with a value you handed it is worth nothing; it measures the model's
   agreeableness, not the fact. The corpus value must never appear anywhere in
   the request, because the owner does not check facts himself: this pipeline
   is the only thing standing between a generated fact and a player reading it
   as true.

   The single unavoidable leak is the unit for `number` facts ("answer in
   metres"), without which the answer is not comparable. A unit is not a value.

   This script never writes to data/. It never changes a fact's status. It
   writes one report file, review/checks-anthropic.json.

   This file also exports the pure helpers shared with
   scripts/check-facts-openai.mjs and scripts/adjudicate.mjs. Running it
   directly runs the Anthropic stage; importing it just gets the helpers. */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { MODELS, estimateCostUsd } from '../lib/aiModels.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const FACTS_DIR = join(ROOT, 'data', 'facts');
export const REVIEW_DIR = join(ROOT, 'review');

/* ------------------------------------------------------------------ args -- */

/** Dry run is the default everywhere in this project: nothing spends money or
    writes a file without --apply. */
export function parseArgs(argv) {
  const opts = { apply: false, force: false, limit: null, concurrency: 5, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') opts.apply = true;
    else if (a === '--dry-run') opts.apply = false;
    else if (a === '--force') opts.force = true;
    else if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--limit') opts.limit = Number(argv[++i]);
    else if (a.startsWith('--limit=')) opts.limit = Number(a.slice(8));
    else if (a === '--concurrency') opts.concurrency = Number(argv[++i]);
    else if (a === '--angle') opts.angle = argv[++i];
    else if (a.startsWith('--angle=')) opts.angle = a.slice('--angle='.length);
    else if (a.startsWith('--concurrency=')) opts.concurrency = Number(a.slice(14));
    else throw new Error(`unknown flag: ${a}`);
  }
  if (opts.limit !== null && (!Number.isInteger(opts.limit) || opts.limit < 1)) {
    throw new Error('--limit needs a positive whole number');
  }
  if (!Number.isInteger(opts.concurrency) || opts.concurrency < 1) {
    throw new Error('--concurrency needs a positive whole number');
  }
  return opts;
}

/* ----------------------------------------------------------------- facts -- */

/** Every fact in the corpus, flattened, tagged with its category. */
export function loadFacts(dir = FACTS_DIR) {
  const out = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const doc = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    for (const f of doc.facts) out.push({ ...f, category: doc.id });
  }
  return out;
}

/** What the corpus currently holds -- the thing the model must never be told. */
export function storedAnswer(fact) {
  return fact.kind === 'boolean' ? fact.answer : fact.value;
}

/* --------------------------------------------------------------- prompts -- */

const SYSTEM = [
  'You are a careful fact checker.',
  'You are given a single claim and nothing else: no proposed answer, no notes, no source.',
  'Establish the correct answer from your own knowledge, and cite the specific source where a reader would confirm it.',
  'If there is no single well-established answer, or the claim is too vague to pin down, say so instead of guessing.',
  'Reply with a single JSON object and nothing else. No prose, no markdown fences.',
].join(' ');

/* ------------------------------------------------------------- angles ----

   Using a second vendor was supposed to decorrelate errors, and it only
   half does. Two models trained on the same corpus share the same wrong
   beliefs, and asking both the same question the same way gets the same
   wrong answer twice with high confidence.

   Prompting cannot fix an error that lives in the weights -- if a model
   simply learned the wrong date, no framing makes it un-learn it. What
   prompting CAN break is a shared *reasoning path*: two models asked "what
   year was X" both reach for the same first instinct. Route the question
   differently and some of that agreement falls apart.

   So the two stages do not merely use different vendors, they ask
   different questions:

     direct       state the answer. The baseline.
     triangulate  place the event in a sequence and date it RELATIVE to
                  something else first. A model confidently wrong about an
                  absolute year is often right about an interval, and the
                  two answers then disagree with each other -- which is the
                  signal we actually want.
     refute       argue the claim is false and produce the strongest
                  evidence against it. Prosecutorial framing surfaces doubt
                  that a neutral prompt suppresses. It also manufactures
                  some false doubt, so it is a flag generator for the
                  disputed pile, never a verdict on its own.

   The honest limit: none of this touches correlated *knowledge* error. The
   only real fix for that is grounding the check in a fetched source rather
   than in either model's memory. See docs/CHECKING.md. */
export const ANGLES = ['direct', 'triangulate', 'refute'];

const ANGLE_LEAD = {
  direct: '',
  triangulate: [
    'Do not answer from the date alone. Work it out in this order:',
    '  1. Name one or two well-documented events you can place this one against.',
    '  2. State whether this came before or after each, and by roughly how many years.',
    '  3. Only then give the year that follows from that placement.',
    'If step 3 disagrees with your first instinct, trust the placement and say so in "note".',
    '',
  ].join('\n'),
  refute: [
    'Treat this as a claim you suspect is wrong. Argue against it first:',
    'name the most likely way it is mistaken -- a confused date, a conflated event,',
    'a figure that is disputed or commonly misquoted. Then give the answer you can',
    'actually defend. If the claim survives the attempt, say so plainly in "note".',
    '',
  ].join('\n'),
};

/* Nothing from the fact except `claim`, `kind` and (for numbers) `unit` may
   ever appear in the returned strings. See the anchoring note at the top. */
export function buildBlindPrompt(fact, angle = 'direct') {
  if (!ANGLES.includes(angle)) throw new Error(`unknown angle: ${angle}`);
  const lead = ANGLE_LEAD[angle];
  const shape = '"confidence": "high" | "medium" | "low", "source_title": "...", "source_url": "https://...", "note": "one short sentence"';

  if (fact.kind === 'year') {
    return {
      system: SYSTEM,
      user: [
        `CLAIM: ${fact.claim}`,
        '',
        lead,
        'In what year did this happen? A single year, not a range.',
        'Use a negative integer for BC/BCE years: 44 BC is -44.',
        'If the claim as written is false, or has no single well-established year, set "value" to null and explain in "note".',
        '',
        'Reply with JSON only:',
        `{"value": <integer or null>, ${shape}}`,
      ].join('\n'),
    };
  }

  if (fact.kind === 'number') {
    /* The unit has to travel with the claim or the answer is not comparable
       ("height of the Great Pyramid" is 146 or 480 depending on the unit).
       A unit is not a value and does not anchor the answer. */
    const unit = fact.prefix === '$' ? `${fact.unit} (US dollars, unadjusted)` : fact.unit;
    return {
      system: SYSTEM,
      user: [
        `CLAIM: ${fact.claim}`,
        '',
        lead,
        `What is the correct figure? Answer in ${unit}.`,
        'Give a plain number: no commas, no units, no currency symbols, no words like "million".',
        'If there is no single well-established figure, set "value" to null and explain in "note".',
        '',
        'Reply with JSON only:',
        `{"value": <number or null>, ${shape}}`,
      ].join('\n'),
    };
  }

  if (fact.kind === 'boolean') {
    return {
      system: SYSTEM,
      user: [
        `CLAIM: ${fact.claim}`,
        '',
        lead,
        'Is this claim true or false as written? Judge the claim on its own terms.',
        'If it cannot be judged true or false, set "answer" to null and explain in "note".',
        '',
        'Reply with JSON only:',
        `{"answer": true | false | null, ${shape}}`,
      ].join('\n'),
    };
  }

  throw new Error(`unknown fact kind: ${fact.kind}`);
}

/* ------------------------------------------------------- reading replies -- */

/** First JSON object in a reply, tolerating fences and stray prose. */
export function extractJson(text) {
  if (typeof text !== 'string') return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

/* A range, e.g. "1500 to 2000" or "1,500-2,000". The two branches exist
   because a bare hyphen IS the separator: in "1500-2000" the minus sign
   belongs to the range, not to the second number. Reading it as -2000 gave a
   midpoint of -250. */
const RANGE = /(-?\d+(?:\.\d+)?)\s*(?:(?:–|—|to)\s*(-?\d+(?:\.\d+)?)|-\s*(\d+(?:\.\d+)?))/;
/* "the 1770s" is a decade, not a year. */
const DECADE = /\d0s\b/;

/** Model answer -> number, or null when it cannot be read unambiguously.
    Returning null is deliberate and safe: it becomes "unverifiable", which
    lands the fact in the disputed pile where a human sees it. Guessing which
    number in "April 19, 1775" was meant would not be. */
export function toNumber(raw) {
  if (raw === null || raw === undefined || typeof raw === 'boolean') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;

  let s = String(raw).trim().toLowerCase();
  if (!s || ['null', 'none', 'unknown', 'n/a', 'na', 'unverifiable'].includes(s)) return null;

  const isBc = /\b(bc|bce)\b/.test(s);
  s = s.replace(/,/g, '');
  if (DECADE.test(s)) return null;
  const nums = s.match(/-?\d+(?:\.\d+)?/g);
  if (!nums) return null;

  let n;
  if (nums.length === 1) {
    n = Number(nums[0]);
  } else {
    const range = s.match(RANGE);
    if (!range) return null;                       // ambiguous, do not guess
    n = (Number(range[1]) + Number(range[2] ?? range[3])) / 2;   // midpoint
  }
  if (!Number.isFinite(n)) return null;

  if (/\bbillion\b/.test(s)) n *= 1e9;
  else if (/\bmillion\b/.test(s)) n *= 1e6;
  else if (/\bthousand\b/.test(s)) n *= 1e3;

  if (isBc && n > 0) n = -n;
  return n;
}

/** Model answer -> boolean, or null. */
export function toBoolean(raw) {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase();
  if (['true', 'yes', 'correct', 't'].includes(s)) return true;
  if (['false', 'no', 'incorrect', 'f'].includes(s)) return false;
  return null;
}

/* ----------------------------------------------------------- comparison -- */

/** How far a model answer may sit from the stored one and still count as a match.

    year   : zero. The game asks "before or after 1870?" and pairs facts by
             which came first; a one-year drift is a wrong answer on screen.
    number : 1% (floor 0.5, so small integers must be exact), or 10% when the
             fact is flagged `approx` -- those are contested figures where the
             corpus itself only claims to be close. `approx` is used HERE, on
             our side of the wire; it is never sent to the model. */
export function toleranceFor(fact) {
  if (fact.kind === 'year') return 0;
  if (fact.approx) return Math.max(Math.abs(fact.value) * 0.10, 1);
  return Math.max(Math.abs(fact.value) * 0.01, 0.5);
}

/** -> { verdict: 'match' | 'mismatch' | 'unverifiable', delta } */
export function compareValues(fact, modelAnswer) {
  if (fact.kind === 'boolean') {
    const b = toBoolean(modelAnswer);
    if (b === null) return { verdict: 'unverifiable', delta: null };
    return { verdict: b === fact.answer ? 'match' : 'mismatch', delta: null };
  }
  const n = toNumber(modelAnswer);
  if (n === null) return { verdict: 'unverifiable', delta: null };
  const delta = n - fact.value;
  return { verdict: Math.abs(delta) <= toleranceFor(fact) ? 'match' : 'mismatch', delta };
}

/** The stored record for one fact. Shape is shared by both stages so
    adjudicate.mjs can merge them without knowing which vendor produced them. */
export function buildRecord(fact, parsed, modelId, rawText) {
  const rawAnswer = fact.kind === 'boolean' ? parsed?.answer : parsed?.value;
  const { verdict, delta } = parsed
    ? compareValues(fact, rawAnswer)
    : { verdict: 'unverifiable', delta: null };

  const modelValue =
    fact.kind === 'boolean' ? toBoolean(rawAnswer) : toNumber(rawAnswer);

  return {
    id: fact.id,
    category: fact.category,
    kind: fact.kind,
    claim: fact.claim,
    stored_value: storedAnswer(fact),
    model_value: modelValue,
    verdict,
    delta,
    confidence: typeof parsed?.confidence === 'string' ? parsed.confidence : null,
    source_url: typeof parsed?.source_url === 'string' ? parsed.source_url : '',
    source_title: typeof parsed?.source_title === 'string' ? parsed.source_title : '',
    note: typeof parsed?.note === 'string' ? parsed.note : (parsed ? '' : 'model reply was not JSON'),
    model: modelId,
    checked_at: new Date().toISOString(),
    /* Kept only when something went wrong, so the file stays small but a
       failure is still debuggable without paying for the call twice. */
    ...(verdict === 'unverifiable' && rawText ? { raw_reply: String(rawText).slice(0, 600) } : {}),
  };
}

/* -------------------------------------------------------------- storage -- */

export function readChecks(file) {
  if (!existsSync(file)) return { stage: null, model: null, updated: null, results: {} };
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  return { results: {}, ...doc };
}

export function writeChecks(file, doc) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
}

/* -------------------------------------------------------------- runtime -- */

/** Run `fn` over `items`, at most `n` in flight. Results come back in order. */
export async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

export class RetryableError extends Error {}

/** Three tries, backing off. Rate limits and 5xx are worth retrying; a 400 or
    a 401 is a bug or a bad key and retrying just burns time. */
export async function withRetry(fn, { tries = 3, baseMs = 1000 } = {}) {
  let last;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (!(err instanceof RetryableError) || attempt === tries) throw err;
      await sleep(baseMs * 3 ** (attempt - 1));
    }
  }
  throw last;
}

export function requireKey(name) {
  const v = process.env[name];
  if (!v || !v.trim()) {
    console.error(`\nMissing ${name}.`);
    console.error(`This stage cannot run without it, and there is no fallback by design.`);
    console.error(`Set it in your shell or in .env.local (see .env.example), then re-run:`);
    console.error(`  export ${name}=...\n`);
    process.exit(2);
  }
  return v.trim();
}

const fmtUsd = (n) => (n < 0.01 ? `<$0.01` : `$${n.toFixed(2)}`);

/* ------------------------------------------------------------- the stage -- */

/** The whole run, shared by both vendors. `callModel` is the only difference:
    ({ system, user, apiKey, model }) -> { text, usage: { input, output } }. */
export async function runStage({ stage, model, callModel, angle = 'direct', argv = process.argv.slice(2) }) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    console.error(`${err.message}\nTry --help.`);
    process.exit(1);
  }

  const outFile = join(REVIEW_DIR, `checks-${stage}.json`);

  if (opts.help) {
    console.log(`
  node scripts/${stage === 'anthropic' ? 'check-facts.mjs' : 'check-facts-openai.mjs'} [flags]

  Blind ${stage} check of every fact in data/facts. Writes ${`review/checks-${stage}.json`}.

    --apply            actually call the API and write results (default: dry run)
    --limit N          check at most N facts -- test a run cheaply
    --force            re-check facts that already have a result
    --concurrency N    requests in flight (default 5)
    --help
`);
    return;
  }

  /* The key is checked before anything else, including in a dry run: a
     preflight that does not notice a missing credential is not a preflight. */
  const apiKey = requireKey(model.keyEnv);

  const facts = loadFacts();
  const prior = readChecks(outFile);
  const done = new Set(opts.force ? [] : Object.keys(prior.results));
  const remaining = facts.filter((f) => !done.has(f.id));
  const skipped = facts.length - remaining.length;
  /* --limit applies to what is LEFT, not to the corpus, so repeated limited
     runs walk forward through the set instead of re-checking the same head. */
  const todo = opts.limit === null ? remaining : remaining.slice(0, opts.limit);

  console.log(`\nStage: ${stage} (${model.vendor})`);
  console.log(`Model: ${model.id}`);
  console.log(`Corpus: ${facts.length} facts in data/facts`);
  console.log(`Already checked: ${skipped}${opts.force ? ' (ignored, --force)' : ''}`);
  console.log(`To check this run: ${todo.length}${opts.limit !== null ? ` of ${remaining.length} remaining (--limit ${opts.limit})` : ''}`);

  /* ~350 input tokens and ~120 output tokens per fact, measured against the
     prompts above. Replaced by real usage once the run happens. */
  const guess = estimateCostUsd(model, todo.length * 350, todo.length * 120);
  console.log(`Rough cost if applied: ${fmtUsd(guess)}`);

  if (!opts.apply) {
    console.log(`\nDRY RUN -- no API calls made, ${outFile.replace(ROOT + '/', '')} not written.`);
    console.log(`Re-run with --apply to check for real.\n`);
    return;
  }
  if (!todo.length) {
    console.log(`\nNothing to do. Use --force to re-check.\n`);
    return;
  }

  const useAngle = opts.angle || angle;
  if (!ANGLES.includes(useAngle)) {
    console.error(`Unknown --angle "${useAngle}". Use one of: ${ANGLES.join(', ')}`);
    process.exit(2);
  }

  const doc = {
    stage,
    model: model.id,
    angle: useAngle,
    updated: new Date().toISOString(),
    results: opts.force ? {} : prior.results,
  };

  let inTok = 0, outTok = 0, failures = 0, finished = 0;
  const t0 = Date.now();

  await pool(todo, opts.concurrency, async (fact) => {
    const { system, user } = buildBlindPrompt(fact, useAngle);
    let record;
    try {
      const { text, usage } = await withRetry(() => callModel({ system, user, apiKey, model }));
      inTok += usage?.input ?? 0;
      outTok += usage?.output ?? 0;
      record = buildRecord(fact, extractJson(text), model.id, text);
    } catch (err) {
      failures++;
      record = {
        ...buildRecord(fact, null, model.id, null),
        verdict: 'unverifiable',
        note: `request failed: ${err.message}`,
      };
    }
    doc.results[fact.id] = record;
    doc.updated = new Date().toISOString();
    /* Written after every fact, not at the end: an interrupted run keeps
       everything it paid for, and the next run resumes where it stopped. */
    writeChecks(outFile, doc);
    finished++;
    if (finished % 10 === 0 || finished === todo.length) {
      process.stdout.write(`  ${finished}/${todo.length} checked\r`);
    }
  });

  const tally = { match: 0, mismatch: 0, unverifiable: 0 };
  for (const f of todo) tally[doc.results[f.id].verdict]++;

  console.log(`\n\nChecked ${todo.length} facts in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.log(`  match         ${tally.match}`);
  console.log(`  mismatch      ${tally.mismatch}`);
  console.log(`  unverifiable  ${tally.unverifiable}`);
  if (failures) console.log(`  (${failures} request failures, re-run to retry them with --force)`);
  console.log(`Tokens: ${inTok} in, ${outTok} out -- roughly ${fmtUsd(estimateCostUsd(model, inTok, outTok))}`);
  console.log(`Written: ${outFile.replace(ROOT + '/', '')}`);
  console.log(`\nThis is one opinion, not a verdict. Run the other stage, then adjudicate.mjs.\n`);
}

/* ---------------------------------------------------- Anthropic transport -- */

export async function callAnthropic({ system, user, apiKey, model }) {
  const res = await fetch(model.endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model.id,
      /* No `temperature`: it is rejected outright on this model family, and
         a run would 400 on its first paid call. Determinism comes from the
         narrow JSON contract instead. */
      max_tokens: 2000,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  }).catch((err) => {
    throw new RetryableError(`network: ${err.message}`);
  });

  if (res.status === 429 || res.status >= 500) {
    throw new RetryableError(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const body = await res.json();
  const text = (body.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  return {
    text,
    usage: { input: body.usage?.input_tokens ?? 0, output: body.usage?.output_tokens ?? 0 },
  };
}

/* Run the stage only when executed directly; importing gets the helpers. */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  /* Triangulation here, plain recall on the OpenAI stage. Two vendors AND
     two routes to the answer -- see the angles note above. */
  await runStage({ stage: 'anthropic', model: MODELS.anthropic, callModel: callAnthropic, angle: 'triangulate' });
}
