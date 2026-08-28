# Category research: what the lineup should be, and how it should be organised

Research brief for **Give or Take**. Two questions: what the prototype's categories
should be, and whether subjects should be a flat list or a two-level hierarchy.
Plus the strategic question underneath both — whether this stays a history game.

Every external claim below is linked. Where I have measured something in this
repository rather than found it on the web, it is marked **[repo]**.

---

## 1. The recommendation

### 1.1 Stay history. Take sports in as *history of sports*, and nothing else.

Do not go general. The evidence is not close.

- The general trivia market is occupied and consolidating. The trivia games
  market was about **$3.8bn in 2025**, and the top five publishers — Kahoot!,
  Etermax (Trivia Crack), Zynga, Scopely and Jackbox — are projected to hold
  **64% of it by 2026**
  ([Market Intelo](https://marketintelo.com/report/trivia-games-market)).
  Trivia Crack alone has around **340 million cumulative downloads**
  ([Playbite](https://www.playbite.com/q/how-much-revenue-does-trivia-crack))
  and reached over **125 million users** on the back of a six-category wheel
  ([Google AdMob case study](https://admob.google.com/home/resources/admob-helps-trivia-crack-go-global-and-reach-over-millions-of-users/)).
  Practitioners describe the category as **saturated**
  ([Clustox](https://www.clustox.com/blog/sports-trivia-app/)).

- Winning the general market is not even sufficient. QuizUp had **1,200+ topics**
  ([productmint](https://productmint.com/what-happened-to-quizup/)) and **70
  million users**, and still could not monetise; the studio sold for **$8.7m**
  ([PocketGamer.biz interview with founder Thor Fridriksson](https://www.pocketgamer.biz/teatime-games-ceo-thor-fridriksson-candid-talk/)),
  was absorbed by Glu Mobile, and was **shut down in March 2021**
  ([Quizzy](https://joinquizzy.com/blog/what-happened-to-quizup/),
  [buildd](https://buildd.co/startup/failure-stories/what-happened-to-quizup)).
  Being the biggest general trivia app in the world was a losing position.

- **What general trivia demand actually is, Give or Take structurally cannot
  serve.** QuizUp published its most-played topic per US state. The winners were
  *Frozen* in New Hampshire, *Harry Potter* in North Carolina, *SpongeBob
  SquarePants* in New Jersey, *My Little Pony* in Wyoming, and "Name the
  Celebrity" in California
  ([Adweek](https://www.adweek.com/performance-marketing/quizup-reveals-most-popular-trivia-topic-in-each-state/),
  [Daily Dot](https://www.dailydot.com/debug/most-popular-quizup-trivia-category-by-state/)).
  Not one of those has a body of verifiable public numbers. A game whose only
  formats are over/under and true/false **on numbers and dates** cannot ask a
  single good question about *Frozen*. Going general means competing for an
  audience the mechanic cannot satisfy.

- **The over/under mechanic is already a commodity in the general space.** The
  Higher/Lower family runs free browser games over box office, YouTube
  subscribers, Spotify streams, house prices, car prices, country populations
  and sports salaries ([moreorless.io](https://moreorless.io/games),
  [higherlowergame.com](http://www.higherlowergame.com/),
  [higherlowergame.org](https://higherlowergame.org/)). The mechanic is not the
  moat. The moat is a sourced, human-reviewed corpus where every wrong answer
  opens onto a story and a link. Going general throws away the only defensible
  asset and walks into the one thing already given away free.

- **History is the only subject whose facts do not decay.** The design map names
  the real bottleneck as "who reviews two thousand facts". A "current sports" or
  "current music" category is wrong within a season and needs re-verification
  forever. 1927 is wrong never. With a hand-review pipeline this is not a
  stylistic preference — it is the difference between a corpus and a treadmill.

- **The niche is the discoverable position.** App-store research consistently
  finds that specific keywords outrank generic ones in a crowded store
  ([Asodesk](https://asodesk.com/blog/aso-research-markets/),
  [Niches Hunter](https://nicheshunter.app/blog/profitable-app-niches-2026)).
  "Trivia" is unwinnable. "History quiz" is a thin field — the visible
  incumbents are level-based multiple-choice apps of the *21 levels, 15
  questions per level* variety
  ([History Trivia Quiz Game, App Store](https://apps.apple.com/us/app/history-trivia-quiz-game-2026/id1493682831)).

**The middle path, defined precisely.**

- **Allowed:** *history of X*, where the questions are dates, records and
  quantities. Baseball's history. The Olympics. The history of the movies. Blues
  to rock and roll. The design map **already contains two of these** — "Baseball
  History" and "American Music: Blues to Rock and Roll" — so the owner's instinct
  is already inside the plan and does not require a pivot to act on. **[repo:
  `docs/design-map.html`]**
- **Not allowed:** current sports, current music, current film, celebrity,
  fandom. These break the premise, break the mechanic, and start the maintenance
  treadmill.

On the owner's own example — `Sports > baseball, American football, soccer,
basketball, bowling` — recast it as **Sports History**, and ship exactly *one*
child in the prototype: **Baseball's History**. It is the highest numeric-density
subject available anywhere in this project (see §2.4), and whether players pick
it over the history categories is the cheapest possible experiment on whether the
general pivot is worth having. Bowling passes the numeric test but the audience
is a 100-slot, not a prototype slot. Soccer's American audience is real and
growing but its history is not American history — hold it for a World Cup
category later.

### 1.2 Flat list now. Two levels at 100. Search and shelves at 1,000.

Short version, thresholds in §4:

| Catalogue size | Answer |
| --- | --- |
| **14 (today)** | Flat scrolling list with the four era headings as in-page labels. **Exactly what the app already does.** Do not add a tap. |
| **~20–30** | Still flat. Add a "Start here" shelf of 5–6 above the fold, and *recently played*. |
| **~40–60** | Still flat, but headings become sticky/jumpable. **Add search here**, not later. |
| **100** | Two levels — roughly 10–12 parents × 8–10 children — *plus* tags, because the design map's own groups already overlap. |
| **1,000** | The tree stops being the interface. Search, recently-played, curated shelves and a daily round that removes the choice entirely. |

The one thing to avoid at every size: a hierarchy that *hides* children behind a
parent tap. Group visibly; do not drill down.

### 1.3 The top gaps, in one line each

**Ancient Rome** (absent, and the single biggest miss), **the Space Race**,
**Pearl Harbor and the Pacific**, **the Wild West**, **the Great Depression and
the Dust Bowl**, **Knights and Castles**, and — the one that will look wrong and
is best-evidenced of all — **The 1980s**.

---

## 2. The evidence

### 2.1 What people actually play

**Every general trivia format allots history roughly one slot in six.**

- *Trivial Pursuit* Genus (1981) shipped six wedges: Geography, Entertainment,
  History, Art & Literature, Science & Nature, Sports & Leisure
  ([BoardGameGeek](https://boardgamegeek.com/boardgame/2952/trivial-pursuit-genus-edition),
  [List of Trivial Pursuit editions](https://en.wikipedia.org/wiki/List_of_Trivial_Pursuit_editions)).
- *Trivia Crack* shipped six: art, sports, science, history, entertainment,
  geography
  ([Trivia Bliss](https://triviabliss.com/trivia-crack-categories/),
  [Google Play listing](https://play.google.com/store/apps/details?id=com.etermax.preguntados.lite)).
- A standard US/UK pub quiz runs **5–8 rounds of 8–10 questions**, with General
  Knowledge, Music, Picture, History, Sports, Science and Geography as the core
  set ([Trivia Themes](https://triviathemes.com/blog/pub-quiz-categories-guide/),
  [PubQuiz Nederland](https://pubquiznederland.nl/en/pub-quiz-rounds/),
  [PsyCat Games](https://psycatgames.com/magazine/party-games/pub-quiz/)).

**On *Jeopardy!*, history is about 30% of the most-repeated board.** A survey of
1984–2012 episodes puts the ten most common categories as Before & After,
Science, Literature, **American History**, Potpourri, **World History**, Word
Origins, Colleges & Universities, **History**, and Sports
([Fox News](https://www.foxnews.com/entertainment/jeopardys-top-10-most-common-categories)).
Three of the top ten are history. Just **100 categories account for nearly 10% of
every category ever played** — the show survives on repetition, not novelty
([Slate](https://www.slate.com/articles/arts/culturebox/2011/02/ill_take_jeopardy_trivia_for_200_alex.html)),
and Science is the single most frequent category overall
([NYC Data Science](https://blog.nycdatascience.com/blog/student-works/jeopardy-sabermetrics)).

Two conclusions. First, a repeating spine of ~100 well-chosen subjects is the
proven shape of a trivia catalogue — which validates the 100-category plan and
argues against rushing to 1,000. Second, **two of Jeopardy's top ten (Before &
After, Word Origins) are wordplay, which Give or Take cannot do at all.** The
addressable share of general trivia is smaller than it looks.

**Sports and recent-decade nostalgia are the volume categories.** Sports is
described as "the all-time most-played category", and **the 90s is the single
most popular themed round across US bars**, with the 80s second and true crime
the surging category
([Cheap Trivia](https://cheaptrivia.com/blogs/trivia-talk/30-best-trivia-categories-for-bar-trivia)).
Sporcle's all-time most-played user quizzes are dominated by sport — "NBA Top 25
by Category" at ~1.93m plays, "NBA Playoffs Since 1980" at ~1.62m
([Sporcle all-time popular](https://www.sporcle.com/popular/alltime)).

This is the strongest argument in the whole brief for letting sports in *somehow*
— and the strongest argument for **The 1980s** and eventually **The 1990s** as
categories. Both are history by any normal reckoning, both are numerically rich,
and both aim straight at the demographic that actually plays trivia (§2.2).

### 2.2 Who plays

The game's design assumes a nine-year-old sitting beside a seventy-five-year-old,
and builds for it — 56–64pt buttons, 19px base type, no speed bonus **[repo:
`README.md`]**. That is a good accessibility floor. It is not the market.

- US bar trivia skews **25–55**: roughly **45% aged 25–40 and 30% aged 41–55**,
  with **68% of American adults** participating in some form of trivia
  ([Trivia20](https://www.trivia20.com/blog/bar-trivia-night-statistics)).
- Geeks Who Drink, a large US pub-quiz operator, reports players **55% female,
  24–39, household income above $100k**
  ([Priceonomics](https://priceonomics.com/the-economics-of-trivia-night/)).
- US trivia skews younger than the UK, where players trend to mid-40s
  ([Last Call Trivia](https://lastcalltrivia.com/bars/bar-trivia-history/)).

**Implication for the lineup:** keep the all-ages *interface*, but pick
categories for a 25–55 American. That means over-indexing on history they met on
a screen — WWII, Rome, the Wild West, the Moon, the Titanic, Vikings, the
Eighties — and under-indexing on syllabus history they met in ninth grade and
resented (Lewis and Clark, the Federalist Era).

### 2.3 Where history demand actually lives

The best single source here is the **American Historical Association / Fairleigh
Dickinson national survey**, 40 questions, **1,816 US adults**
([AHA project page](https://www.historians.org/teaching-learning/current-events-in-historical-context/history-the-past-and-public-culture-results-from-a-national-survey/),
[full report PDF](https://www.historians.org/wp-content/uploads/2024/06/History-Past-Public-Culture-Survey-Report-2021-08.pdf)).

Its central finding is decisive for category selection: **the top three sources
of history for the American public are all video** — documentary film/TV,
fictional film/TV, and TV news. Meanwhile **historic site visits rank 8th, museum
visits 10th, non-fiction history books 12th, and college history courses last**
([AHA, "Where Do People Get Their History?"](https://www.historians.org/teaching-learning/current-events-in-historical-context/history-the-past-and-public-culture-results-from-a-national-survey/3-where-do-people-get-their-history/),
[History News Network summary](https://www.historynewsnetwork.org/article/180008)).

**A category earns its slot if a documentary or a drama has already taught the
audience the vocabulary.** This is why Titanic, Vikings and Ancient Egypt are
good calls, and it is a direct argument for Rome, the Wild West and the Space
Race.

Corroborating demand signals:

- **Ancient Rome.** The 2023 "how often do you think about the Roman Empire"
  trend put **#romanempire at ~1.8bn TikTok views** with **Google searches for
  "Roman Empire" up ~750% between August and September 2023**
  ([Accio analysis](https://www.accio.com/business/roman_empire_trend_tik_tok),
  [TIME](https://time.com/6314544/tiktok-roman-empire-trend/),
  [Forbes](https://www.forbes.com/sites/danidiplacido/2023/09/21/tiktoks-roman-empire-meme-explained/),
  [The Conversation](https://theconversation.com/how-often-do-you-think-about-the-roman-empire-tiktok-trend-exposed-the-way-we-gender-history-214425)).
  This is the clearest public-demand signal for any historical subject in the
  last five years, and the game currently has **no Rome category at all** — only
  Pompeii, which is a Roman *sub*topic.
- **WWII and the Civil War.** WWII is the most popular US military engagement
  polled, **66% saying US involvement was justified** against 14% not, for a net
  **+52**; the Civil War is third at **54% / 22%**
  ([FiveThirtyEight](https://fivethirtyeight.com/features/most-americans-agree-that-wwii-was-justified-recent-conflicts-are-more-divisive/)).
  Majorities of Americans also claim some knowledge of the Civil War
  ([YouGov](https://today.yougov.com/politics/articles/45912-what-do-americans-think-about-civil-war)).
- **The Space Race.** A record-high **64% of Americans say the space
  programme's costs are justifiable**, up from 55% in 1999 and 58% in 2009
  ([Gallup](https://news.gallup.com/poll/260309/years-moon-landing-support-space-program-high.aspx));
  **35% of US adults name the lunar landings as one of NASA's two most important
  achievements**
  ([University of Michigan](https://news.umich.edu/americans-reflect-on-apollo-11-and-the-space-program));
  and public engagement around the 50th anniversary was broad
  ([Pew](https://www.pewresearch.org/short-reads/2019/07/17/how-americans-see-the-future-of-space-exploration-50-years-after-the-first-moon-landing/)).
- **Vikings.** History's *Vikings* drew an estimated **8.3m viewers across its
  premiere night**, averaged **4.3m in season one** and was the year's **No. 1
  new cable series** ([Deadline](https://deadline.com/2014/02/historys-vikings-carves-out-3-6-million-viewers-in-second-season-debut-691346/),
  [Television Stats](https://televisionstats.com/s/vikings)); it produced 89
  episodes plus three seasons of *Valhalla* and is credited with a broad pop-
  culture Viking revival
  ([The Viking Herald](https://thevikingherald.com/article/vikings-tv-series-paving-the-way-for-a-viking-age-in-pop-culture/86),
  [OSU Origins](https://origins.osu.edu/read/why-we-love-vikings)).
- **The West.** *Yellowstone*'s series finale drew **11.4m viewers** same-day and
  **13.1m over three days**, the most-watched episode in its run, with the Season
  5 Part 2 premiere reaching **~21m in Live+3**
  ([Variety, finale](https://variety.com/2024/tv/news/yellowstone-series-finale-ratings-paramount-network-1236251385/),
  [Variety, premiere](https://variety.com/2024/tv/news/yellowstone-ratings-season-5-part-2-biggest-premiere-audience-ever-1236206561/)),
  and it is credited with a broad Western revival
  ([Salon](https://www.salon.com/2022/11/20/yellowstone-effect-tv-westerns/),
  [Screen Rant](https://screenrant.com/western-genre-tv-shows-revival-not-taylor-sheridan-yellowstone/)).
  There is no Wild West category.
- **The Titanic.** Interest is self-renewing. The June 2023 *Titan* submersible
  implosion "gripped public attention across the globe"
  ([CNN timeline](https://www.cnn.com/2023/06/24/us/missing-titanic-submersible-timeline/index.html))
  and commentators tied it directly to the enduring Titanic mythology
  ([Boston University](https://www.bu.edu/hospitality/2023/06/26/fascination-with-titanic-underscores-dangers-of-extreme-tourism)).
- **Physical footfall corroborates the screen data.** The Smithsonian's most-
  visited museum in 2024 was **Natural History at ~3.9m**, then **Air and Space
  at ~3.1m**, then **American History at ~2.1m**
  ([Statista](https://www.statista.com/chart/36220/most-visited-smithsonian-institutions/));
  Independence National Historical Park logged **3.04m visits in 2023, up 13%**
  ([NPS](https://www.nps.gov/inde/learn/news/over-3-million-visits-to-philadelphia-s-national-parks-in-2023.htm));
  NPS units overall set a record **331.9m visits in 2024**
  ([CNN](https://www.cnn.com/2025/03/07/travel/most-visited-us-national-park-sites-2024),
  [Smithsonian Magazine](https://www.smithsonianmag.com/smart-news/these-were-the-most-and-least-visited-national-parks-in-2024-180986251/)).
  Note that *space* outdraws *American history* at the Smithsonian by roughly
  50%.
- **Podcasts.** The best-known long-form history series are WWI ("Blueprint for
  Armageddon"), the Mongols ("Wrath of the Khans") and the Pacific war
  ("Supernova in the East")
  ([Ranker](https://www.ranker.com/list/best-hardcore-history-podcast-episodes/ranker-podcast),
  [RSS.com roundup](https://rss.com/blog/best-history-podcasts/),
  [Katie Couric Media](https://katiecouric.com/entertainment/best-history-podcasts-2025/)).
  The current 14 has no WWI, no Mongols and no Pacific.

### 2.4 The mechanic filter: what a category must contain

The engine only produces over/under, true/false and which-came-first, all binary,
all off a stored `year`, `number` or `boolean` **[repo: `src/game.js`,
`README.md`]**. That is a hard filter on subject matter.

**Passes well** (dense, stable, checkable public numbers):

| Subject | Why it passes |
| --- | --- |
| Sports history | The densest numeric corpus in existence. MLB's 2024 integration of Negro Leagues records added **2,300+ players** and moved the career batting title to **Josh Gibson at .372 over Ty Cobb's .367**, with a **.466** single-season mark ([MLB.com](https://www.mlb.com/news/josh-gibson-supplants-ty-cobb-atop-mlb-career-average-leaderboard), [CNN](https://www.cnn.com/2024/05/29/sport/josh-gibson-mlb-records-negro-league)). Every one of those is a ready-made over/under with a story attached. |
| Space, engineering, disasters | Distances, thrusts, durations, tonnages, casualty-free counts. |
| Geography and demographics | Populations, elevations, areas, lengths. |
| Science and medicine | Dates of discovery, magnitudes, doses, counts. |
| Film as *box office and release year* | Grosses and dates are public and fixed. |
| Recent decades (80s/90s) | Prices, chart runs, election results, box office, hardware specs. |

**Fails the filter** — say so plainly, because these are exactly the categories a
"go general" instinct reaches for first:

| Subject | Why it fails |
| --- | --- |
| Fandom (Frozen, Harry Potter, SpongeBob, My Little Pony) | Zero verifiable public numbers — and these were **QuizUp's actual most-played topics by state** ([Adweek](https://www.adweek.com/performance-marketing/quizup-reveals-most-popular-trivia-topic-in-each-state/)). The most-wanted general content is the least compatible content. |
| The music round | Pub quizzes run it as **audio clips** ([PubQuiz Nederland](https://pubquiznederland.nl/en/pub-quiz-rounds/)); there is no text over/under equivalent. |
| The picture round | Same problem, visually. |
| Wordplay — Before & After, Word Origins | Two of *Jeopardy!*'s ten most common categories ([Fox News](https://www.foxnews.com/entertainment/jeopardys-top-10-most-common-categories)) and structurally impossible here. |
| Art & literature (the brown wedge) | Plot, character and authorship are recall of names. Publication year is the least interesting fact about a novel. |
| Celebrity / "Name the Celebrity" | Recognition, not quantity. |
| True crime | Numerically fine, and the **surging category of 2026** ([Cheap Trivia](https://cheaptrivia.com/blogs/trivia-talk/30-best-trivia-categories-for-bar-trivia)) — but it collides head-on with the existing body-count tone rule and the all-ages promise. Refuse it. |

**Two repo-measured constraints that should shape the lineup**

I ran the shipping fact files. **[repo: `data/facts/*.json`, 280 facts]**

```
category                  n  year  num  bool   year span
american-revolution      20    15    2     3   1765–1791
ancient-egypt            20     9    7     4   3100 BC–1922
ancient-greece           20    10    4     6   776–146 BC
black-death              20     9    4     7   541–1894
civil-rights-movement    20    12    3     5   1954–1986
civil-war                20    12    5     3   1860–1865
lewis-and-clark          20     8    6     6   1801–1806
lincoln                  20     9    7     4   1809–1922
pompeii                  20     5    7     8   AD 62–1944
roaring-twenties         20    10    4     6   1920–1933
sixties-america          20    13    4     3   1962–1969
titanic                  20     4   10     6   1911–1997
vikings                  20    11    2     7   793–1904
wwii-europe              20     9    5     6   1939–1945
```

1. **Narrow-span categories starve the question engine.** Lewis and Clark spans
   **five years**, WWII in Europe **six**, the Civil War **six**, the Sixties
   **seven**. `makeOrder` scales its gap to the category's own median year gap,
   so it degrades gracefully — but "which came first" between two events four
   months apart is a coin flip dressed as a question, and a category with only 8
   distinct years has very little rank space for the probe generator to work in.
   A category wants **either a wide date span or a heavy `number` load.** Titanic
   survives a single-day event precisely because it is 10 `number` facts to 4
   `year` facts; Pompeii the same. Any single-event category added later must be
   authored number-first, deliberately.

2. **The `fame` tier is built and completely unused.** `src/game.js` grades every
   fact `household` / `familiar` / `obscure` and uses that to pick how far the
   shown number sits from the truth — the difference between "before or after
   1870?" and a formality. **All 280 shipping facts carry no `fame` field**, so
   every one defaults to `familiar`. This is the single largest available
   improvement in question quality and it costs one word per fact. It matters
   more than any category decision in this document.

3. Minor: the README states `american-revolution.json` is "deliberately absent
   from `data/categories.json`". It is present, and 14 categories ship. The note
   is stale.

### 2.5 The competitive picture, stated plainly

| | General trivia | History-only |
| --- | --- | --- |
| Market size | ~$3.8bn, to ~$7.2bn by 2034 ([Market Intelo](https://marketintelo.com/report/trivia-games-market)) | A slice — history is ~1 of 6 wedges in every standard format (§2.1) |
| Concentration | Top 5 publishers ~64% by 2026 ([Market Intelo](https://marketintelo.com/report/trivia-games-market)) | Fragmented, low quality |
| Incumbent | Trivia Crack, ~340m downloads, ~$36m/yr ([Playbite](https://www.playbite.com/q/how-much-revenue-does-trivia-crack)) | Level-based multiple-choice apps ([App Store](https://apps.apple.com/us/app/history-trivia-quiz-game-2026/id1493682831)) |
| Precedent | QuizUp: 70m users, 1,200 topics, **dead** ([PocketGamer.biz](https://www.pocketgamer.biz/teatime-games-ceo-thor-fridriksson-candid-talk/), [Quizzy](https://joinquizzy.com/blog/what-happened-to-quizup/)) | Nothing at scale to displace |
| Mechanic already free elsewhere? | **Yes** ([moreorless.io](https://moreorless.io/games)) | Not with sourced, reviewed history |
| Content ages? | Yes, continuously | **No** |

Give or Take's stated purpose — "get people interested in going and researching
things themselves" — is not a purpose the general trivia market rewards, and it
is the only thing here that a $36m/year incumbent cannot copy in a sprint. Keep
it. The general apps serve history *badly*: a Trivia Crack history question is
one multiple-choice with no reveal, no source and no link out. That gap is the
whole business.

---

## 3. The recommended prototype lineup

Sixteen categories. Twelve of the current fourteen survive; two are cut; four are
added; one deliberate sports probe is included. Ranked — build in this order, and
if the prototype has to ship at ten, ship the top ten.

| # | Category | Status | Why it is here | Numeric fit |
| --- | --- | --- | --- | --- |
| 1 | **Ancient Rome** (Republic to Empire) | **ADD** | The biggest hole in the catalogue. #romanempire ~1.8bn TikTok views; "Roman Empire" searches **+750%** Aug→Sep 2023 ([Accio](https://www.accio.com/business/roman_empire_trend_tik_tok), [TIME](https://time.com/6314544/tiktok-roman-empire-trend/)). Shipping Pompeii without Rome is shipping the epilogue. | Excellent — 1,200-year span, legions, roads, aqueducts, emperors |
| 2 | **World War II in Europe** | keep | Most-supported US war polled: **66% justified vs 14%**, net **+52** ([FiveThirtyEight](https://fivethirtyeight.com/features/most-americans-agree-that-wwii-was-justified-recent-conflicts-are-more-divisive/)) | Good, but see the span warning — author number-first |
| 3 | **The American Civil War** | keep | **54%/22%** justified; majorities claim knowledge ([YouGov](https://today.yougov.com/politics/articles/45912-what-do-americans-think-about-civil-war)) | Six-year span; lean on troop counts, distances, costs |
| 4 | **The Space Race** | **ADD** | Record **64%** say costs justifiable ([Gallup](https://news.gallup.com/poll/260309/years-moon-landing-support-space-program-high.aspx)); **35%** name the landings NASA's top achievement ([U-M](https://news.umich.edu/americans-reflect-on-apollo-11-and-the-space-program)); Air & Space outdraws American History at the Smithsonian ([Statista](https://www.statista.com/chart/36220/most-visited-smithsonian-institutions/)) | Outstanding — the most naturally over/under subject in history |
| 5 | **Ancient Egypt** | keep | Natural History is the most-visited Smithsonian at ~3.9m ([Statista](https://www.statista.com/chart/36220/most-visited-smithsonian-institutions/)); permanent documentary staple ([AHA](https://www.historians.org/teaching-learning/current-events-in-historical-context/history-the-past-and-public-culture-results-from-a-national-survey/3-where-do-people-get-their-history/)) | Excellent span; watch the hard band on BC dates |
| 6 | **The Titanic** | keep | Self-renewing interest — the 2023 *Titan* implosion re-globalised it ([CNN](https://www.cnn.com/2023/06/24/us/missing-titanic-submersible-timeline/index.html), [BU](https://www.bu.edu/hospitality/2023/06/26/fascination-with-titanic-underscores-dangers-of-extreme-tourism)) | Best-shaped file in the repo: 10 numbers to 4 years **[repo]** |
| 7 | **The American Revolution** | keep | Independence NHP **3.04m visits, +13%** ([NPS](https://www.nps.gov/inde/learn/news/over-3-million-visits-to-philadelphia-s-national-parks-in-2023.htm)) | Best year spread in the repo (15 year facts, 26-year span) **[repo]** |
| 8 | **Pearl Harbor and the Pacific War** | **ADD** | The Pacific is one of the three best-known long-form history series ever made ("Supernova in the East") ([Ranker](https://www.ranker.com/list/best-hardcore-history-podcast-episodes/ranker-podcast)); currently absent | Very good — ships, aircraft, distances, dates |
| 9 | **The Wild West** | **ADD** | *Yellowstone* finale **11.4m same-day / 13.1m in three days**, Season 5B premiere **~21m Live+3** ([Variety](https://variety.com/2024/tv/news/yellowstone-series-finale-ratings-paramount-network-1236251385/)); a documented genre revival ([Salon](https://www.salon.com/2022/11/20/yellowstone-effect-tv-westerns/)). Zero coverage today | Good — cattle drives, railroads, gold, town populations |
| 10 | **Abraham Lincoln** | keep | US presidents dominate Wikipedia's long-run most-viewed biographies ([Wikipedia:Popular pages](https://en.wikipedia.org/wiki/Wikipedia:Popular_pages_(historical))) | Good — 7 number facts already **[repo]** |
| 11 | **The Vikings** | keep | *Vikings* averaged **4.3m** and was the year's No. 1 new cable series ([Deadline](https://deadline.com/2014/02/historys-vikings-carves-out-3-6-million-viewers-in-second-season-debut-691346/)); credited with a pop-culture revival ([The Viking Herald](https://thevikingherald.com/article/vikings-tv-series-paving-the-way-for-a-viking-age-in-pop-culture/86)) | Only 2 number facts today — needs ships, crews, distances **[repo]** |
| 12 | **The 1980s** | **ADD** | The 80s is the **second most popular themed round in US bars**, behind the 90s ([Cheap Trivia](https://cheaptrivia.com/blogs/trivia-talk/30-best-trivia-categories-for-bar-trivia)), and lands exactly on the 25–55 trivia core ([Trivia20](https://www.trivia20.com/blog/bar-trivia-night-statistics)). Already in the 100-map. This will feel wrong and is the best-evidenced addition on the list | Excellent — prices, box office, chart runs, elections, hardware |
| 13 | **The Civil Rights Movement** | keep | Documentary-saturated; central to US public history ([AHA](https://www.historians.org/teaching-learning/current-events-in-historical-context/history-the-past-and-public-culture-results-from-a-national-survey/)) | Adequate; 32-year span helps |
| 14 | **The Great Depression and the Dust Bowl** | **ADD** | Economic history is unusually number-native, and it is the missing bridge between the Twenties and WWII in the current era ladder | Excellent — unemployment, prices, indices, rainfall, migration |
| 15 | **The Twenties and Prohibition** | keep | Adjacent to the 20s/30s screen canon; already written | Adequate — 13-year span |
| 16 | **Baseball's History** | **ADD (the probe)** | The one deliberate test of the sports question. MLB's 2024 Negro Leagues integration added **2,300+ players** and made **Josh Gibson (.372)** career batting leader over **Ty Cobb (.367)** ([MLB.com](https://www.mlb.com/news/josh-gibson-supplants-ty-cobb-atop-mlb-career-average-leaderboard)) — a story that is simultaneously a stat, a reveal card and a link out. Already in the 100-map | Best in class — every fact is a number with a story |

**How to read the probe.** Ship Baseball's History with the same instrumentation
already planned for the mid-round "want five more?" prompt **[repo:
`README.md`]**. Two numbers decide the sports question: what share of first
sessions pick it, and whether its five-more rate beats the history median. If it
wins on both, add the Olympics and Pro Football's History at the 100 mark. If it
loses, the general pivot is dead and you have paid twenty facts to find out.

---

## 4. The taxonomy decision

### 4.1 At 14, flat — and 7±2 is not the reason to think otherwise

The most common argument for hierarchy at this size is Miller's "magical number
seven". It does not apply. Miller himself said the limit concerned
"the discrimination of unidimensional stimuli … and immediate recall, neither of
which has anything to do with a person's capacity to comprehend printed text"
([Laws of UX, ch. 4](https://www.oreilly.com/library/view/laws-of-ux/9781492055303/ch04.html)).
Jakob Nielsen's position is that using short-term memory to size a menu is
misleading, because **a menu is recognition, not recall** — every option is
continuously on screen, so there is no usability gain from capping it at seven
([UX Myths #23](https://uxmyths.com/post/931925744/myth-23-choices-should-always-be-limited-to-seven),
[Stéphanie Walter](https://stephaniewalter.design/blog/your-menu-doesnt-need-millers-7-plus-minus-2-rule/)).

Fourteen visible, labelled cards on a phone is fine. The four era headings the
app already uses are the correct amount of structure: **chunking without a tap**
([NN/g on chunking](https://www.nngroup.com/articles/chunking/)). Adding
`Sports > baseball` today would cost a tap and buy nothing.

Where the app should improve at 14 is not depth but **the first screen**. Grid
guidance is to tease **5–6 items per section** and to deliberately clip a tile at
the fold so the scroll affordance reads
([Suleiman Shakir](https://blog.iamsuleiman.com/horizontal-scrolling-lists-mobile-best-practices/),
[Nick Babich](https://babich.biz/blog/mobile-app-ux-design-grid-view-for-products/),
[UX4Sight](https://ux4sight.com/blog/how-to-improve-the-scrolling-experience-with-ux-design)).

### 4.2 Why choice overload *will* bite this product as it grows

The famous jam experiment: a 24-jar display stopped **60%** of passers-by against
**40%** for six jars, but converted **3%** against **30%**
([Iyengar & Lepper, 2000, summarised](https://medium.com/psykkd/choice-overload-what-we-can-learn-from-a-pot-of-jam-96c883b13da7),
[digitalwellbeing](https://digitalwellbeing.org/the-jam-study-strikes-back-when-less-choice-does-mean-more-sales/)).

The honest caveat: the effect is not universal. Chernev, Böckenholt and Goodman's
meta-analysis of **99 observations** found choice overload is conditional on four
moderators — **choice set complexity, decision task difficulty, preference
uncertainty, and decision goal**
([JCP 2015, PDF](https://chernev.com/wp-content/uploads/2017/02/ChoiceOverload_JCP_2015.pdf),
[Wiley](https://myscp.onlinelibrary.wiley.com/doi/abs/10.1016/j.jcps.2014.08.002)).

**Give or Take's picker triggers three of the four.** A hundred historical
periods are hard to compare against one another (complexity); a casual player has
no strong prior preference among them (preference uncertainty); and the goal is
weak — "I'll play something for three minutes" (decision goal). So this is a case
where overload is likely, and the mitigation is **defaults, shelves and a daily
round** rather than more depth.

### 4.3 The thresholds

**14 → 30: stay flat.**
Keep the era headings inline. Add two things, in this order:
1. **Recently played / continue** at the very top. Cheapest possible mitigation
   of the overload conditions above.
2. A **"Start here"** shelf of 5–6 above the fold.

**30 → 60: still flat, but add search.**
Headings become sticky section headers with a jump strip. Search must exist
before the list stops being scannable, not after — the failure mode you are
avoiding is documented on the commerce side, where **67% of ecommerce sites have
mediocre-to-poor category taxonomy** and users abandon when a structure demands
excessive exploration
([Baymard](https://baymard.com/research/homepage-and-category-usability)).

**At 100: two levels, roughly 10–12 parents × 8–10 children — plus tags.**

This is where the owner's `Sports > baseball` instinct becomes correct.

- Empirical support for shallow-and-wide over deep-and-narrow: for search tasks
  the optimum favours **breadth over depth**, and for systematic tasks the
  advice is to spread content across more screens rather than deeper trees
  ([menu breadth/depth study, arXiv](https://arxiv.org/pdf/2404.11469)).
  Selection accuracy in menu research falls off above roughly **breadth 8**, but
  a breadth-8 menu holds **>90% accuracy to depth 2**
  ([multi-stroke marking menu research](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7603633)).
  Two levels of about ten is inside the safe envelope. Three levels is not.
- The largest quiz catalogue on the web already does exactly this. Sporcle uses
  **15 top-level categories** — Entertainment, Gaming, Geography, History,
  Holiday, Just For Fun, Language, Literature, Miscellaneous, Movies, Music,
  Religion, Science, Sports, Television — with **subcategories derived from
  tags**, where a quiz sits in exactly **one** main category but **many**
  subcategories
  ([Sporcle categories](https://www.sporcle.com/categories/),
  [Sporcle Wiki](https://sporcle.fandom.com/wiki/Categories)).
- **This project needs tags specifically, and the design map proves it.** The
  100-category map already mixes era parents ("Ancient Rome", "Medieval and
  Renaissance") with cross-era thematic parents ("Faith and Belief — all eras",
  "Wars That Shaped the World — all eras", "Discovery and Everyday Life")
  **[repo: `docs/design-map.html`]**. The Crusades belong to both Faith and
  Medieval. Pompeii belongs to both Rome and Disasters. A pure tree forces a
  false choice. The recommended answer is the standard hybrid: **one primary
  parent for the browse tree, facets/tags for everything else** — described
  across the IA literature as the gold standard for large catalogues
  ([Quape](https://www.quape.com/ecommerce-category-structure/),
  [Voyado](https://voyado.com/resources/blog/product-taxonomy-ecommerce/)).

Concretely at 100, use **era as the primary parent** (it is what the app already
does, it is what a history audience expects, and it is mutually exclusive), and
make theme — war, faith, disaster, everyday life, sport, science — a **tag**.

**At 1,000: the tree stops being the interface.**

- Netflix reports that **more than 80% of what gets watched arrives through
  recommendation rather than search**
  ([Marketingino summary](https://marketingino.com/the-netflix-recommendation-algorithm-how-personalization-drives-80-of-viewer-engagement/),
  [Stratoflow](https://stratoflow.com/how-netflix-recommendation-algorithm-work/)).
- Netflix members **lose interest after 60–90 seconds of browsing**
  ([Magine Pro](https://www.maginepro.com/enhancing-decision-experience-dx-a-path-to-resolving-video-consumptions-paradox/)),
  which is why "Play Something" exists
  ([UX Collective](https://uxdesign.cc/netflix-vs-decision-fatigue-how-to-solve-the-paradox-of-choice-888ca56db4b)).
  A three-minute game cannot afford a ninety-second browse.

At 1,000 the interface is: **search, recently played, 5–8 curated shelves, and a
daily round that removes the choice entirely.** Wordle's whole retention model is
one puzzle a day with no choice at all — scarcity that produces a ritual and a
shared conversation
([Dinogame](https://dinogame.gg/blog/why-is-wordle-so-popular/),
[Blossom](https://blossomgame.net/the-psychology-behind-daily-wordle-habits/)).
The design map already schedules the Daily Challenge at phase 4 **[repo]**. It is
not just a retention feature — **it is the navigation answer at 1,000
categories**, and it should be argued for on those grounds too.

### 4.4 The alternatives, judged

| Option | Verdict |
| --- | --- |
| **Era grouping** (what the app does today) | **Correct, keep permanently.** It is a real chunking of a flat list with no tap cost, and eras are mutually exclusive, which is exactly what a primary parent needs. |
| **Two-level hierarchy** | Right at 100, wrong at 14 and insufficient at 1,000. Group visibly; never hide children behind a parent tap. |
| **Search** | Not needed at 14. Required by ~60. Cheap to build, and the only thing that scales linearly with the catalogue. |
| **Tags / facets** | Required at 100 because the design map's own groups already overlap. Layer over one primary parent, do not replace it. |
| **Recently played** | Highest value per unit of work of anything here. Add it at 20–30. |
| **Curated shelves** ("If you liked the Civil War", "Ten minutes to spare") | The main answer at 100–1,000, and it doubles as editorial voice — which suits a game whose pitch is a doorway into reading. |
| **Surprise me / Daily round** | The strongest anti-overload move available, and the one Netflix and Wordle both converged on. Ship a "Surprise me" button in the prototype; it costs almost nothing. |
| **A flat list at 1,000** | Not viable at any point. |
| **A three-level tree** | Never. Past depth 2 menu accuracy degrades sharply ([marking menu research](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7603633)). |

---

## 5. What I would cut

### Cut outright

**Lewis and Clark.** It is syllabus history rather than screen history, and the
trivia audience is 25–55 ([Trivia20](https://www.trivia20.com/blog/bar-trivia-night-statistics))
rather than in the ninth grade. It also has the worst mechanical shape in the
repo: **8 year facts spanning five years, 1801–1806** **[repo]**, which makes
"which came first" close to a coin flip and leaves the probe generator almost no
rank space. If it is kept, keep it as *Westward Expansion and the Oregon Trail*
(already in the 100-map) — a wider span, a bigger subject, and adjacent to the
Wild West category recommended above.

**America in the 1960s.** It overlaps three other categories at once — Civil
Rights (which ships), the Space Race (recommended #4) and Vietnam (in the map) —
and its year facts span **1962–1969** **[repo]**, seven years, the second-worst
in the repo. In a two-level taxonomy a decade *is* the parent, not a leaf. Break
it up and let its facts move into the three children.

### Demote, do not delete

**Pompeii and Vesuvius.** A strong file — 7 number facts, 8 booleans, only 5 year
facts **[repo]**, which is the right shape for a single-day event. But shipping
the epilogue without Rome is the wrong order. Fold it under **Ancient Rome** as a
sibling once Rome exists, and keep it out of the prototype's top ten.

**The Black Death.** Two problems. Mechanically it spans 541–1894 with only 9
year facts, so its hard band is unfair by construction **[repo]**. Editorially it
is the category that most directly collides with the unresolved tone policy — it
already carries **2 sensitive facts and 4 `approx` flags** **[repo]**, and the
open question in the README about over/under on atrocity death tolls applies to
plague mortality just as squarely. Keep it in the 100. Do not make it the
medieval anchor of a prototype. **Knights, Castles and Medieval Life** — already
in the map — is the better medieval anchor: wider span, no body-count problem,
and richer in the physical numbers (wall thicknesses, siege durations, garrison
sizes) that the mechanic likes.

**Ancient Greece.** Keep it, but it should not outrank Rome, and today it does —
Rome is not in the game at all. Greece's demand signal is real but nothing like
the Roman one ([Accio](https://www.accio.com/business/roman_empire_trend_tik_tok)).
Rank it ~17.

### Do not add, despite the pull

- **True crime**, the surging 2026 trivia category
  ([Cheap Trivia](https://cheaptrivia.com/blogs/trivia-talk/30-best-trivia-categories-for-bar-trivia)).
  Numerically fine, editorially impossible next to an all-ages promise and an
  existing body-count rule.
- **General knowledge / potpourri**, the fifth most common *Jeopardy!* category
  ([Fox News](https://www.foxnews.com/entertainment/jeopardys-top-10-most-common-categories)).
  It has no premise, no reveal card worth reading and no link out.
- **Music, film and celebrity as themselves.** Take them only in the history-of-X
  form, where the questions are years and receipts.

### The one non-category change that outranks all of the above

Populate the **`fame`** field. The engine grades facts `household` / `familiar` /
`obscure` and uses that grade to choose how far the shown number sits from the
truth; **all 280 shipping facts leave it blank and default to `familiar`**
**[repo: `src/game.js`, `data/facts/*.json`]**. No category decision in this
document will improve the felt quality of a round as much as one word per fact.

---

## Method note

Research was carried out via web search in August 2026. Direct page fetching was
blocked by the environment's egress proxy, so every external claim is sourced to
the linked page as surfaced and summarised in search results; load-bearing
figures were cross-checked against a second source where one was available.
Claims marked **[repo]** were measured directly against the files in this
repository and are exact. No files outside `review/` were modified.
