/* Does the screener actually know what Todd thinks?

   The point of reviewing facts is to stop reviewing facts: once a model can
   predict the verdict, it screens candidates before a human ever sees them.
   This script measures whether that is true yet, on facts held back from the
   rubric so the answer cannot be memorised.

   ONE NUMBER MATTERS AND IT IS NOT ACCURACY. Todd rates most facts "good"
   and leaves most of those unexplained, so a screener answering "good" every
   time scores in the eighties and has learned nothing. Every figure is
   therefore reported against its majority-class baseline, and no headline
   number is one a constant answer can game.

   The headline is RECALL ON BAD QUESTIONS. His question-level marks are the
   only signal in this corpus where every single example carries a written
   reason, and they are what the screener has to reproduce: of the questions
   he would reject, how many does it catch? Accuracy is useless there -- only
   3.6% of questions carry a mark, so answering "ok" every time scores 96%
   and catches nothing at all.

   The first run of this test scored the other half, the half built on
   silence, and reported 33% -- chance. The rubric it produced had in fact
   reconstructed the question rules correctly; the test simply was not
   looking at them.

   Read docs/CHECKING.md for the sibling pipeline that checks accuracy. This
   one checks taste, and taste is the thing only a human can supply.

   Usage:
     node scripts/screen-test.mjs                     plan and cost, no calls
     node scripts/screen-test.mjs --apply             build rubric, run the test
     node scripts/screen-test.mjs --apply --holdout 20
     node scripts/screen-test.mjs --rubric-only --apply    just write the rubric
*/

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODELS, estimateCostUsd } from '../lib/aiModels.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RATINGS = resolve(ROOT, 'review/ratings.json');
const RUBRIC = resolve(ROOT, 'review/rubric.md');
const REPORT = resolve(ROOT, 'review/screen-test.json');

/* ------------------------------------------------------------------ args -- */

export function parseArgs(argv) {
  const o = { apply: false, holdout: 20, rubricOnly: false, seed: 7 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') o.apply = true;
    else if (a === '--dry-run') o.apply = false;
    else if (a === '--rubric-only') o.rubricOnly = true;
    else if (a === '--holdout') o.holdout = Number(argv[++i]);
    else if (a.startsWith('--holdout=')) o.holdout = Number(a.split('=')[1]);
    else if (a === '--seed') o.seed = Number(argv[++i]);
  }
  return o;
}

/* Deterministic shuffle: the same split every run, so a score change means the
   screener changed and not that the deck was cut differently. */
export function seeded(n) {
  let s = n >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/* --------------------------------------------------------------- metrics -- */

/** Share of the largest class. Answer only that and you score this much. */
export function majorityBaseline(labels) {
  const c = {};
  for (const l of labels) c[l] = (c[l] || 0) + 1;
  const n = labels.length;
  return n ? Math.max(...Object.values(c)) / n : 0;
}

/** Mean of per-class recall. Immune to always answering the common class. */
export function balancedAccuracy(pairs) {
  const byTrue = {};
  for (const [t, p] of pairs) {
    byTrue[t] = byTrue[t] || { n: 0, hit: 0 };
    byTrue[t].n++;
    if (t === p) byTrue[t].hit++;
  }
  const recalls = Object.entries(byTrue).map(([k, v]) => [k, v.hit / v.n]);
  const mean = recalls.reduce((a, [, r]) => a + r, 0) / (recalls.length || 1);
  return { mean, perClass: Object.fromEntries(recalls), support: Object.fromEntries(Object.entries(byTrue).map(([k, v]) => [k, v.n])) };
}

export function agreement(pairs) {
  if (!pairs.length) return 0;
  return pairs.filter(([t, p]) => t === p).length / pairs.length;
}

export function flagged(r) {
  return (r.questions || []).some((q) => q.verdict === 'bad');
}

/* Stratified on TWO axes: the fact verdict, and whether the reviewer marked
   any of the fact's generated questions bad.

   The second matters more. Only 3.6% of questions carry a mark, so a holdout
   drawn at random would contain almost none and measure nothing -- and the
   question marks are the reviewer's cleanest signal, every one annotated. */
export function split(rated, k, rnd) {
  const byClass = {};
  for (const r of rated) {
    const key = (flagged(r) ? 'flag/' : '') + (r.rating || 'none');
    (byClass[key] ||= []).push(r);
  }
  for (const list of Object.values(byClass)) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  }
  const classes = Object.keys(byClass);
  const holdout = [];
  /* Round-robin across classes so the rare ones are represented. */
  for (let round = 0; holdout.length < k; round++) {
    let took = 0;
    for (const c of classes) {
      const list = byClass[c];
      if (list.length > 1 && round < list.length - 1 && holdout.length < k) {
        holdout.push(list[round]);
        took++;
      }
    }
    if (!took) break;
  }
  const held = new Set(holdout.map((r) => r.id));
  return { train: rated.filter((r) => !held.has(r.id)), holdout };
}

