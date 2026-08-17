# Give or Take

A Kirk Ogren game.

An over/under history quiz. The player picks a historical period they already care
about and answers ten easy questions about it. Every answer opens onto the real
fact, the story behind it, and a link out — the game is a doorway into reading.

The name is the American idiom for an approximate figure: "1865, give or take."
It names the mechanic, and it tells a player who thinks they are bad at history
that roughly right is good enough here.

**Status: playable prototype.** Three categories, 60 facts, solo play.
`node scripts/build.mjs` then open `dist/give-or-take.html` in a browser.

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
- a closest-guess slider

One authored line, five-plus questions, three difficulties. At 100 categories
that is the difference between a feasible project and an impossible one.

### Fact kinds

| `kind` | Required fields | Generates |
| --- | --- | --- |
| `year` | `value` (negative for BC) | over/under, true/false, came-first, closest |
| `number` | `value`, `unit`, optional `prefix`, `approx` | over/under, true/false, closest |
| `boolean` | `answer` | true/false |

## Rules summary

- **A round is 10 questions** from one category, roughly three minutes.
- **Bands ramp:** Q1–3 easy (shown number 8–30 years off the truth), Q4–7 medium
  (3–7), Q8–9 hard (1–2), Q10 wager.
- **Points:** over/under and true/false 100, came-first 120, closest 0–150 graded
  by distance. Band multiplier ×1.0 / ×1.5 / ×2.0. Streak bonus +25 per
  consecutive correct past two, capped +100. Clean round ≈ 2,000.
- **Wrong answers cost nothing.** Only the wager can lose points, capped at 50%
  of the round score. Penalties teach people to answer only when safe, which is
  the opposite of the point.
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
src/markup.html             the four screens
src/styles.css              committed dark theme, mobile-first
src/game.js                 question engine. No model is called anywhere.
scripts/validate-facts.mjs  schema, claim length and the tone rule
scripts/build.mjs           inlines everything into dist/
scripts/export-for-review.mjs  flattens every fact to CSV for verification
docs/design-map.html        the full design map
dist/give-or-take.html      standalone -- open it straight off disk
dist/artifact.html          page content only, for publishing
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

## How a round is assembled

Ten slots, fixed shape: over/under, true/false, over/under, closest-guess,
true/false, over/under, which-came-first, true/false, over/under, wager. Bands
ramp easy -> medium -> hard across them. No fact is used twice in a round.
"Gentler questions" softens every band one notch.

The tone rule is enforced in three places: a body count is never the dial on a
closest-guess slider, never the wager question, and never one of the three
questions that open a round. `scripts/validate-facts.mjs` fails the build if a
fact whose unit is a body count is not marked `sensitive: true`. Streak bonuses
are still awarded on a sensitive fact but never celebrated in the reveal.

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
