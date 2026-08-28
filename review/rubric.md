# Todd's standard for Give or Take

This is the version of record. `scripts/screen-test.mjs` writes its own draft to
`rubric.generated.md` and never touches this file — correct this one where it is
wrong, and the correction sticks.

**Rewritten from 144 adjudication calls** (`review/adjudication.json`), which are
the first complete labels this project has had: the screener named every question
it would throw out, and Todd ruled on each one, so a "keep" is a decision rather
than an absence. Before that, the rules in Part 3 were fitted to 27 marks he
happened to notice while reading. Most were wrong, and the wrongness was
invisible because nothing measured them.

**What the calls did to the old rules.** Against the flagged shortlist, Todd
agreed with the screener 39% of the time. Every rule it cited scored under half:

| rule as it was written | times cited | he agreed |
|---|---|---|
| Q4 — quantity outside a plausible band | 63 | 33% |
| Q1 — probe outside the category's cluster | 45 | 42% |
| Q2 — constant answer / true-false | 40 | 25% |
| Q5 — physically impossible | 25 | 40% |
| Q3 — distance is quality, not difficulty | 7 | 29% |
| Q6 — the probe should be a confusable date | 3 | 0% |

A rule that fires on 63 questions and is right 21 times is not mistuned, it is
measuring the wrong thing. Q2 and Q4 are deleted below rather than adjusted. The
numeric thresholds they carried — 1.5x the true value, 1.5x the category's median
consecutive gap — were mine, derived from too little, and the 144 calls refute
both directly.

**His own standard, in his words.** Fifty-nine of his reasons are the same
sentence: **"someone might guess that."** He writes it as a defence, not a
complaint. A question earns its place when a player has some way to reason
toward the answer. That is the whole test, and the screener has been failing it
from the strict side — throwing out playable questions — far more often than the
loose one.

---

## Part 1 — Is the fact worth keeping?

*(Unchanged. This part was built on 272 fact ratings, and the adjudication deck
did not test it: the deck deliberately covers only facts he rated good.)*

### R1. Reject a fact nobody has a way into. [strong — 31 poor verdicts, 12 with reasons]

His words, verbatim and repeatedly: **"no one cares"** (9 times), **"who cares"**
(3), **"too random"**, **"not interesting"**.

The test is not obscurity. It is whether an ordinary player has any foothold —
some prior, some story, some reason to have an opinion. Rejected:

- **Administrative and procedural events**, even inside a famous story: the party
  voting on winter quarters, the expedition's journals being published late,
  Cleisthenes' reforms, the Flint sit-down strike, the Bonus Army eviction.
- **Named events that are historically major but that Americans cannot place**:
  the founding of the Roman Republic, Alaric's sack of Rome, the Battle of
  Kadesh, the unification of Egypt, Hatshepsut's reign, Rollo and Normandy,
  Alfred and Guthrum, the Oseberg excavation.
- **Bare statistics about secondary things**: the length of Ramesses II's reign,
  the capacity of the theatre at Epidaurus, the number of men in the CCC.

**But do not over-apply this to numbers.** He rated the *length of the Nile* and
the *distance the expedition covered* **good**. A quantity attached to a subject
people already care about is fine; a quantity attached to something they do not
is not. The subject carries the interest, not the number.

### R2. A myth-correction is not automatically good. [3 counter-examples]

He rated **poor**: *"Caesar's last words were 'Et tu, Brute?'"*, *"The New Deal
ended the Depression"* ("no one cares"), and *"The Dust Bowl was made far worse
by the way the Plains had been farmed"* ("once again not interesting"). He
rejected the Wall Street suicides myth as **"not appropriate"** — a tone
judgement, not an interest one.

A myth-correction works when a typical adult would confidently assert the wrong
version *and* would enjoy being corrected. It fails when the myth is not widely
held, when the correction is a dry matter of policy, or when the subject makes
the correction feel tasteless.

### R3. What he does approve, honestly stated. [unknown mechanism — 210 unexplained]

He approved most things. The pattern *appears* to be famous subjects with a story
attached, but he gave no reason for it and you should not pretend otherwise.
**Default to good when no rule above fires**, and say your confidence is low
rather than inventing a justification.

### Contradictions worth knowing about

- *"Japanese troops occupied American soil during the war"* is tagged **household
  and poor** at the same time.
- The Dow's 1929 peak of **381 points** is tagged **household**.
- Several Pacific War facts of similar standing — Bataan, Yamamoto, MacArthur's
  return, Okinawa — are **poor**, while comparable WWII Europe facts are good.
  This may be a judgement about that whole file rather than about each fact.

