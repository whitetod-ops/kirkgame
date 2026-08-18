# Give or Take

A Kirk Ogren game.

An over/under history quiz. The player picks a historical period they already care
about and answers ten easy questions about it. Every answer opens onto the real
fact, the story behind it, and a link out — the game is a doorway into reading.

The name is the American idiom for an approximate figure: "1865, give or take."
It names the mechanic, and it tells a player who thinks they are bad at history
that roughly right is good enough here.

**Status: playable prototype.** Fourteen categories, 280 facts, two modes.
`node scripts/build.mjs` then open `dist/index.html` in a browser.

## Two ways to play

**On your own.** One period, ten questions, roughly three minutes. No stakes, no
network, no accounts. Everything is inlined into a single HTML file, and a
service worker keeps it playable with no signal once it has been opened once —
Add to Home Screen and it works on a plane.

**Together.** Two to six people, one phone, passed around. Each player chooses
one period; within that block everyone answers one question each. The starting
player shifts every block so nobody always goes first.

| Players | Blocks | Questions per block | Total |
| --- | --- | --- | --- |
| 2 | 2 | 4 | 8 |
| 3 | 3 | 4 | 12 |
| 4 | 4 | 4 | 16 |
| 5 | 4 | 5 | 20 |
| 6 | 4 | 6 | 24 |

Blocks are capped at four so a big table still finishes, and a block is never
shorter than four questions so a small one is not over in a minute.

### Stakes, and why they cannot wipe you out

Before answering, a player commits **25, 50, 75 or 100 percent of the
question** — not of their score. Right, they take what they committed. Wrong,
they take nothing. Betting a share of your *score* compounds: bet everything
once, lose, and every later bet is a percentage of zero. You are mathematically
dead with most of the game still to play, and Jeopardy's runaway condition
(a leader on more than double second place cannot be caught) arrives early and
often. Sharing out the question instead keeps the same four-button decision
with none of that.

**The last question of the last block is the exception**, and there the stake is
a share of your score — doubled or lost. That is Final Jeopardy, and it works
for one reason: nothing comes after it, so nobody has to sit at zero.

There is no speed bonus and there never will be. Kahoot's is its most criticised
feature: four seconds of hesitation can cost hundreds of points, which punishes
slower readers and anyone anxious. Sitting a nine-year-old next to a
seventy-five-year-old rules it out.

The full design map — mechanics, scoring, round structure, the fairness problem,
sudden death, the 100-category plan and the build order — is in
[`docs/design-map.html`](docs/design-map.html). Open it in a browser.

## The one idea worth understanding

Category files store **facts, not questions**:

```json
{
  "id": "cw-lincoln-assassination",
  "kind": "year",
  "claim": "Abraham Lincoln was assassinated",
  "value": 1865,
  "context": "John Wilkes Booth shot Lincoln at Ford's Theatre on April 14, 1865.",
  "goDeeper": "Booth's original plan was to kidnap Lincoln, not kill him.",
  "source": { "title": "...", "url": "https://..." },
  "status": "draft"
}
```

The engine derives questions at run time. That single fact yields:

- over/under at three difficulty bands (`before or after 1870?` / `1867?`)
- a true/false (`assassinated in 1865 — true or false?`)
- a which-came-first pairing against any other year fact in the category

One authored line, four-plus questions, three difficulties. At 100 categories
that is the difference between a feasible project and an impossible one.

### Fact kinds

| `kind` | Required fields | Generates |
| --- | --- | --- |
| `year` | `value` (negative for BC) | over/under, true/false, came-first |
| `number` | `value`, `unit`, optional `prefix`, `approx` | over/under, true/false |
| `boolean` | `answer` | true/false |

## Rules summary

- **A round is 10 questions** from one category, roughly three minutes, with a
  break after five that asks whether you want five more. Whether people say yes
  is the most informative number this prototype produces; it is counted locally.
- **Bands ramp:** Q1–3 easy (shown number 8–30 years off the truth), Q4–7 medium
  (3–7), Q8–9 hard (1–2), Q10 hardest.
- **Points:** over/under and true/false 100, came-first 120. Band multiplier
  ×1.0 / ×1.5 / ×2.0. Streak bonus +25 per
  consecutive correct past two, capped +100. Clean round ≈ 2,000.
- **No wagering, and points are never deducted.** There is no stake, no bet and
  no way to lose what you have scored. A wrong answer earns zero and resets the
  streak multiplier — it never takes anything back. That single rule, not the
  vocabulary, is what separates this from a betting game.
- **Points bank across rounds** and are spent on help, never on answers. The one
  spend is *Give me more room*: before you commit, push the shown number further
  from the truth. The question gets easier and is worth correspondingly less.
  A second-chance retry is deliberately absent — on a two-answer question it
  would simply hand over the answer.
- **Three formats, all binary.** Over/under, true/false, and which-came-first.
- **Relaxed pacing by default.** The timer is opt-in, and forced on only in
  sudden death.
- **Two currencies.** Score is what you knew and is competitive. Curiosity is
  what you went and looked up, is earned from the Research List, and can never
  win you a match.

## Where the facts live

One JSON file per category in this repository, through the first couple of
thousand facts. Pull request review *is* the review queue, git history is the
audit trail, and it costs nothing to run — 2,000 facts is about 1.5 MB.

A build step splits that into a small index (`categories.json` — titles, blurbs,
counts, ~15 KB, loaded up front) plus per-category chunks fetched on demand
(~15 KB each). Fast on cellular, and it is what makes offline play possible.

