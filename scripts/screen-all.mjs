/* Run the screener over every question and collect what it suspects.

   The held-out test measures the screener against Todd's marks, and those
   marks are not exhaustive -- he flagged 27 questions out of 749, noticing
   as he went rather than auditing each one. So "he did not mark it" does not
   mean "it is fine", and precision measured that way punishes the screener
   for being more thorough than the human. On the last run it scored 27%
   precision while flagging a Saturn V rocket at 544 feet, Sacagawea aged 9,
   and a probe a century adrift -- every one of them a real fault.

   This inverts the loop. The screener reads every question and says which
   ones it would reject; Todd then rules on that shortlist instead of
   labelling the corpus. Forty decisions on the contested cases beat three
   hundred on cases nobody disputes, and it produces something the held-out
   test could never produce: COMPLETE labels on a defined set.

   It reads review/rubric.md -- so correcting that file changes what gets
   flagged. That is the intended way to steer this.

   Usage:
     node scripts/screen-all.mjs                  plan and cost, no calls
     node scripts/screen-all.mjs --apply          run it
     node scripts/screen-all.mjs --apply --limit 20
     node scripts/screen-all.mjs --apply --force  re-check facts already done
     node scripts/screen-all.mjs --apply --force --out review/flags2.json

   When review/adjudication.json is present the run scores itself against it at
   the end: of the flags landing on a question Todd has already ruled on, how
   many he agreed were bad, and how many of his bad calls this run found. That
   is the only way to tell whether a rubric edit helped -- the flag count alone
   goes down whenever the rubric gets shorter.
*/

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODELS, estimateCostUsd } from '../lib/aiModels.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RATINGS = resolve(ROOT, 'review/ratings.json');
const RUBRIC = resolve(ROOT, 'review/rubric.md');
const CALLS = resolve(ROOT, 'review/adjudication.json');

export function parseArgs(argv) {
  const o = { apply: false, limit: 0, force: false, concurrency: 4, out: 'review/flags.json' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') o.apply = true;
    else if (a === '--dry-run') o.apply = false;
    else if (a === '--force') o.force = true;
    else if (a === '--limit') o.limit = Number(argv[++i]);
    else if (a.startsWith('--limit=')) o.limit = Number(a.split('=')[1]);
    else if (a === '--concurrency') o.concurrency = Number(argv[++i]);
    else if (a === '--out') o.out = argv[++i];
    else if (a.startsWith('--out=')) o.out = a.split('=')[1];
  }
  return o;
}

/* The screener judges questions only. It is deliberately not told the fact
   verdict or the fame tag: those are the half it reads worst, and letting it
   reason from its own guess about them would poison the part it reads well. */
export function flagPrompt(rubric, fact) {
  return {
    system: 'You screen quiz questions against one editor\'s written standard. '
      + 'Judge only whether each question is a good question to ask. '
      + 'Reply with a single JSON object, no prose, no fences.',
    user: [
      '=== THE STANDARD ===',
      rubric,
      '',
      '=== THE FACT ===',
      `Claim:    ${fact.claim}`,
      `Answer:   ${fact.stated_answer}`,
      `Category: ${fact.category}`,
      '',
      '=== THE QUESTIONS GENERATED FROM IT ===',
      ...(fact.questions || []).map((q, n) => `[${n}] ${q.text}`),
      '',
      'Which of these would the editor reject, and why? Judge each on its own.',
      'Most questions are fine. Flag one only when the standard gives you a',
      'specific reason -- name the rule. Do not flag a question merely for',
      'being easy or for being about an unfamiliar subject.',
      '',
      '{"flags": [{"n": <index>, "why": "one sentence naming the rule"}]}',
      'Return an empty array if none of them is bad.',
    ].join('\n'),
  };
}

export function extractJson(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < body.length; i++) {
    if (body[i] === '{') depth++;
    else if (body[i] === '}' && --depth === 0) {
      try { return JSON.parse(body.slice(start, i + 1)); } catch { return null; }
    }
  }
  return null;
}

async function callAnthropic({ system, user, apiKey, model }) {
  let res;
  try {
    res = await fetch(model.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': model.apiVersion || '2023-06-01',
      },
      body: JSON.stringify({
        model: model.id,
        max_tokens: 1500,
        system,
        messages: [{ role: 'user', content: user }],
      }),
      signal: AbortSignal.timeout(120000),
    });
  } catch (e) {
    const err = new Error(`network: ${e.cause?.code || e.code || e.message}`);
    err.retryable = true;
    throw err;
  }
  if (!res.ok) {
    const t = await res.text();
    const err = new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
    err.retryable = res.status === 429 || res.status >= 500;
    throw err;
  }
  const body = await res.json();
  return {
    text: (body.content || []).filter((b) => b.type === 'text').map((b) => b.text).join(''),
    usage: { input: body.usage?.input_tokens ?? 0, output: body.usage?.output_tokens ?? 0 },
  };
}

async function withRetry(fn, tries = 4) {
  let wait = 1000;
  for (let i = 0; ; i++) {
    try { return await fn(); }
    catch (e) {
      if (i >= tries - 1 || !e.retryable) throw e;
      await new Promise((r) => setTimeout(r, wait));
      wait *= 2;
    }
  }
}

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

/* Scores a finished run against Todd's rulings. Only the flags he has actually
   ruled on can be scored -- an unruled flag is neither right nor wrong yet. */
