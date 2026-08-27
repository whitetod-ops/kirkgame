# Checking the facts

Todd does not check facts for accuracy. He judges whether a question is
*interesting*. That decision was made deliberately, and it means this pipeline
is the only thing standing between a generated fact and a player reading it as
true. Everything below follows from that.

## The three stages

| Stage | What it is | Where it lives |
| --- | --- | --- |
| 1. Generation | Claude writes facts in conversation. Not automated. | `data/facts/*.json` |
| 2. Independent check | A Claude model establishes the answer from scratch. | `scripts/check-facts.mjs` |
| 3. Final check | An OpenAI model does the same job. | `scripts/check-facts-openai.mjs` |
| 4. Adjudication | Merge the three answers, split into two queues. | `scripts/adjudicate.mjs` |

Stages 2 and 3 are **different vendors on purpose**. Two Anthropic passes would
share training data and therefore share errors: a fact Claude is confidently
wrong about would pass twice and reach a player as true. The value of stage 3
is entirely in its having been trained by someone else. Do not "simplify" this
by pointing both stages at the same provider.

## Why the checks are blind

**The checker is sent the claim and nothing else.** Not the stored value, not
`context`, not `goDeeper`, not `source`, not `approx`. It is asked to establish
the answer from its own knowledge and cite where a reader would confirm it.
Only afterwards, in our process, is its answer compared with what the corpus
holds.

The reason is anchoring. Ask a language model *"we have 1776, is that right?"*
and it will say yes — to 1776, and just as readily to 1775. Agreement with a
value you handed the model measures its agreeableness, not the fact. A checking
pipeline built that way returns a wall of green ticks and catches nothing,
which is worse than no pipeline at all, because it is believed.

So the request is one-directional: *here is a claim, what is the answer?* The
comparison happens in `compareValues()` in `scripts/check-facts.mjs`, never in
the prompt.

The one unavoidable leak is the **unit** on a `number` fact ("answer in
metres"), without which the answer is not comparable — the Great Pyramid is 146
or 480 depending on what you are counting in. A unit is not a value.

The unit test suite asserts this: for all 280 real facts, no prompt contains
the stored value, `context`, `goDeeper` or the source URL.

## Running it

```
node scripts/check-facts.mjs                       # dry run: plan and cost, no calls
node scripts/check-facts.mjs --limit 10 --apply    # try ten facts for a few cents
node scripts/check-facts.mjs --apply               # the whole corpus

node scripts/check-facts-openai.mjs --limit 10 --apply
node scripts/check-facts-openai.mjs --apply

node scripts/adjudicate.mjs                        # summary table, writes nothing
node scripts/adjudicate.mjs --apply                # writes the two queues
```

Flags on both checkers: `--apply`, `--limit N`, `--force`, `--concurrency N`
(default 5), `--help`.

**Dry run is the default.** Nothing spends money or writes a file without
`--apply`, in line with the rest of the project's tooling. A dry run still
checks the API key, because a preflight that ignores a missing credential is
not a preflight.

### Keys

`ANTHROPIC_API_KEY` and `OPENAI_API_KEY`, read from the environment. Copy
`.env.example` to `.env.local` (gitignored) and either export the variables or
`set -a; . ./.env.local; set +a`. There is no fallback: a missing key stops the
run with a message naming the variable. Keys are never written to any file this
pipeline produces.

### Cost and interruption

Each run prints how many facts it checked and a rough cost from the token usage
the vendors report. Ballpark for all 280 facts: a few cents on `gpt-4o-mini`,
well under a dollar on Sonnet.

Results are written to `review/checks-<stage>.json` **after every fact**, so an
interrupted run keeps everything it paid for. Re-running skips facts that
already have a result; `--force` re-checks them. `--limit` applies to what is
left, so repeated limited runs walk forward through the corpus.

## The adjudication rule

A fact is **agreed** only if the stored value, the Anthropic answer and the
OpenAI answer all agree. Everything else is **disputed**. A fact missing either
check is **pending** and goes into neither file — unchecked is not the same as
agreed, and the pass-through pile must never contain something nobody checked.

Every tie breaks towards disputed. The cost of a wrong "agreed" is a false fact
shown to a player as true; the cost of a wrong "disputed" is thirty seconds of
Todd's time.

### What counts as agreement

| Kind | Tolerance |
| --- | --- |
| `year` | zero. The game asks "before or after 1870?" and pairs facts by which came first; a one-year drift is a wrong answer on screen. |
| `number` | 1% (floor 0.5, so small integers must be exact) |
| `number` with `approx: true` | 10% (floor 1) — contested figures where the corpus itself only claims to be close |
| `boolean` | exact |

A model answer that cannot be read as a single unambiguous number becomes
`unverifiable` rather than a guess, and `unverifiable` never lands in the
agreed pile.

### Reasons on a disputed fact, worst first

| Reason | Meaning |
| --- | --- |
| `both-checkers-agree-against-stored` | Both vendors independently landed on the same different answer. The strongest signal this pipeline can produce that the corpus is wrong. Carries `proposed_value`. |
| `both-checkers-mismatch-and-differ` | Both disagree with the corpus and with each other. Usually a vague or badly framed claim. |
| `mismatch-anthropic-openai-matched` / `mismatch-openai-anthropic-matched` | One vendor dissents. |
| `unverifiable-*` | One or both could not establish an answer. |

## The output files

- `review/checks-anthropic.json`, `review/checks-openai.json` — one record per
  fact: `{id, claim, stored_value, model_value, verdict, confidence,
  source_url, note}` plus category, kind, delta, model and timestamp. The raw
  reply is kept only when it could not be parsed, so a failure is debuggable
  without paying for the call twice.
- `review/agreed.json` — passed all three ways. Flagged, not blocked, if
  neither checker could cite a source or both were low-confidence.
- `review/disputed.json` — the only pile a human opens, sorted worst first.

## What this pipeline does not do

**Nothing auto-publishes.** These scripts never write to `data/` and never
change a fact's `status`. Promotion from `draft` stays a human act, as the
content rules require.

**It checks the claim, not the reveal card.** `context` and `goDeeper` carry
factual claims of their own — they are the colourful lines, which makes them
the likeliest to be wrong — and nothing here reads them. They are still
unchecked prose. `scripts/export-for-review.mjs` is currently the only thing
that surfaces them.

**It checks the corpus's source URL not at all.** A URL is never fetched. The
`source_url` in a check record is where the *model* says the answer lives, not
a verification that the stored link says what the fact claims.

**Agreement is not truth.** Two models agreeing is strong evidence and it is
not proof; a widely repeated error is exactly the thing both were trained on.
The agreed pile is *plausible*, and it should be spot-checked by a person from
time to time to find out what the pipeline is missing.