Do not resolve these by inventing a rule. Flag them.

---

## Part 2 — How well known is it?

**Household means the specific value is held, not that the subject is famous.**
He called Gettysburg, the Seven Hills of Rome and Brown v. Board **familiar**,
not household: the subjects are famous and the numbers are not.

His 24 household tags divide into two kinds:

- **Dates almost every American can state**: 1776, 1787, 1912, 1945, 1969.
- **Claims, not dates** — true/false facts where the *statement* is the thing
  everyone knows: the carriers were not at Pearl Harbor, the Great Wall is not
  visible from the Moon, women were conscripted in Britain.

**Obscure** [46 tags] applies when the number or date is specialist even though
the event may not be — AD 793 for Lindisfarne, 1021 for Vinland.

**Familiar** is the default and covers 190 tags. When unsure, say familiar.

**Do not use this tag to predict his question verdicts.** On the adjudication
deck the fame tag carried almost no signal: he rejected 39% of flagged questions
on familiar facts and 38% on obscure ones. It sets how tight a probe *should* be
generated; it does not tell you whether a given probe is bad.

---

## Part 3 — Is it a good question?

*(Rebuilt from the 144 calls. Everything here is either supported by them or
marked as unsupported.)*

### Q1. Distance matters, and the scale is local to the fact — not the category.

Within any single fact he is almost perfectly ordered by distance: across 53
ordered pairs of probes on the same fact, he rejected the nearer one while
keeping the farther one **twice**, and one of those is a rounding tie. A probe
further from the truth is never better than a nearer one, and once a distance is
rejected, everything beyond it is too.

**But the cutoff belongs to the fact, not the file.** Pooled across facts the two
piles sit on top of each other — rejected probes run 0.22-3.0x the category's
median consecutive gap, kept ones 0.29-2.5x. What he actually tolerates:

| fact | keeps up to | rejects from |
|---|---|---|
| Saratoga, Valley Forge, Common Sense (1776-77) | 2 years | 4 years |
| Vicksburg 1863, Jefferson 1801 | — | 2-3 years |
| Baseball, 1903-1947 | 8 years | — |
| Titanic wreck found 1985 | 14 years | — |
| Champollion 1822 | 18 years | 100 years |
| Lindisfarne AD 793, Parthenon 432 BC | 150 years | — |
| Colosseum AD 80 | 107 years | — |
| Cleopatra 30 BC | 121 years | 242 years |

The American Revolution tolerates four years; the Vikings tolerate a hundred and
fifty. **Ancient Egypt is the case that kills the old rule**: its category median
gap is 540 years, and he rejects a 100-year probe inside it. The category is not
the unit — 1799, 1822 and 1922 sit close together in a file that also reaches
3100 BC, and a player who can place Champollion can place him to the decade.

Ordering by the distance to the fact's **nearest dated neighbour in the same
category** separates better than the category median, but still not cleanly: at
or under 1.2x that distance he kept 17 and rejected 4; above it he kept 9 and
rejected 10. **Use it as a direction, not a threshold.** Flag only when the probe
is far outside the span of the neighbouring facts *and* nothing notable happened
at the probe's date. When it is close, keep it — that is the side where the
screener has been wrong.

### Q2. DELETED — "the answer is always the same, so nobody has to think."

**25% precision over 40 citations, the worst of any rule.** It was firing on
true/false questions that state the correct value, on the theory that a player
who always answers "true" never reasons. He does not see it that way. Of the
eight true/false questions the screener flagged on good facts, he kept six —

> the Declaration in 1776 · Marathon in 490 BC · twelve moonwalkers ·
> the Constitution in 1787 · sixteen watertight compartments · thirteen colonies

— and rejected two: *Rome founded in 753 BC* and *a longship crew of 60 men*.

The replacement is about the player, not the answer distribution:

**Q2'. A true/false works when the player holds an opinion about the value.**
Thirteen colonies, 1776, 490 BC, twelve moonwalkers — a player will back
themselves. 753 BC and sixty oarsmen are specialist numbers nobody carries, so
there is nothing to be right or wrong about. This is R1 applied to the value
rather than to the subject.

*(The engine still balances true against false across a category, and
`scripts/validate-facts.mjs` warns at 75% one way. That is a generation concern.
It is not a reason to reject an individual question.)*

### Q3. A wider probe is not a harder one. [supported, but rarely the reason]

Moving a number further from the truth does not make a question harder; past some
point common sense answers it without any knowledge of the subject. True, and it
follows from Q1's ordering. But cited alone it was right 2 times in 7 — it
describes a fault, it does not find one.

