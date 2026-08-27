/* Flattens every fact to CSV so the whole set can be handed to a second engine,
   or a person, for verification. Read-only.
   Run: node scripts/export-for-review.mjs > review.csv */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
/* Everything a player can see needs checking, not just the answer: the context
   and go-deeper lines carry factual claims of their own, and they are the
   colourful ones, which makes them the likeliest to be wrong. */
const rows = [['fact_id', 'category', 'kind', 'claim', 'true_answer', 'unit', 'approx',
               'context', 'go_deeper', 'sensitive', 'source_url',
               'verdict', 'corrected_value', 'notes']];

for (const file of readdirSync('data/facts').filter((f) => f.endsWith('.json')).sort()) {
  const doc = JSON.parse(readFileSync(join('data/facts', file), 'utf8'));
  for (const f of doc.facts) {
    const answer = f.kind === 'boolean' ? (f.answer ? 'TRUE' : 'FALSE') : f.value;
    rows.push([f.id, doc.id, f.kind, f.claim, answer, f.unit ?? '',
               f.approx ? 'approx' : 'exact', f.context ?? '', f.goDeeper ?? '',
               f.sensitive ? 'yes' : '', f.source.url, '', '', '']);
  }
}

process.stdout.write(rows.map((r) => r.map(q).join(',')).join('\n') + '\n');
