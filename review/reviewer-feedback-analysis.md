# What Todd's review actually says

Analysis of `todd-state.json` (31 rated cards, saved 2026-08-27 18:56), the review desk
that collected it, and the engine that produced the questions he was reacting to.

**The one-line finding:** 15 of Todd's 16 written reasons are about the *number the
engine picked*, not the fact. The tool rates facts. Almost all of his signal is
therefore stored against the wrong object, and the 28 "good" ratings are an
aggregation artefact, not agreement.

**Sample:** cards 1–30 in file order, contiguous, plus card 31 — American Revolution
(all 20) and Lewis and Clark (first 11). No sampling; he simply started at the top and
stopped. 21 year facts, 6 number, 3 boolean, 1 approx-age. Ratings: 28 good, 1 fair,
2 poor. 25 of 31 carry a `how well known` tag; 16 carry a written reason.

**Caveat on freshness, stated up front.** The asks Todd saw for cards 1–30 were baked
by the review-workbook generator at commit `bb9a10b` (12:54) and used a fixed offset:
year + 30 / + 7 / + 2, count × 1.6 / × 1.4 / × 1.15, **always upward**. Every "1806",
"1811", "1813", "1833", "1836" he complains about is `value + 30`. The engine was
rewritten to draw probes from real neighbouring events at `863a5b7` (18:44) — during
his session — and the small-number direction bug was patched at `dc64206` (18:52).
So roughly half his specific complaints are already answered. **The rubric below is
still the acceptance criteria to build against, because the current engine still fails
R3 on 91% of year facts and R5 on every small count.** See the engine section for
measurements against the code as it stands.

---

# 1. The rubric

Written as instructions a generator can follow. Each rule carries a confidence tag:
**[repeated]** = said three or more times, **[once]** = said once, **[inferred]** =
derived from silence or from a pattern he did not name.

## R1 — The probe must be a date inside this category's own story. [repeated — 11 times]

Hard rule. Reject any over/under probe that falls outside the span of events the
category is about.

> "the 1811 question is outside the ballpark" (Yorktown, 1781)
> "the question of 1813 is way off" (Treaty of Paris, 1783)
> "1807 way too late" (Valley Forge, 1777)
> "whats with the 1836 question" (return to St Louis, 1806)
> "once again the dates are too late around the fact" (reached the Pacific, 1805)

Thirty years is not far in the abstract; it is a different century of the story.
American Revolution spans 1765–1791, Lewis and Clark 1801–1806. A probe outside that
window is not a difficulty setting, it is a null question.

**Implementation:** clamp every probe to the category's own min/max year. Prefer a
probe that *is* the date of another fact in the file.

## R2 — The probe must name something a player could confuse the answer with. [once, but load-bearing]

This is the only positive mechanism he names, and it is the whole design:

> "the 1783 one is good because people may get confused with the us constitution date"

**Test a generator can apply:** can you say what happened at the probe date, in this
category? If not, the probe is illegitimate. 1783 works because the player is choosing
between two real, adjacent, genuinely confusable landmarks. 1806 works against nothing.

Note this is n=1 and it is the rule the team has already built to. It deserves
confirmation from a second reviewer before it is treated as settled.

## R3 — Both directions, and never a constant answer. [repeated — 4 times]

> "why not dates before the answer" (Washington inaugurated)
> "once again why not any over questions before that date?" (Bill of Rights)
> "once again no over questions on the date" (distance covered)
> "why is it always over" (thirteen colonies)

**Hard rule:** across the probes a single fact can generate, the correct answer must
not be predictable. A fact whose answer is always "After" is not a question; it is a
free point on first sight and a memorised point thereafter. Choose the direction
first, then find a probe on that side.

## R4 — "Easy" means a near miss, not a big gap. Widening makes a question worse, not gentler. [repeated — 4 times]

> "the before or after 1806 is bad because **everyone knows it was before**"
> "the 1805 question is bad because **its too easy**"
> "everyone will know before 1800"
> "1800 date is way to late and a **lame** question"