### Q4. DELETED — "keep quantities within about 1.5x either way."

**33% precision over 63 citations, and the multiplier is provably noise.** Every
judged probe, grouped by its ratio to the true value:

| ratio | kept | rejected |
|---|---|---|
| 0.50x | 7 | 6 |
| 1.25x | 5 | 1 |
| 1.50x | 9 | 7 |
| 1.80x | 1 | 3 |

At exactly half, and at exactly one and a half, his verdict is a coin flip. No
threshold on this axis can do better, because the axis is wrong.

**Q4'. A quantity has a real-world range, and the range belongs to the quantity.**
What he checks is whether the number could be true of *this thing* — not how far
it sits from the answer. The rejections say it plainly:

- **3,330 people aboard the Titanic** — more than the ship could hold. He kept
  1,110.
- **23 watertight compartments** — no ship is built that way. He kept 9.
- **the wreck at 5,700 m** — deeper than the ocean is there. He kept 1,900 m.
- **16,200 banks failed** — most of the country's 25,000 banks. He kept 12,600.
- **40,500,000 Soviet dead** — beyond any serious estimate. He kept 13.5, 20.25
  and 33.75 million.
- **97 miles from Selma to Montgomery** — further than that march covered.

The rejected side varies fact by fact: sometimes the low probe breaks the range,
sometimes the high one. There is no symmetric band.

**A second kind of rejection, distinct from the first.** Where the true value is
itself a number the public carries, a wide probe is dead on arrival because
everyone already knows it:

> 56 games (DiMaggio) · 90 feet (the bases) · 714 home runs (Ruth) ·
> 272 words (Gettysburg) · 13 colonies · 56 signers · 39 years old (King) ·
> 269 metres (the Titanic's length)

Against those he rejected probes at 0.5x, 0.7x, 1.25x, 1.31x and 1.5x alike.
Against quantities nobody holds — D-Day troop numbers, new species described, the
Dow's peak, Blitz deaths — he kept probes at exactly the same ratios.

**So: to flag a quantity, name the constraint it breaks or the famous figure it
contradicts. If you can do neither, keep it.**

### Q5. Nothing physically or logically impossible. [40% — keep, but narrow it]

A percentage above 100. A future date. Ramesses reigning 99 years. Howard Carter
finding the tomb in 2042. Martin Luther King Day first observed in 2016. Real
faults, and he agreed on all of them.

The 60% that missed were cases where "impossible" was doing duty for "unlikely".
**Reserve this for a value that cannot be true, not one that is merely far out.**
Where it is a matter of degree, it is Q4'.

### Q6. UNSUPPORTED — "the good probe is a plausible confusion."

> *"the 1783 one is good because people may get confused with the us constitution
> date"*

His only positive statement about what makes a probe good, and the engine is
built on it. But the screener cited it three times and he overruled all three,
and several of his clearest rejections are probes landing squarely on another
famous date in the same category — 1781 against Saratoga, 1787 against Yorktown,
1861 against Vicksburg. **Do not use it to flag.** One quotation is not enough to
overturn six counter-examples, and not enough to keep either. It stays recorded,
unresolved.

---

## Part 4 — How to behave

**Be reluctant.** On the last run the screener flagged 13% of the corpus and was
right about 39% of what it flagged. Every false flag costs a question a player
would have enjoyed, and the corpus is already close to his standard: projected
from the ruled sample, about **5% of the questions on facts he rated good are
ones he would reject**, 7% allowing for what the screener misses.

Concretely:

- **Flag only when you can name the constraint it breaks**, in the terms of Q1,
  Q4' or Q5. "Too far off" and "outside the plausible range" are conclusions, not
  reasons — say *what* is out of range and *why that is the ceiling*.
- **Never flag a question for being easy.** He has never once rejected one for
  that, and "someone might guess that" is his phrase for a question working.
- **Do not flag every probe on a fact** unless each genuinely breaks a
  constraint. Several of the worst earlier runs threw out four probes on one
  fact, which leaves the fact unusable.
- **When in doubt, keep it.** A bad question that ships is one card a player
  shrugs at. A good question thrown out is gone.

## Part 5 — Do not optimise for these

He has never commented on wording, claim length, sourcing, the `context` line or
the `goDeeper` line — and he used the "something looks off" flag on 25 facts
without explaining any of them. **Silence is not approval.** It means no evidence
either way, and inventing a preference from it is exactly the mistake that
produced the thresholds this rewrite just deleted.
