/* Inlines the fact data, styles and engine into dist/, which is both the
   deployable site and a set of files you can open straight off disk:
     dist/index.html       the game, standalone and offline-capable
     dist/artifact.html    page content only, for publishing as an artifact
     dist/design-map.html  the design map, served alongside the game
   No dependencies. Run: node scripts/build.mjs */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const index = JSON.parse(readFileSync('data/categories.json', 'utf8'));
const facts = {};
for (const file of readdirSync('data/facts').filter((f) => f.endsWith('.json'))) {
  const doc = JSON.parse(readFileSync(join('data/facts', file), 'utf8'));
  facts[doc.id] = doc.facts;
}

/* Ship only the categories the index lists, in the index's order. */
const categories = index.categories.filter((c) => facts[c.id]);
const payload = { categories, facts: Object.fromEntries(categories.map((c) => [c.id, facts[c.id]])) };

const css = readFileSync('src/styles.css', 'utf8');
const markup = readFileSync('src/markup.html', 'utf8');
const js = readFileSync('src/game.js', 'utf8');

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?' +
  'family=Instrument+Serif:ital@0;1&family=Archivo:wght@400;500;600&' +
  'family=IBM+Plex+Mono:wght@400;500&display=swap">';

const data = `<script>window.GOT_DATA=${JSON.stringify(payload)};</script>`;
const body = `${markup}\n${data}\n<script>\n${js}\n</script>`;

mkdirSync('dist', { recursive: true });

writeFileSync('dist/index.html',
`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#0E1116">
<title>Give or Take</title>
${FONTS}
<style>
${css}
</style>
</head>
<body>
${body}
</body>
</html>
`);

writeFileSync('dist/artifact.html',
`<title>Give or Take</title>
${FONTS}
<style>
${css}
</style>
${body}
`);

/* Served next to the game so one Pages site carries both. */
copyFileSync('docs/design-map.html', 'dist/design-map.html');
writeFileSync('dist/.nojekyll', '');

/* Also written to the repository root and committed, so GitHub Pages works on
   either source setting: "GitHub Actions" deploys dist/, while "Deploy from a
   branch -> main -> / (root)" serves this file directly with no workflow at
   all. Generated -- edit src/, then rebuild. */
copyFileSync('dist/index.html', 'index.html');
writeFileSync('.nojekyll', '');

const n = Object.values(payload.facts).reduce((a, f) => a + f.length, 0);
console.log(`built ${categories.length} categories, ${n} facts`);
for (const f of ['dist/index.html', 'dist/artifact.html', 'dist/design-map.html', 'index.html']) {
  console.log(`  ${f}  ${(readFileSync(f).length / 1024).toFixed(1)} KB`);
}
