# Kirk Ogren Game

An over/under history quiz. The player picks a historical period they already care
about and answers ten easy questions about it. Every answer opens onto the real
fact, the story behind it, and a link out — the game is a doorway into reading.

**Status: design only. No game code has been written yet, by request.**

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

## Content rules (non-negotiable, same spirit as the recipe pipeline)

- Every fact ships `status: "draft"`. Only human review promotes it. Nothing
  auto-publishes.
- Every fact carries a source title and URL, surfaced on the reveal card.
- Contested numbers set `approx: true` and say so in `context`.
- Facts live in git as one JSON file per category. Pull request review *is* the
  review queue until volume outgrows it.

## What's on disk right now

```
data/facts/civil-war.json            20 facts, draft, format reference
data/facts/american-revolution.json  20 facts, draft, format reference
docs/design-map.html                 the full design map
```

Both fact files are **unreviewed drafts** written to pin down the schema. They
have not been fact-checked by a human and must not be treated as verified.

## Open questions

1. The game needs a real player-facing name.
2. Tone policy for hard periods. The category map includes the Holocaust,
   slavery and the Plains Wars, and the audience is "all ages" — over/under
   wagering on atrocity death tolls would be indefensible. Those categories need
   an editorial rule before their files get written.
3. Sourcing standard — wave one cites Wikipedia; review should upgrade
   load-bearing facts to NPS, Library of Congress, NASA and academic sources.
4. Who reviews 2,000 facts. This is the real bottleneck, and no amount of engine
   work makes it go away.
5. Licence, and whether the repo goes public.