/* --------------------------------------------------------------- prompts -- */

export function rubricPrompt(train) {
  const examples = train.map((r) => ({
    claim: r.claim,
    answer: r.stated_answer,
    category: r.category,
    questions_a_player_gets: r.questions ? r.questions.map((q) => q.text) : undefined,
    verdict_on_the_fact: r.rating,
    how_well_known: r.how_well_known,
    why: r.reason || undefined,
    questions_he_called_bad: r.questions ? r.questions.filter((q) => q.verdict === 'bad').map((q) => ({ text: q.text, why: q.why })) : undefined,
  }));
  return {
    system: 'You write rubrics. You are given one editor\'s verdicts on quiz facts and, where he bothered, his reasons. Produce instructions another model can follow to predict his verdict on a fact he has not seen.',
    user: [
      'Below are real verdicts from the editor of a history quiz. Two separate judgements per fact:',
      '  - verdict_on_the_fact: is this fact worth having in the corpus at all',
      '  - how_well_known: household / familiar / obscure, which sets how tight the generated question must be',
      '',
      'Write a rubric. Rules:',
      '  1. Weight his REASONS far above his ratings. A rating is one bit; a reason is the mechanism.',
      '  1b. The questions_he_called_bad entries are the strongest evidence in this file --',
      '      every one carries a written reason, where most ratings carry none. Build the',
      '      rules about question quality from those, and do not infer a mechanism for a',
      '      rating he did not explain. If most "good" verdicts have no reason attached,',
      '      say that you cannot tell why he approved them rather than inventing a test.',
      '  2. State how many examples support each rule. A rule seen once is a hypothesis, not a rule -- mark it so.',
      '  3. Be concrete enough to apply. "Prefer interesting facts" is useless; name the test.',
      '  4. Say explicitly what you CANNOT infer from this sample.',
      '  5. He is human and will have made mistakes. Where two similar facts got different verdicts, say so rather than inventing a distinction to explain it.',
      '',
      'Output markdown. No preamble.',
      '',
      JSON.stringify(examples, null, 1),
    ].join('\n'),
  };
}

export function predictPrompt(rubric, fact) {
  return {
    system: 'You are predicting one specific editor\'s verdict, not giving your own. Follow the rubric even where you disagree with it. Reply with a single JSON object, no prose, no fences.',
    user: [
      '=== RUBRIC ===',
      rubric,
      '',
      '=== FACT TO JUDGE ===',
      JSON.stringify({
        claim: fact.claim,
        answer: fact.stated_answer,
        category: fact.category,
        context: fact.context,
        go_deeper: fact.go_deeper,
        questions_a_player_gets: fact.questions ? fact.questions.map((q) => q.text) : [],
      }, null, 1),
      '',
      'Predict what this editor would say. `questions` lists the generated questions in',
      'order; return one verdict per question, in the same order. Most questions are fine --',
      'only about one in twenty-five draws a complaint, so do not flag one unless the rubric',
      'gives you a reason.',
      '{"rating": "good" | "fair" | "poor", "how_well_known": "household" | "familiar" | "obscure",',
      ' "questions": [{"verdict": "ok" | "bad", "why": "only when bad"}],',
      ' "confidence": "high" | "medium" | "low", "because": "one sentence citing the rubric rule you used"}',
    ].join('\n'),
  };
}

