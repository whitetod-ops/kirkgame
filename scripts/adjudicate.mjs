/* Stage 4: adjudication. Merges the stored value with the two blind verdicts
   and splits the corpus into the pile that passes through and the pile a human
   actually looks at.

   Run:  node scripts/adjudicate.mjs            # summary only, writes nothing
         node scripts/adjudicate.mjs --apply    # writes review/agreed.json and review/disputed.json

   THE RULE
   --------
   A fact is AGREED only if the stored value, the Anthropic answer and the
   OpenAI answer all agree -- that is, both stages returned "match". Everything
   else is DISPUTED. A fact missing either check is PENDING and goes into
   neither file: unchecked is not the same as agreed, and the pass-through pile
   must never contain something nobody checked.

   The asymmetry is deliberate. Todd does not check facts for accuracy; he only
   judges whether a question is interesting. So the cost of a false "agreed" is
   a wrong fact shown to a player as true, and the cost of a false "disputed"
   is thirty seconds of his time. Every tie is broken towards disputed.

   Reads only. Never writes to data/, never changes a fact's status. */

import { join } from 'node:path';
import {
  loadFacts, storedAnswer, readChecks, writeChecks, compareValues,
  toleranceFor, REVIEW_DIR,
} from './check-facts.mjs';

const RULE = 'agreed = stored value AND anthropic AND openai all match; anything else is disputed; a fact missing either check is pending and goes in neither file';

function parse(argv) {
  const opts = { apply: false, help: false };
  for (const a of argv) {
    if (a === '--apply') opts.apply = true;
    else if (a === '--dry-run') opts.apply = false;
    else if (a === '--help' || a === '-h') opts.help = true;
    else { console.error(`unknown flag: ${a}\nTry --help.`); process.exit(1); }
  }
  return opts;
}

const opts = parse(process.argv.slice(2));
if (opts.help) {
  console.log(`
  node scripts/adjudicate.mjs [--apply]

  Merges review/checks-anthropic.json and review/checks-openai.json against the
  stored facts and prints the summary. --apply also writes review/agreed.json
  and review/disputed.json. Never touches data/.
`);
  process.exit(0);
}

const facts = loadFacts();
const anthropic = readChecks(join(REVIEW_DIR, 'checks-anthropic.json'));
const openai = readChecks(join(REVIEW_DIR, 'checks-openai.json'));

if (!Object.keys(anthropic.results).length && !Object.keys(openai.results).length) {
  console.error('\nNo check results found in review/.');
  console.error('Run:  node scripts/check-facts.mjs --apply');
  console.error('then: node scripts/check-facts-openai.mjs --apply\n');
  process.exit(1);
}

/** Do the two checkers agree with each other, independently of the corpus?
    When they do and both disagree with the corpus, that is the strongest
    signal this pipeline can produce that the stored value is wrong. */
function checkersAgree(fact, a, o) {
  if (a.model_value === null || o.model_value === null) return false;
  if (fact.kind === 'boolean') return a.model_value === o.model_value;
  if (typeof a.model_value !== 'number' || typeof o.model_value !== 'number') return false;
  return Math.abs(a.model_value - o.model_value) <= toleranceFor(fact);
}

const short = (r) => r && ({
  value: r.model_value,
  verdict: r.verdict,
  confidence: r.confidence,
  source_url: r.source_url,
  note: r.note,
  model: r.model,
});

const agreed = [], disputed = [], pending = [];
const reasons = {};
const byCategory = new Map();

for (const fact of facts) {
  const a = anthropic.results[fact.id];
  const o = openai.results[fact.id];
  const cat = byCategory.get(fact.category) ?? { total: 0, agreed: 0, disputed: 0, pending: 0 };
  cat.total++;
  byCategory.set(fact.category, cat);

  const base = {
    id: fact.id,
    category: fact.category,
    kind: fact.kind,
    claim: fact.claim,
    stored_value: storedAnswer(fact),
    unit: fact.unit ?? null,
    approx: !!fact.approx,
    source_url: fact.source?.url ?? '',
    anthropic: short(a) ?? null,
    openai: short(o) ?? null,
  };

  if (!a || !o) {
    pending.push({ ...base, reason: !a && !o ? 'unchecked' : `awaiting-${!a ? 'anthropic' : 'openai'}` });
    cat.pending++;
    continue;
  }

  if (a.verdict === 'match' && o.verdict === 'match') {
    const flags = [];
    /* Not blocking -- two independent models landing on the same value is the
       evidence, and a citation is corroboration. But an agreed fact that
       neither checker could cite is worth knowing about. */
    if (!a.source_url && !o.source_url) flags.push('no-citation-from-either-checker');
    if (a.confidence === 'low' && o.confidence === 'low') flags.push('both-checkers-low-confidence');
    agreed.push({ ...base, reason: 'all-three-agree', flags });
    cat.agreed++;
    continue;
  }

  let reason, proposed = null;
  if (a.verdict === 'mismatch' && o.verdict === 'mismatch') {
    if (checkersAgree(fact, a, o)) {
      reason = 'both-checkers-agree-against-stored';
      proposed = a.model_value;              // strongest correction candidate
    } else {
      reason = 'both-checkers-mismatch-and-differ';
    }
  } else if (a.verdict === 'mismatch') {
    reason = `mismatch-anthropic-${o.verdict === 'match' ? 'openai-matched' : 'openai-unverifiable'}`;
  } else if (o.verdict === 'mismatch') {
    reason = `mismatch-openai-${a.verdict === 'match' ? 'anthropic-matched' : 'anthropic-unverifiable'}`;
  } else {
    reason = a.verdict === 'unverifiable' && o.verdict === 'unverifiable'
      ? 'unverifiable-both'
      : `unverifiable-${a.verdict === 'unverifiable' ? 'anthropic' : 'openai'}`;
  }

  reasons[reason] = (reasons[reason] ?? 0) + 1;
  disputed.push({ ...base, reason, ...(proposed !== null ? { proposed_value: proposed } : {}) });
  cat.disputed++;
}

