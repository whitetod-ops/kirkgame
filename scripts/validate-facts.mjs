/* Validates every fact file. Read-only: it never writes.
   Run: node scripts/validate-facts.mjs   (exit 1 on any error) */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const FACTS_DIR = 'data/facts';
const CLAIM_MAX = 120;          // one question per screen, no scrolling
const BODY_COUNT = /death|casualt|killed|fatalit/i;

const errors = [];
const warnings = [];
let total = 0, drafts = 0, sensitive = 0;

const index = JSON.parse(readFileSync('data/categories.json', 'utf8'));
const known = new Set(index.categories.map((c) => c.id));
const seenIds = new Set();

for (const file of readdirSync(FACTS_DIR).filter((f) => f.endsWith('.json')).sort()) {
  const path = join(FACTS_DIR, file);
  const doc = JSON.parse(readFileSync(path, 'utf8'));
  const where = (f, msg) => errors.push(`${file} [${f?.id ?? '?'}] ${msg}`);

  if (!known.has(doc.id)) warnings.push(`${file}: id "${doc.id}" is not listed in data/categories.json`);
  if (!Array.isArray(doc.facts) || !doc.facts.length) { errors.push(`${file}: no facts array`); continue; }

  for (const f of doc.facts) {
    total++;
    if (!f.id) where(f, 'missing id');
    if (seenIds.has(f.id)) where(f, 'duplicate id across the whole set');
    seenIds.add(f.id);

    if (!['year', 'number', 'boolean'].includes(f.kind)) where(f, `bad kind "${f.kind}"`);
    if (typeof f.claim !== 'string' || !f.claim.trim()) where(f, 'missing claim');
    else if (f.claim.length > CLAIM_MAX) where(f, `claim is ${f.claim.length} chars, over the ${CLAIM_MAX} limit`);

    if (f.kind === 'boolean') {
      if (typeof f.answer !== 'boolean') where(f, 'boolean fact needs answer: true or false');
      if ('value' in f) where(f, 'boolean fact must not carry a value');
    } else {
      if (typeof f.value !== 'number' || !Number.isFinite(f.value)) where(f, 'numeric fact needs a finite value');
      if (f.kind === 'number') {
        if (!f.unit) where(f, 'number fact needs a unit');
        if (f.value <= 0) where(f, 'number value must be positive');
      }
      if ('answer' in f) where(f, 'numeric fact must not carry an answer');
    }

    if (!f.context) where(f, 'missing context -- the reveal card would be empty');
    if (!f.source || !f.source.url || !f.source.title) where(f, 'missing source title or url');
    else if (!/^https:\/\//.test(f.source.url)) where(f, 'source url must be https');

    if (!['draft', 'reviewed'].includes(f.status)) where(f, `status must be draft or reviewed, got "${f.status}"`);
    if (f.status === 'draft') drafts++;

    /* Tone rule. A body count may never be used for the wager round or the
       closest-guess slider, which the engine enforces via this flag -- so the
       flag itself has to be right. */
    if (f.kind === 'number' && BODY_COUNT.test(f.unit || '') && !f.sensitive) {
      where(f, `unit "${f.unit}" is a body count and must be marked sensitive: true`);
    }
    if (f.sensitive) {
      sensitive++;
      if (f.kind !== 'number') warnings.push(`${file} [${f.id}]: sensitive on a non-numeric fact has no effect`);
    }
    /* Proper nouns that merely contain the word are not body counts. Without
       this the Black Death category warns on almost every entry, which trains
       everyone to ignore the warnings that matter. */
    const claimSansNames = f.claim.replace(/Black Death|Great Plague|Death Valley/gi, '');
    if (f.kind !== 'number' && BODY_COUNT.test(claimSansNames)) {
      warnings.push(`${file} [${f.id}]: claim mentions death -- check a human is happy with the framing`);
    }
  }
}

for (const w of warnings) console.log(`warn  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);

console.log(`\n${total} facts, ${drafts} awaiting review, ${sensitive} marked sensitive`);
console.log(errors.length ? `FAILED with ${errors.length} error(s)` : 'All checks passed.');
process.exit(errors.length ? 1 : 0);