/* ------------------------------------------------------------- transport -- */

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

async function callAnthropic({ system, user, apiKey, model, maxTokens = 4000 }) {
  const res = await fetch(model.endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': model.apiVersion || '2023-06-01',
    },
    body: JSON.stringify({
      model: model.id,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    const err = new Error(`HTTP ${res.status}: ${t.slice(0, 300)}`);
    err.retryable = res.status === 429 || res.status >= 500;
    throw err;
  }
  const body = await res.json();
  const text = (body.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { text, usage: { input: body.usage?.input_tokens ?? 0, output: body.usage?.output_tokens ?? 0 } };
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

/* ------------------------------------------------------------------ main -- */

function loadRatings() {
  if (!existsSync(RATINGS)) {
    console.error(`No ratings at ${RATINGS}.`);
    console.error('Export "my taste profile" from the review desk and save it there.');
    process.exit(2);
  }
  const doc = JSON.parse(readFileSync(RATINGS, 'utf8'));
  const all = doc.examples || [];
  return all.filter((r) => r.rating || r.rating_of_the_fact || r.how_well_known)
    .map((r) => ({ ...r, rating: r.rating || r.rating_of_the_fact || null,
                   reason: r.reason || r.reason_about_the_fact || null }));
}

function report(rated, opts) {
  const q = rated.filter((r) => r.rating).map((r) => r.rating);
  const f = rated.filter((r) => r.how_well_known).map((r) => r.how_well_known);
  const badq = rated.reduce((n, r) => n + (r.questions || []).filter((x) => x.verdict === 'bad').length, 0);
  console.log(`\n  ${rated.length} rated facts, ${rated.filter((r) => r.reason).length} with a written reason, ${badq} questions marked bad individually.`);
  console.log(`  Holdout: ${Math.min(opts.holdout, rated.length - 1)} facts, stratified so rare verdicts appear.\n`);
  console.log(`  Fact rating   : ${q.length} labelled, majority-class baseline ${(majorityBaseline(q) * 100).toFixed(0)}%`);
  console.log(`  How well known: ${f.length} labelled, majority-class baseline ${(majorityBaseline(f) * 100).toFixed(0)}%`);
  if (majorityBaseline(q) > 0.85) {
    console.log('\n  NOTE: the fact rating is heavily one-sided. Raw agreement on it is');
    console.log('  close to meaningless -- balanced accuracy is the number to watch,');
    console.log('  and "how well known" currently carries more signal than the rating.');
  }
  return { q, f, badq };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const rated = loadRatings();
  const stats = report(rated, opts);

  const rnd = seeded(opts.seed);
  const { train, holdout } = split(rated, Math.min(opts.holdout, Math.max(1, rated.length - 5)), rnd);

  const model = MODELS.anthropic;
  const roughIn = train.length * 120 + holdout.length * 900;
  const roughOut = 1500 + holdout.length * 120;
  console.log(`\n  Train ${train.length} / hold out ${holdout.length}`);
  console.log(`  Model ${model.id}, rough cost $${estimateCostUsd(model, roughIn, roughOut).toFixed(2)}`);

  if (!opts.apply) {
    console.log('\n  Dry run. Nothing called, nothing written. Re-run with --apply.\n');
    return;
  }

  const apiKey = (process.env[model.keyEnv] || '').trim();
  if (!apiKey) {
    console.error(`\nMissing ${model.keyEnv}. There is no fallback by design.\n`);
    process.exit(2);
  }

  mkdirSync(resolve(ROOT, 'review'), { recursive: true });

  console.log('\n  Writing the rubric from the training half...');
  const rp = rubricPrompt(train);
  const { text: rubric } = await withRetry(() => callAnthropic({ ...rp, apiKey, model, maxTokens: 6000 }));
  writeFileSync(RUBRIC, rubric);
  console.log(`  -> ${RUBRIC}   READ THIS. If it has misunderstood you, correct the file`);
  console.log('     and re-run; the rubric is the thing that gets used, not the ratings.');

  if (opts.rubricOnly) return;

  console.log(`\n  Predicting ${holdout.length} held-out verdicts...`);
  const rows = [];
  for (const fact of holdout) {
    const pp = predictPrompt(rubric, fact);
    let pred = null;
    try {
      const { text } = await withRetry(() => callAnthropic({ ...pp, apiKey, model, maxTokens: 800 }));
      pred = extractJson(text);
    } catch (e) {
      console.log(`  ! ${fact.id}: ${e.message}`);
    }
    const actualQ = (fact.questions || []).map((q) => q.verdict);
    const predQ = (pred?.questions || []).map((q) => (q && q.verdict === 'bad' ? 'bad' : 'ok'));
    rows.push({
      id: fact.id, claim: fact.claim, category: fact.category,
      actual_rating: fact.rating, predicted_rating: pred?.rating ?? null,
      actual_fame: fact.how_well_known, predicted_fame: pred?.how_well_known ?? null,
      questions: (fact.questions || []).map((q, n) => ({
        text: q.text, actual: q.verdict, predicted: predQ[n] ?? null,
        his_why: q.why || null, its_why: pred?.questions?.[n]?.why || null,
      })),
      q_len_match: predQ.length === actualQ.length,
      confidence: pred?.confidence ?? null, because: pred?.because ?? null,
    });
    process.stdout.write('.');
  }
  console.log('\n');

  const qp = rows.filter((r) => r.actual_rating && r.predicted_rating).map((r) => [r.actual_rating, r.predicted_rating]);
  const fp = rows.filter((r) => r.actual_fame && r.predicted_fame).map((r) => [r.actual_fame, r.predicted_fame]);
  const qb = balancedAccuracy(qp), fb = balancedAccuracy(fp);

  const line = (name, pairs, bal, base) => {
    if (!pairs.length) { console.log(`  ${name}: no labelled pairs`); return; }
    const raw = agreement(pairs) * 100;
    console.log(`\n  ${name}`);
    console.log(`    raw agreement     ${raw.toFixed(0)}%   (baseline ${(base * 100).toFixed(0)}% -- always answer the common class)`);
    console.log(`    balanced accuracy ${(bal.mean * 100).toFixed(0)}%   <- the number that counts`);
    for (const [k, r] of Object.entries(bal.perClass)) {
      console.log(`      ${k.padEnd(10)} ${(r * 100).toFixed(0)}% of ${bal.support[k]}`);
    }
  };
  line('Fact rating', qp, qb, majorityBaseline(stats.q));
  line('How well known', fp, fb, majorityBaseline(stats.f));

  /* The question marks are the point. Accuracy is useless here -- 96% of
     questions carry no mark, so answering "ok" every time scores 96% and
     catches nothing. Recall is the operational number: of the questions he
     actually rejected, how many would the screener have caught? */
  const qq = [];
  let lenMismatch = 0;
  for (const r of rows) {
    if (!r.q_len_match) { lenMismatch++; continue; }
    for (const q of r.questions) if (q.predicted) qq.push([q.actual, q.predicted]);
  }
  const hisBad = qq.filter(([a]) => a === 'bad');
  const itsBad = qq.filter(([, p]) => p === 'bad');
  const caught = qq.filter(([a, p]) => a === 'bad' && p === 'bad');
  const qbal = balancedAccuracy(qq);

  console.log('\n  Bad questions -- the signal he actually gives');
  console.log(`    questions judged   ${qq.length}${lenMismatch ? `   (${lenMismatch} facts skipped: it returned the wrong number of verdicts)` : ''}`);
  console.log(`    he marked bad      ${hisBad.length}`);
  console.log(`    it marked bad      ${itsBad.length}`);
  console.log(`    RECALL             ${hisBad.length ? Math.round(caught.length / hisBad.length * 100) : 0}%   <- of the ones he rejected, how many it caught`);
  console.log(`    precision          ${itsBad.length ? Math.round(caught.length / itsBad.length * 100) : 0}%   <- of the ones it flagged, how many he agreed with`);
  console.log(`    balanced accuracy  ${Math.round(qbal.mean * 100)}%   (always answering "ok" scores 50% here and catches nothing)`);

  const missed = rows.flatMap((r) => (r.q_len_match ? r.questions : [])
    .filter((q) => q.actual === 'bad' && q.predicted === 'ok')
    .map((q) => ({ id: r.id, ...q })));
  if (missed.length) {
    console.log(`\n  Bad questions it let through (${missed.length}) -- what the rubric still cannot see:`);
    for (const m of missed.slice(0, 10)) {
      console.log(`    ${m.text.slice(-58)}`);
      console.log(`      you said: ${m.his_why || '(no reason)'}`);
    }
  }
  const cried = rows.flatMap((r) => (r.q_len_match ? r.questions : [])
    .filter((q) => q.actual === 'ok' && q.predicted === 'bad')
    .map((q) => ({ id: r.id, ...q })));
  if (cried.length) {
    console.log(`\n  Questions it flagged that you did not (${cried.length}) -- some may be ones you missed:`);
    for (const m of cried.slice(0, 6)) {
      console.log(`    ${m.text.slice(-58)}`);
      console.log(`      it said: ${(m.its_why || '').slice(0, 76)}`);
    }
  }

  const wrong = rows.filter((r) => r.actual_rating !== r.predicted_rating || r.actual_fame !== r.predicted_fame);
  if (wrong.length) {
    console.log(`\n  Where it disagreed with you (${wrong.length}) -- these are the ones worth reading:`);
    for (const w of wrong.slice(0, 12)) {
      console.log(`    ${w.claim.slice(0, 58)}`);
      console.log(`      you ${w.actual_rating}/${w.actual_fame}  it ${w.predicted_rating}/${w.predicted_fame}  -- ${(w.because || '').slice(0, 90)}`);
    }
  }

  writeFileSync(REPORT, JSON.stringify({
    generated: new Date().toISOString(), model: model.id, seed: opts.seed,
    trained_on: train.length, held_out: holdout.length,
    fact_rating: { raw: agreement(qp), balanced: qb.mean, baseline: majorityBaseline(stats.q), per_class: qb.perClass },
    how_well_known: { raw: agreement(fp), balanced: fb.mean, baseline: majorityBaseline(stats.f), per_class: fb.perClass },
    bad_questions: { judged: qq.length, he_marked: hisBad.length, it_marked: itsBad.length,
                     caught: caught.length, balanced: qbal.mean },
    rows,
  }, null, 2));

  /* Recall on the bad questions is the bar that matters. A screener that
     catches most of what he would reject earns its place even if it argues
     with him about which facts are merely fair. */
  const recall = hisBad.length ? caught.length / hisBad.length : 0;
  const done = recall >= 0.7 && qbal.mean >= 0.75;
  console.log(`\n  ${done ? 'PASSES' : 'not there yet'} -- the bar is 70% recall on bad questions.`);
  console.log(done
    ? '  Screening can take over; you move to spot-checking a sample.'
    : '  The fastest way to move this number is a written reason on every question you reject.');
  console.log(`\n  Full report: ${REPORT}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