/* Worst first: a fact both checkers say is wrong is the one to open with. */
const PRIORITY = [
  'both-checkers-agree-against-stored',
  'both-checkers-mismatch-and-differ',
  'mismatch-anthropic-openai-matched',
  'mismatch-openai-anthropic-matched',
  'mismatch-anthropic-openai-unverifiable',
  'mismatch-openai-anthropic-unverifiable',
  'unverifiable-both',
  'unverifiable-anthropic',
  'unverifiable-openai',
];
const rank = (r) => { const i = PRIORITY.indexOf(r.reason); return i === -1 ? PRIORITY.length : i; };
disputed.sort((x, y) => rank(x) - rank(y) || x.id.localeCompare(y.id));

/* ------------------------------------------------------------- reporting -- */

const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

console.log(`\nADJUDICATION`);
console.log(`Rule: ${RULE}`);
console.log(`Checks: anthropic ${anthropic.model ?? '-'} (${Object.keys(anthropic.results).length} facts), openai ${openai.model ?? '-'} (${Object.keys(openai.results).length} facts)\n`);

const w = Math.max(10, ...[...byCategory.keys()].map((k) => k.length));
console.log(`${pad('category', w)}  ${padL('facts', 6)}${padL('agreed', 8)}${padL('disputed', 10)}${padL('pending', 9)}`);
console.log('-'.repeat(w + 35));
for (const [id, c] of [...byCategory].sort()) {
  console.log(`${pad(id, w)}  ${padL(c.total, 6)}${padL(c.agreed, 8)}${padL(c.disputed, 10)}${padL(c.pending, 9)}`);
}
console.log('-'.repeat(w + 35));
console.log(`${pad('TOTAL', w)}  ${padL(facts.length, 6)}${padL(agreed.length, 8)}${padL(disputed.length, 10)}${padL(pending.length, 9)}`);

const checked = agreed.length + disputed.length;
if (checked) {
  console.log(`\n${((agreed.length / checked) * 100).toFixed(1)}% of fully checked facts passed all three ways.`);
}

if (disputed.length) {
  console.log(`\nWhy the ${disputed.length} disputed facts are disputed:`);
  for (const r of PRIORITY) if (reasons[r]) console.log(`  ${padL(reasons[r], 5)}  ${r}`);
  for (const [r, n] of Object.entries(reasons)) if (!PRIORITY.includes(r)) console.log(`  ${padL(n, 5)}  ${r}`);

  console.log(`\nFirst ${Math.min(10, disputed.length)}, worst first:`);
  for (const d of disputed.slice(0, 10)) {
    console.log(`  ${d.id}  stored=${d.stored_value}  anthropic=${d.anthropic.value}  openai=${d.openai.value}  [${d.reason}]`);
  }
}

const noCite = agreed.filter((a) => a.flags.includes('no-citation-from-either-checker')).length;
if (noCite) console.log(`\nNote: ${noCite} agreed facts carry no citation from either checker. Flagged, not blocked.`);
if (pending.length) console.log(`\n${pending.length} facts are not fully checked and are in neither queue. Finish both stages first.`);

/* ---------------------------------------------------------------- output -- */

if (!opts.apply) {
  console.log(`\nDRY RUN -- review/agreed.json and review/disputed.json not written.`);
  console.log(`Re-run with --apply to write them.\n`);
  process.exit(0);
}

const meta = {
  generated: new Date().toISOString(),
  rule: RULE,
  models: { anthropic: anthropic.model, openai: openai.model },
};
writeChecks(join(REVIEW_DIR, 'agreed.json'), { ...meta, queue: 'agreed', count: agreed.length, facts: agreed });
writeChecks(join(REVIEW_DIR, 'disputed.json'), { ...meta, queue: 'disputed', count: disputed.length, facts: disputed });

console.log(`\nWritten: review/agreed.json (${agreed.length}), review/disputed.json (${disputed.length})`);
console.log(`Nothing in data/ was touched. No fact's status changed -- promotion is still a human act.\n`);