He uses "too easy" and "way off" for the *same* probes. That is the crux: distance from
the truth is not a difficulty axis for him, it is a quality axis, and it only goes one
way. Difficulty must come from confusability (R2) and from how well known the fact is
(R6), never from moving the number further out.

**Implementation:** the easy band should be the *furthest confusable neighbour*, not the
furthest number. If a category has no distant-but-confusable neighbour, the easy band is
simply a slightly wider near neighbour — not a bigger number.

## R5 — Counts are not years. Small, well-known counts get adjacent probes. [once, twice corroborated by ratings]

> "why dont you have a question with 10 or 12 colonies why is it always over and usually by alot"

Two demands, and only the first has been acted on. He names the probes he wants —
**10 or 12** against 13 — i.e. ±1 to ±3, not a multiple.

**Hard rule:** never generate a count that is impossible or absurd for the thing being
counted. "More or fewer than 3 colonies", "fewer than 8 signers of the Declaration",
"was Sacagawea more or fewer than 3 years old" are all currently producible. A count
probe must stay inside the range a reasonable person would consider.

## R6 — The more famous the fact, the tighter the probe. [inferred, and consistent with his tags]

He tagged only three cards `household` (Constitution, thirteen colonies, reaching the
Pacific) and complained about the range on two of them. He tagged four `obscure`
(signers, budget, Floyd, Sacagawea's age) and complained about the range on none.

**Implementation:** the fame tier already exists in the engine and is currently inert
(see F7). Turning it on with his 25 tags is the single cheapest quality win available.

## R7 — Reject facts whose value nobody could have a prior about. [repeated — both "poor" ratings]

His only two rejections:

> `lc-floyd` — "Sergeant Charles Floyd became the expedition's only fatality", 1804 —
> **"too random"**
> `lc-sacagawea-age` — "Sacagawea's approximate age during the expedition", 17 — **poor**,
> no reason given

Both are facts where the only route to an answer is "it must have been during the
expedition". Both are tagged `obscure`. Both are, in effect, coin flips dressed as
questions. Note `lc-sacagawea-age` also carries `approx: true` — an approximate value
asked as an exact over/under.

**Test:** is there any reason a player would have a prior about this number, other than
knowing the surrounding story? If not, cut the fact. Note he did *not* reject the other
three `approx` facts (8,000 miles, 122 animals, 178 plants) — those are approximations
of things the story is about. Approximation is not the disqualifier; arbitrariness is.

## R8 — Myth corrections are the strongest format. [inferred from silence]

The three boolean facts he saw — "all the delegates signed together on July 4",
"Paul Revere shouted 'The British are coming'", "Benedict Arnold was a successful
American general before he switched sides" — were all rated good with **no comment at
all**, in a session where he commented on half of everything else. Silence from a
reviewer who complains freely is approval.

Keep writing "everyone believes X, actually Y". Note the format has no probe, so it
cannot fail R1–R5 — which is likely part of why it scores clean.

## R9 — A good question is one no one minds being asked. [once]

> "This is a good question that no one would mind answering"

Do not ask a question that makes the player feel stupid or uncomfortable. This is the
same instinct behind the README's tone rule and behind R7.

## R10 — Do not optimise for things he never mentions.

In 31 cards he never commented on: wording, claim length, sourcing, the reveal card's
`context` or `goDeeper` prose, or accuracy. **He used the "Something looks off here"
flag zero times.** The desk gives every card a source link and both prose blocks; none
of it drew a word. Either it is fine, or it is invisible. Do not read approval into it —
read *no signal*.

## What the rubric covers, and what it does not

Trust it for: **over/under probes on year facts in a dense, single-generation,
well-known American category.** Do not extend it to numbers (6 cards), booleans
(3 cards, all myth corrections), which-came-first (0 cards), BC dates (0), sparse or
two-cluster timelines (0), or sensitive material (0). See section 4.

---

# 2. The review desk: what it is asking wrong

28 good out of 31, and half the cards carry a complaint. That is not a reviewer who
liked things. It is a form that had no box for what he wanted to say.

### The single most important change: rate the question, not the fact.

The card shows the claim, the true answer, and then a list headed **"What a player is
actually asked"** containing three to six different generated questions. Underneath is
one button row: **"Is it a good question?"** — singular. He is shown four things and
given one verdict, which is then stored under the fact id.

His own text says the two are different objects:

> "the fact is good questions bad" (`lc-sacagawea-joins`, rated **good**)
> "This is a good question that no one would mind answering **the only problem** the
> before or after 1806 is bad" (`ar-declaration`, rated **good**)

So `{"ar-declaration": {"q": "good"}}` means "the fact is good and one of the four
questions is unusable". Any downstream consumer reading the ratings alone learns the
opposite of what he said. The desk's own export prompt half-knows this — it tells the
consumer to "weight the reasons far more heavily than the ratings" — which is an
admission that the ratings are not carrying the signal.

**Change:** make the unit of review one generated question. One ask per card, with its
correct answer shown, rated on its own. Keep a separate, once-per-fact judgement ("is
this fact worth a card at all") — that is the axis his two "poor" ratings actually used.
This one change is worth more than everything else below combined.

### 2. The comment box is hidden — and wiped — for "fair".

```js
r.q = (r.q === b.dataset.q) ? null : b.dataset.q;
if (r.q !== 'good' && r.q !== 'poor') r.why = '';
```

and

```js
var wantWhy = r.q === 'good' || r.q === 'poor';
$('why-wrap').hidden = !wantWhy;
```

The middle rating — the one that naturally means "fact fine, question weak", which is
what he thought about at least a dozen cards — is the only one with no way to explain
itself, and selecting it *destroys any reason already typed*. The single card he rated
`fair` (`ar-boston-tea-party`) is the single card with `"why": ""`.

This is both a data-loss bug and the mechanical cause of the rating inflation: **to say
anything at all, he had to press Good or Poor.** He wanted to comment on 16 cards, so he
pressed Good 28 times.

**Change:** always show the reason box, on every rating and on none.

### 3. There is no field for "the probe number is wrong", which is 15 of his 16 comments.

The only structured escape hatch is the flag button, whose placeholder reads *"What
looks off? The checkers will be pointed at it"* — it routes to the fact-checking
pipeline. Todd correctly never used it, because nothing is factually wrong. So eleven
bug reports about probe selection went into a textarea labelled **"What makes this one
work?"** with the placeholder *"the go deeper line is the real story"*.

The form asked for praise and received a defect list. It is to his credit that he
ignored the prompt; a more compliant reviewer would have written nothing useful.

**Change:** add a third route — "this question is wrong" — with a checkbox set that
matches his vocabulary: *number is outside the period* / *always the same answer* /
*too easy to be worth asking* / *nobody could know this*. Those four options would have
captured 15 of 16 free-text comments as structured data.

### 4. Three points on one axis cannot carry three judgements.

He is being asked to compress: is the fact worth a card, is this probe fair, and is the
difficulty right. "Too easy" is his most common criticism and it is neither good nor
poor. There is nowhere to put it.

**Change:** split into (a) keep/cut the fact, (b) fair/unfair probe, (c) too easy /
about right / too hard. (c) alone would have turned "1805 is bad because its too easy"
into a number a generator can optimise against.

### 5. The asks were frozen, and stale by three minutes.

Cards 1–30 were rendered from a generator that had already been replaced. The desk has
since been regenerated (18:57) against the live engine — `ar-colonies` now previews
6 / 10 / 12 / 14 / 16, which is exactly what Todd asked for, and `ar-declaration` now
previews 1773 / 1775 / 1777 / 1781. Good. But the underlying rule needs stating:

**Change:** a review card must render from the current engine at open time and stamp the
engine version into the saved record. Otherwise every rubric derived from a review file
is dated and nobody can tell by how much.

Note the regeneration also made problem #1 worse: the card now shows *five or six* asks
and still collects one rating.

### 6. No sampling. He reviewed a prefix, not a sample.

Cards 1–30 are contiguous from position 0. Two adjacent files, one era block, one
country. The desk has filters ("not yet rated", "flagged") but no way to spread a short
session across the corpus.

**Change:** default the card order to a stratified shuffle — one card per category
before the second card of any category. Thirty cards would then have covered all
fourteen categories, all three kinds, and both BC and AD.

### 7. The form's schema changed mid-session, and the richest five cards lost their fame tag.

The first five entries carry `{"v": "ok", "fix": ""}` — an accuracy-verdict axis that no
longer exists — and **no `k` value**. Those five are the cards with his longest and most
specific reasons, including the 1783 insight the whole engine rewrite was built on. The
taste export reports `how_well_known: null` for exactly those.

**Change:** version the review schema, and when it changes, re-ask the cards that predate
it rather than merging silently.

### 8. The 25 fame tags he did supply have no path into the game.

The desk's export prompt asserts that "how_well_known drives question difficulty… a
household fact must be asked against a tight range". That is a description of `RANK` in
`src/game.js`. It is not running — see F7. He has now tagged 25 facts and the shipped
game reads none of them.

**Change:** write `k` back to `fame` in `data/facts/*.json` (the validator already
accepts the field, `scripts/validate-facts.mjs:39`) as part of the review hand-off.

---

# 3. Engine faults his comments are evidence of

All measurements below are against the working tree at `dc64206`, run with the real
category files. Scratch harness: `engine-core.js` / `sim*.js` under the session
scratchpad.

## F1. The tables that produced his complaints are now unreachable dead code

`FIXED` (`src/game.js:105-109`) is where 1806 / 1811 / 1813 came from: `familiar.easy`
is `[8, 30]`, and the workbook generator took the top of the range every time. For year
facts it is now reachable only at `src/game.js:216-218`, in the branch taken when no
`pool` is passed — and `tryMake` always passes one (`src/game.js:374`, `378`). `SPREAD`
(`98-102`) is reachable only when `neighbours()` returns empty, which cannot happen: the
thinnest category (Titanic) still has four distinct year values.

Not a defect, but worth deleting or commenting — their presence makes it look as though
Todd's complaint is unaddressed when it is.

## F2. 32% of year facts have a constant correct answer. This is the mechanical form of his loudest complaint.

`src/game.js:200-206` — the probe is always the value of a real neighbouring year fact.
For any fact at the earliest or latest end of a category's timeline, **every neighbour is
on one side**, so the correct answer never changes. `dir` is computed at line 172 and
then never used in this branch.

Measured across all 14 categories, 136 year facts:

| | count | share |
|---|---|---|
| same correct answer at **every** band | **44 / 136** | 32% |
| same correct answer at **at least one** band | **124 / 136** | 91% |

Worked examples:

- `ti-sank` (Titanic sinks, 1912) — probe is **1911, always**, at every band. Answer:
  "After", forever. The single most famous date in the category yields one question with
  a fixed answer.
- `pm-eruption` (Vesuvius, AD 79) — probe is **AD 62, always**. `pm-earthquake` (AD 62) —
  probe is **AD 79, always**. The two facts ask each other, one question each, forever.
- `ar-stamp-act` (1765, earliest in the file) — "Before" 100% at all three bands.
  `ar-bill-of-rights` (1791, latest) — "After" 100% at all three bands.
- `lc-jefferson-president` (1801) — "Before" 100%. `lc-return` (1806) — "After" 100%.

Todd said this four times without being able to see the mechanism:
*"why not dates before the answer"*, *"why not any over questions before that date?"*,
*"no over questions on the date"*, *"why is it always over"*.

**Fix:** draw `dir` first, filter `near` to that side, and fall back to a synthetic
offset within the category's span when the chosen side is empty.

## F3. The hard band collapses to a single probe in more than half of all year facts

`src/game.js:201-205`:

```js
var win  = RANK[fame][useBand];
var last = near.length - 1;
var lo   = Math.min(last, Math.round(win[0] * last));
var hi   = Math.min(last, Math.max(lo, Math.round(win[1] * last)));
anchor   = near[randInt(lo, hi)].fact;
```

`familiar.hard` is `[0, 0.12]`. With a thin `near` list, `round(0.12 * last)` is 0, so
`lo === hi === 0` and the probe is always the single nearest neighbour.

**75 of 136 year facts (55%)** have exactly one possible hard probe. Whole categories:
sixties-america 13/13, civil-war 12/12, roaring-twenties 10/10, wwii-europe 9/9,
lewis-and-clark 8/8, ancient-egypt 6/9, black-death 5/9, pompeii 5/5, titanic 4/4.

Combined with F2 and the 74 boolean facts (one fixed question each, no variation ever):
**118 of 280 cards are fully memorised after one exposure.** That is a direct problem for
the Daily Challenge and the "five more?" retention metric the README calls the most
informative number the prototype produces.

## F4. The Ancient Egypt fix does not work on Ancient Egypt

The comment at `src/game.js:185-190` says the probe is capped so that
*"was Hatshepsut before 1822?"* cannot happen. It still happens.

```js
var gapUnit = medianGap(pool) || 3;               // :192
var nearest = near[0].d;                          // :193
var ceiling = plausibleOnly
  ? Math.max(5,  gapUnit * 2.5, nearest * 4)      // :195
  : Math.max(10, gapUnit * 6,   nearest * 8);     // :196
```

The cap is derived from `medianGap(pool)` — the median gap across the *whole file*. In a
two-cluster category the chasm is precisely what inflates that median, so the statistic
used to exclude the chasm is corrupted by it. Ancient Egypt's median gap is **540**, so
`ceiling = 540 × 6 = 3,240` years, and the 1,952-year jump from 1922 back to 30 BC sails
under it.

Live output, current code:

- `eg-tut-tomb-found` (1922) — easy probe set is **{30 BC, 1799}**. "Was Tutankhamun's
  tomb found before or after 30 BC?"
- `eg-rosetta-found` (1799) — easy set **{30 BC, 1922}**.
- `eg-hieroglyphs-deciphered` (1822) — easy set **{30 BC, 1922}**.
- `eg-cleopatra-died` (30 BC) — easy set **{1479 BC, 1799, 1822}**.

Same shape in Pompeii (AD 62–1944) and available in Vikings, Black Death and Lincoln.

**Fix:** cap from a robust statistic of the *near* distances — e.g. the median of the
three smallest — or cluster the year values and never cross a cluster boundary.

## F5. `neighbours()` returns an order that `probeFor` then misreads as distance rank

`src/game.js:147-150`:

```js
out.sort(function (a, b) {
  if (a.spent !== b.spent) return a.spent ? 1 : -1;
  return a.d - b.d;
});
```

Facts already used in the round are pushed to the back. The array is therefore
`[unspent by distance][spent by distance]` — **not** monotonic in distance. Lines 201-205
then index into it by proportion, on the assumption that position ≈ distance rank.

Measured, `ar-declaration` (1776), *easy* band:

| round state | easy probe set |
|---|---|
| nothing used yet | 1770, 1773, 1781 (3–6 years out) |
| 3 nearby facts used | 1765, 1783, 1787 (7–11 years out) |
| 5 closest facts used | 1765, 1783, 1787 |

The easy band gets *wider* as the round progresses — while the plan
(`src/game.js:336-347`) is ramping from easy to hard. Difficulty drifts with round
position rather than with the band, and in the opposite direction to the design.

**Fix:** sort by distance only, and either exclude spent facts or use spent as a
tie-break within a distance bucket.

## F6. Count probes are still absurd, and commit `dc64206` claims a fix it did not make

`FRACTION.familiar.easy` is `[0.6, 1.6]` (`src/game.js:114`), with the downward cap of
0.85 added at `:227`. That fixed the *direction* half of Todd's complaint and left the
*magnitude* half — "usually by alot" — untouched.

Measured probe sets, current code:

| fact | true | easy | medium | hard |
|---|---|---|---|---|
| `ar-colonies` | 13 | **2,3,4,5** ∪ 21–34 | 7–10 ∪ 16–19 | 11,12,14,15 |
| `ar-signers` | 56 | **8**–22 ∪ 90–150 | 28–42 ∪ 70–84 | 46–52 ∪ 60–66 |
| `lc-sacagawea-age` | 17 | **3**–7 ∪ 27–44 | 9–13 ∪ 21–25 | 14–16 ∪ 18–20 |
| `lc-budget` | $2,500 | **$380**–$1,000 ∪ $4,000–$6,500 | — | — |

`dc64206`'s message states: *"Thirteen colonies now asks against 6 or 20 on easy, 10 or
16 on medium, 12 or 14 on hard."* Only the hard figures are right. **6 and 20 are not
producible on easy** (`13 × 0.15 = 1.95`, `13 × 0.4 = 5.2` downward; 21–34 upward), and
medium tops out at 10 / 19. "More or fewer than 3 colonies?" and "Was Sacagawea more or
fewer than 3 years old?" are live easy questions today.

**Fix:** for small integer counts, drop the proportional model entirely and use absolute
offsets bounded by plausibility, as R5 specifies. Also correct the commit message —
someone will read it and believe the problem is closed.

## F7. The fame tier is inert. Every one of 280 facts runs as `familiar`.

`fameOf` (`src/game.js:81-84`) defaults to `'familiar'`. `RANK`, `SPREAD`, `FIXED` and
`FRACTION` are all keyed on it. The validator accepts and checks the field
(`scripts/validate-facts.mjs:39-41`). **Zero of 280 facts set it** — verified by grep
across `data/facts/`.

So the entire "a household date must be asked against a tight range" design — asserted
as fact in the review desk's own export prompt — has never executed. Only the middle row
of four tables is ever read. This is why `ti-sank` and `pm-eruption`, the two most famous
dates in their files, get the same treatment as an obscure one.

Todd's 25 `k` tags are exactly the missing input, and they are sitting in a JSON file
with no writer.

## F8. The tone rule cannot express the one thing he rejected, and the validator actively discourages the fix

`lc-floyd` — his first "poor", *"too random"* — is a year fact about a man's death. It
already trips a warning:

```
warn  lewis-and-clark.json [lc-floyd]: claim mentions death -- check a human is happy with the framing
```
(`scripts/validate-facts.mjs:78-80`)

But the obvious response — mark it `sensitive: true` — produces a second warning saying
that would be pointless:

```js
if (f.sensitive) {
  sensitive++;
  if (f.kind !== 'number') warnings.push(`${file} [${f.id}]: sensitive on a non-numeric fact has no effect`);
}
```
(`scripts/validate-facts.mjs:70-72`)

**That warning is false.** `src/game.js:361` filters on `x.sensitive` for facts of every
kind:

```js
var ok = function (x) { return !(opening && x.sensitive); };
```

So `sensitive` works fine on a year fact, and the validator is telling reviewers not to
use the mechanism that would fix the only card the human rejected. Machine warning and
human taste independently converged on the same fact and the toolchain kept them apart.

## F9. `makeOrder` treats the band gap as a floor, so "hard" came-first can be the easiest question in the round

`src/game.js:304-308`:

```js
var gap = Math.max(1, Math.round(unit * (band === 'easy' ? 3 : band === 'medium' ? 1.5 : 0.5)));
...
if (Math.abs(years[i].value - years[j].value) >= gap) {   // first pair that clears it wins
```

`gap` is a minimum, not a target. In a category with median gap 1 (Lewis and Clark,
Civil War, WWII, sixties-America) the hard threshold rounds to 1, so any pair qualifies —
including the two furthest-apart events in the file. The highest-scoring format (120
points, `src/game.js:326`) in the tightest slot can be the gentlest question asked.

**Fix:** select the pair whose separation is *closest to* the band target, not the first
that exceeds it.

## F10. Boolean facts generate exactly one question, forever

`src/game.js:267-269` — a boolean fact's statement is its claim, unchanged, with a fixed
answer. 74 of 280 facts (26%) are boolean. They are, per R8, the format Todd likes best,
and they have zero replay value. Worth knowing before the Daily Challenge, which needs
per-player question uniqueness.

---

# 4. What he has not told us

## The sample is a prefix, not a sample

Cards 1–30 in file order. Two categories of fourteen; both American, both in the same
era block, adjacent in the file. Kind mix skews hard toward the format he complained
about most:

| kind | his sample | corpus |
|---|---|---|
| year | 21 (68%) | 136 (49%) |
| number | 7 (23%) | 70 (25%) |
| boolean | 3 (10%) | 74 (26%) |

He judged years at 68% weight when they are half the corpus, and booleans at 10% when
they are a quarter — and booleans are the format he rated best.

## Formats he has never seen at all

- **Which-came-first: zero cards.** The desk emits no came-first asks, yet it is slot 7
  of 10 in every solo round and the only 120-point format. Entirely unreviewed.
- **A false true/false: zero cards.** Every TF ask in the desk shows the *true* value.
  The engine flips a coin (`src/game.js:271`), so about half the TFs a real player meets
  show a fabricated number. Live examples he has never assessed: *"Lewis and Clark
  reached the Pacific Ocean in 1804 — true or false?"* (one year out, on a fact almost
  nobody can pin to a year) and *"Jefferson requested $2,100 — true or false?"* (a pure
  coin flip on an obscure figure). Both are exactly the shape he calls "too random".
- **Sensitive facts: zero cards.** All 9 marked-sensitive facts sit in categories he
  never reached (Black Death 2, Civil War 2, WWII 2, Pompeii 1, sixties 1, Titanic 1).
  The README lists tone policy for hard periods as open question #1 and there is no human
  calibration on it whatsoever. His "too random" rejection of a single death — Floyd —
  hints he may be less tolerant than the current rule assumes.
- **BC dates: zero cards.** `fmtYear` renders negatives as "3100 BC"; "before or after
  1479 BC" reads backwards to most lay players. Untested on a human.

## Structural cases his two categories cannot exercise

Both are dense and tightly clustered — American Revolution spans 26 years with a median
gap of 2; Lewis and Clark spans 5 years with a median gap of 1. Neither exercises:

- **Two-cluster timelines** (event + rediscovery). Six of fourteen categories span 80+
  years with a modern archaeology tail: Egypt (5,022), Pompeii (1,882), Black Death
  (1,353), Vikings (1,111), Lincoln (113), Titanic (86). This is where F4 lives.
- **Number-dominant categories.** Titanic is 10 numbers of 20; Egypt and Lincoln 7 each.
  Todd rated 7 numbers total and wrote about 2.
- **Very sparse year sets.** Titanic (4 distinct years), Pompeii (5) — where F2 and F3
  are total, not partial.

## Which categories would change the picture most, ranked

1. **Ancient Egypt** — the only file that tests two-cluster timelines, BC dates, and a
   wide fame gradient (Tutankhamun beside Kadesh) at once, and the one where the engine
   is measurably still broken (F4). Highest information per card by a distance.
2. **Titanic** — 10 numbers and 4 years. It is the count-probe rubric (R5) and the
   sparse-timeline problem in one file, on a subject everyone knows. R5 currently rests
   on a single sentence about thirteen colonies.
3. **WWII in Europe or Black Death** — forces the sensitive/body-count judgement the
   README flags as unresolved, on a reviewer who has already rejected one death as
   "too random".
4. **Civil Rights Movement or sixties-America** — living memory, where "how well known"
   is age-dependent in a way the household/familiar/obscure axis cannot express, and the
   README's stated audience runs from nine to seventy-five.
5. **Ancient Greece** — BC plus genuinely obscure, to test whether R7 generalises or was
   really a reaction to the death in `lc-floyd`.

## How far the rubric can be trusted

R1, R3 and R4 are repeated, unambiguous, and safe to encode as hard constraints today.
R2 is n=1 and already load-bearing on the whole engine rewrite — get it confirmed.
R5 is n=1 plus two corroborating "poor" ratings on small counts. R6, R8 and R9 are
inferences from tags and silence and should be treated as hypotheses to test, not rules.

Nothing in this file licenses a judgement about came-first questions, false true/false
statements, BC dates, body counts, or any category outside a dense American decade.
Thirty-one cards from the top of one file is a strong signal about one failure mode and
no signal at all about five others.