export function score(flags, calls) {
  const ruled = new Map(calls.map((c) => [`${c.id}|${c.n}`, c.todd]));
  const judged = flags.filter((f) => ruled.has(`${f.id}|${f.n}`));
  const right = judged.filter((f) => ruled.get(`${f.id}|${f.n}`) === 'bad').length;
  const flagged = new Set(flags.map((f) => `${f.id}|${f.n}`));
  const hisBad = calls.filter((c) => c.todd === 'bad');
  const found = hisBad.filter((c) => flagged.has(`${c.id}|${c.n}`)).length;
  return { judged: judged.length, right, hisBad: hisBad.length, found };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const OUT = resolve(ROOT, opts.out);

  if (!existsSync(RATINGS)) { console.error(`No ${RATINGS}.`); process.exit(2); }
  if (!existsSync(RUBRIC)) {
    console.error(`No ${RUBRIC}.`);
    console.error('Run: node scripts/screen-test.mjs --apply --rubric-only');
    process.exit(2);
  }
  const rubric = readFileSync(RUBRIC, 'utf8');
  const facts = JSON.parse(readFileSync(RATINGS, 'utf8')).examples || [];

  const prior = (!opts.force && existsSync(OUT)) ? JSON.parse(readFileSync(OUT, 'utf8')) : { checked: {}, flags: [] };
  /* `in`, not truthiness: checked[id] is the flag COUNT, so a clean fact stores
     0 and a truthiness test re-screens it on every run. That was 176 of 272
     facts being paid for again each time. */
  let todo = facts.filter((f) => !(f.id in prior.checked));
  if (opts.limit) todo = todo.slice(0, opts.limit);

  const model = MODELS.anthropic;
  const questions = facts.reduce((n, f) => n + (f.questions || []).length, 0);
  const perCall = Math.round(rubric.length / 4) + 400;
  console.log(`\n  ${facts.length} facts, ${questions} questions.`);
  console.log(`  Already screened: ${Object.keys(prior.checked).length}. To do: ${todo.length}.`);
  console.log(`  Rubric is ${Math.round(rubric.length / 1024)}KB, so it dominates the cost.`);
  console.log(`  Model ${model.id}, rough cost $${estimateCostUsd(model, todo.length * perCall, todo.length * 150).toFixed(2)}`);

  if (!opts.apply) {
    console.log('\n  Dry run. Nothing called, nothing written. Re-run with --apply.\n');
    return;
  }
  const apiKey = (process.env[model.keyEnv] || '').trim();
  if (!apiKey) { console.error(`\nMissing ${model.keyEnv}.\n`); process.exit(2); }

  mkdirSync(resolve(ROOT, 'review'), { recursive: true });
  const doc = { generated: new Date().toISOString(), model: model.id, checked: prior.checked, flags: prior.flags };
  let inTok = 0, outTok = 0, failed = 0, done = 0;

  await pool(todo, opts.concurrency, async (fact) => {
    try {
      const { text, usage } = await withRetry(() => callAnthropic({ ...flagPrompt(rubric, fact), apiKey, model }));
      inTok += usage.input; outTok += usage.output;
      const parsed = extractJson(text);
      const flags = Array.isArray(parsed?.flags) ? parsed.flags : [];
      for (const f of flags) {
        const q = (fact.questions || [])[f.n];
        if (!q) continue;
        doc.flags.push({
          id: fact.id, n: f.n, category: fact.category,
          claim: fact.claim, answer: fact.stated_answer,
          question: q.text, machine_why: String(f.why || '').slice(0, 300),
          /* Carried through so the desk can show where the two already agree,
             and so agreement can be measured without a second pass. */
          he_already_marked_it: q.verdict === 'bad', his_why: q.why || null,
        });
      }
      doc.checked[fact.id] = flags.length;
    } catch (e) {
      failed++;
      console.log(`\n  ! ${fact.id}: ${e.message}`);
    }
    done++;
    doc.generated = new Date().toISOString();
    writeFileSync(OUT, JSON.stringify(doc, null, 1));
    if (done % 10 === 0) process.stdout.write(`${done} `);
    else process.stdout.write('.');
  });

  const already = doc.flags.filter((f) => f.he_already_marked_it).length;
  const fresh = doc.flags.length - already;
  const hisTotal = facts.reduce((n, f) => n + (f.questions || []).filter((q) => q.verdict === 'bad').length, 0);
  console.log(`\n\n  Screened ${done} facts${failed ? `, ${failed} failed` : ''}.`);
  console.log(`  Flagged ${doc.flags.length} questions:`);
  console.log(`    ${already} you had already marked  (of your ${hisTotal} -- so it found ${Math.round(already / hisTotal * 100)}% of them)`);
  console.log(`    ${fresh} you had not`);
  console.log(`\n  Cost about $${estimateCostUsd(model, inTok, outTok).toFixed(2)}.`);
  console.log(`  Written to ${OUT}`);

  if (existsSync(CALLS)) {
    const calls = JSON.parse(readFileSync(CALLS, 'utf8')).calls || [];
    const s = score(doc.flags, calls);
    console.log(`\n  Scored against your ${calls.length} rulings:`);
    if (s.judged) {
      console.log(`    ${s.right} of ${s.judged} flags you have ruled on are ones you called bad  (${Math.round(s.right / s.judged * 100)}% precision)`);
      console.log(`    ${s.found} of your ${s.hisBad} bad calls were flagged                       (${Math.round(s.found / s.hisBad * 100)}% recall)`);
      console.log('    The last rubric scored 39% precision.');
    } else {
      console.log('    None of the flags land on a question you have ruled on.');
    }
  }

  console.log('\n  Commit and push it, and the adjudication desk gets rebuilt from it:');
  console.log(`    git add ${opts.out} && git commit -m "Machine flags" && git push\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