A database arrives at phase 4 with the Daily Challenge, not before — that is the
first point needing something git genuinely cannot do: per-player history so
nobody meets the same question twice, flagged-question reports, the shared daily
round, leaderboards.

**Git stays the source of truth for the fact text even then**, with the database
as a serving layer synced from it. Same shape as the recipe pipeline. A date
correction still goes through review instead of a midnight edit to production.

One consequence to build for now rather than discover later: in solo play the
answers ship to the browser, which is fine. The moment there is a leaderboard,
client-side answers are trivially cheatable, so **the daily round must be scored
server-side.**

## Platform

Mobile-first at 390×844, not a desktop page that shrinks. Shipped as an
installable web app (Add to Home Screen) rather than an App Store listing: no
review process, no 30% cut, same-day releases. A service worker caches the
category files so a round works on a plane.

- Answer buttons at the **bottom**, 56–64pt tall. Read at the top, tap at the
  bottom. Apple's 44pt minimum is a floor; this audience skews older.
- **8pt minimum between the two buttons.** A fat-finger misfire on a 50/50
  question is the most infuriating failure this game can produce.
- **One question per screen, never scrolling.** This constrains the data, not
  just the CSS: `claim` gets a maximum length so no fact can break the layout.
- 19px base, 24–28px questions, **text zoom left enabled**.
- Only the reveal card scrolls. iPad and landscape get a centred column, not a
  second layout.

Three iOS traps, named now rather than debugged later:

- Use `100dvh`, **never `100vh`** — on iOS Safari `100vh` is wrong by the height
  of the URL bar, which is the classic clipped-bottom bug.
- `viewport-fit=cover` plus `env(safe-area-inset-bottom)` padding, or the answer
  buttons sit under the home indicator and get swiped instead of tapped.
- **iOS Safari has no Vibration API.** Feedback is visual, with optional sound.
  Do not design around a buzz that will never fire.

Push notifications, if the Daily Challenge ever wants them, work on iOS 16.4+ —
but only for a PWA the player has actually installed.

## Content rules (non-negotiable, same spirit as the recipe pipeline)

- Every fact ships `status: "draft"`. Only human review promotes it. Nothing
  auto-publishes.
- Every fact carries a source title and URL, surfaced on the reveal card.
- Contested numbers set `approx: true` and say so in `context`.
- Facts live in git as one JSON file per category. Pull request review *is* the
  review queue until volume outgrows it.

## Layout

```
data/categories.json        which categories ship, and in what order
data/facts/*.json           one file per category -- the source of truth
src/markup.html             every screen
src/pwa/                    manifest, service worker and generated icons
src/styles.css              committed dark theme, mobile-first
src/game.js                 question engine. No model is called anywhere.
scripts/validate-facts.mjs  schema, claim length and the tone rule
scripts/build.mjs           inlines everything into dist/
scripts/export-for-review.mjs  flattens every fact to CSV for verification
docs/design-map.html        the full design map
dist/index.html             the game, standalone and offline-capable
dist/artifact.html          page content only, for publishing as an artifact
dist/design-map.html        the design map, served next to the game
sw.js, manifest.webmanifest, icon-*.png   generated; committed for Pages
.github/workflows/pages.yml validates, builds and deploys on push to main
```

`american-revolution.json` is written but deliberately absent from
`data/categories.json`, so it does not ship yet. The validator warns about it;
that warning is expected.

All 80 facts are **unreviewed drafts**. Every one carries a source URL. They
have not been checked by a human and must not be treated as verified.

### Commands

```
node scripts/validate-facts.mjs          # exits 1 on any error
node scripts/build.mjs                   # writes dist/
node scripts/export-for-review.mjs > review.csv
```

## The live site

**https://whitetod-ops.github.io/kirkgame/** -- public, no sign-in.
The design map is at `/docs/design-map.html`.

Pages serves the committed `index.html` at the repository root
(Settings -> Pages -> Deploy from a branch -> `main` -> `/ (root)`). No deploy
workflow is involved: pushing to `main` publishes.

`index.html` and `.nojekyll` at the root are **generated** by
`scripts/build.mjs` and committed. Edit `src/`, rebuild, commit -- never
hand-edit them. `.github/workflows/checks.yml` fails the push if you forget,
and validates every fact before that.

A Pages site is readable by anyone with the URL.

## How a round is assembled

Ten slots, fixed shape, alternating so no two adjacent questions share a format:
over/under, true/false, over/under, true/false, over/under, true/false,
which-came-first, over/under, true/false, over/under. Bands ramp easy -> medium
-> hard across them. No fact is used twice in a round. "Gentler questions"
softens every band one notch.

Every question is binary. There is no continuous-estimate format: a slider was
built and removed, both because it did not feel good and because it broke the
rule that this game only ever asks a two-answer question.

The tone rule: a body count is never one of the three questions that open a
round. `scripts/validate-facts.mjs` fails the build if a fact whose unit is a
body count is not marked `sensitive: true`. Streak bonuses are still awarded on
a sensitive fact but never celebrated in the reveal.

## Open questions

1. Tone policy for hard periods. The category map includes the Holocaust,
   slavery and the Plains Wars, and the audience is "all ages" — over/under
   wagering on atrocity death tolls would be indefensible. Those categories need
   an editorial rule before their files get written.
2. Sourcing standard — wave one cites Wikipedia; review should upgrade
   load-bearing facts to NPS, Library of Congress, NASA and academic sources.
3. Who reviews 2,000 facts. This is the real bottleneck, and no amount of engine
   work makes it go away.
4. Licence, and whether the repo goes public. The code and the fact data are
   separable questions — 2,000 reviewed, sourced facts have value independent of
   the game.
