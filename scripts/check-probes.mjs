/* Generates every question the engine can make, many times over, and checks
   that no probe escapes the plausible range its fact declares.

   The engine has been wrong in ways that were only ever caught by eye -- a
   Saturn V at 544 feet, a percentage of 230, the Titanic wreck at 5,700 metres
   in 3,800 metres of water. Those all read fine as arithmetic; they were only
   wrong about the world. `range` on a number fact is where the world's limits
   are written down, and this is what enforces them.

   Read-only. No model is called. Exits 1 on any escape.

   Run: node scripts/check-probes.mjs
        node scripts/check-probes.mjs --runs 400
*/

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const FACTS_DIR = 'data/facts';
const GAME = 'src/game.js';

/* The engine is one browser IIFE with no exports, and adding a test hook to a
   file the page loads would put test scaffolding in front of every player. So
   take the pure half of it -- helpers through probeFor, which touches no DOM --
   and evaluate that. The markers are real lines in the file; if either moves,
   this fails loudly rather than silently testing nothing. */
export function loadEngine(source) {
  const from = source.indexOf('  function randInt(');
  const to = source.indexOf('  /* ---------- question builders ---------- */');
  if (from < 0 || to < 0 || to <= from) {
    throw new Error('cannot find the engine section in ' + GAME + ' -- markers moved');
  }
  const body = source.slice(from, to) +
    '\n  return { probeFor: probeFor, medianGap: medianGap, fameOf: fameOf };\n';
  return new Function('"use strict";' + body)();
}

function parseArgs(argv) {
  const o = { runs: 200 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--runs') o.runs = Number(argv[++i]);
    else if (argv[i].startsWith('--runs=')) o.runs = Number(argv[i].split('=')[1]);
  }
  return o;
}

const opts = parseArgs(process.argv.slice(2));
const engine = loadEngine(readFileSync(GAME, 'utf8'));

const problems = [];
let probes = 0, ranged = 0, unranged = 0;

for (const file of readdirSync(FACTS_DIR).filter((f) => f.endsWith('.json')).sort()) {
  const doc = JSON.parse(readFileSync(join(FACTS_DIR, file), 'utf8'));
  const pool = doc.facts.filter((f) => f.kind === 'year' || f.kind === 'number');

  for (const fact of doc.facts) {
    if (fact.kind !== 'number') continue;
    if (!fact.range) { unranged++; continue; }
    ranged++;
    const { min, max } = fact.range;
    const seen = new Set();

    for (const band of ['easy', 'medium', 'hard']) {
      for (let n = 0; n < opts.runs; n++) {
        const got = engine.probeFor(fact, band, pool, {});
        const p = got.value;
        probes++;
        if (p === fact.value) { problems.push(`${file} [${fact.id}] ${band}: probe equals the answer (${p})`); continue; }
        if (p < min || p > max) {
          const key = `${fact.id}|${band}|${p}`;
          if (!seen.has(key)) {
            seen.add(key);
            problems.push(`${file} [${fact.id}] ${band}: ${p} ${fact.unit || ''} is outside ${min}-${max} (answer ${fact.value})`);
          }
        }
      }
    }
  }
}

for (const p of problems.slice(0, 40)) console.log(`ESCAPE ${p}`);
if (problems.length > 40) console.log(`... and ${problems.length - 40} more`);

console.log(`\n${probes} probes over ${ranged} ranged facts, ${opts.runs} runs per band.`);
console.log(`${unranged} number facts have no range and were not checked -- validate-facts names them.`);
console.log(problems.length ? `FAILED: ${problems.length} escaped` : 'No probe escaped its range.');
process.exit(problems.length ? 1 : 0);
