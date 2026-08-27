/* Give or Take -- question engine and UI.
   No model is called anywhere in this file. Every question is arithmetic on a
   stored fact: take the true value, step away from it by a fixed amount for the
   difficulty band, and ask which side of that number the truth falls on. */

(function () {
  'use strict';

  var DATA = window.GOT_DATA;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- storage ---------- */

  var LS = {
    get: function (k, dflt) {
      try { var v = localStorage.getItem('got.' + k); return v === null ? dflt : JSON.parse(v); }
      catch (e) { return dflt; }
    },
    set: function (k, v) {
      try { localStorage.setItem('got.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ }
    }
  };

  var best = LS.get('best', {});
  var research = LS.get('research', []);
  var curiosity = LS.get('curiosity', 0);
  var bank = LS.get('bank', 0);

  /* Points are never taken away for being wrong. The only way the bank goes
     down is a deliberate purchase. That rule is what separates this from a
     wagering game, and it matters more than any amount of renaming. */
  var ROOM_COST = 150;

  /* ---------- helpers ---------- */

  function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function randFloat(lo, hi) { return lo + Math.random() * (hi - lo); }
  function coin() { return Math.random() < 0.5; }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function fmtYear(v) {
    if (v < 0) return Math.abs(v) + ' BC';
    if (v < 1000) return 'AD ' + v;
    return String(v);
  }

  function fmtNum(fact, v) {
    var s = (fact.prefix || '') + Math.round(v).toLocaleString('en-US');
    return fact.unit ? s + ' ' + fact.unit : s;
  }

  function fmtValue(fact, v) {
    return fact.kind === 'year' ? fmtYear(v) : fmtNum(fact, v);
  }

  /* Round to two significant figures so a generated number looks chosen,
     not computed. 35,217 becomes 35,000. */
  function niceRound(v) {
    var a = Math.abs(v);
    if (a < 20) return Math.round(v);
    var mag = Math.pow(10, Math.floor(Math.log10(a)) - 1);
    return Math.round(v / mag) * mag;
  }

  function isNumeric(f) { return f.kind === 'year' || f.kind === 'number'; }
  function soften(band) { return band === 'hard' ? 'medium' : 'easy'; }

  var BAND_LABEL = { easy: 'Warming up', medium: 'Getting closer', hard: 'Tight margin' };
  var BAND_MULT = { easy: 1, medium: 1.5, hard: 2 };

  /* ---------- the number the player is shown ---------- */

  /* How widely known a fact already is. Absent means 'familiar'. */
  function fameOf(fact) {
    var f = fact.fame;
    return (f === 'household' || f === 'obscure') ? f : 'familiar';
  }

  /* How far down the list of nearby events to reach, as a proportion of the
     events actually available. Fixed positions do not work: rank 6 of 15 in
     the Revolution is a fair easy question, while rank 6 of 9 in Ancient Egypt
     is always the furthest thing in the file -- and "is Hatshepsut before
     30 BC?" is not a question, it is a formality. */
  var RANK = {
    household: { easy: [0.15, 0.30], medium: [0.05, 0.15], hard: [0, 0.05] },
    familiar:  { easy: [0.30, 0.55], medium: [0.12, 0.30], hard: [0, 0.12] },
    obscure:   { easy: [0.45, 0.80], medium: [0.25, 0.45], hard: [0.08, 0.25] }
  };

  /* Fallback distances, as multiples of the category's own median gap. */
  var SPREAD = {
    household: { easy: 1.5, medium: 0.8, hard: 0.4 },
    familiar:  { easy: 4, medium: 2, hard: 1 },
    obscure:   { easy: 8, medium: 4, hard: 2 }
  };

  /* Last-resort fixed offsets, for a category with too few year facts. */
  var FIXED = {
    household: { easy: [3, 6], medium: [2, 3], hard: [1, 1] },
    familiar:  { easy: [8, 30], medium: [3, 7], hard: [1, 2] },
    obscure:   { easy: [40, 150], medium: [12, 35], hard: [4, 10] }
  };

  /* Whole-unit steps for small counts, where a percentage is absurd. */
  var STEP = {
    household: { easy: [2, 4], medium: [1, 2], hard: [1, 1] },
    familiar:  { easy: [3, 7], medium: [2, 4], hard: [1, 2] },
    obscure:   { easy: [6, 14], medium: [3, 8], hard: [2, 4] }
  };

  /* Proportional bands for larger counts and quantities. */
  var FRACTION = {
    household: { easy: [0.25, 0.5], medium: [0.12, 0.2], hard: [0.05, 0.08] },
    familiar:  { easy: [0.6, 1.6], medium: [0.25, 0.5], hard: [0.08, 0.18] },
    obscure:   { easy: [1.2, 3], medium: [0.5, 1], hard: [0.2, 0.4] }
  };

  function medianGap(pool) {
    var ys = [], seen = {};
    for (var i = 0; i < pool.length; i++) {
      if (pool[i].kind !== 'year') continue;
      if (seen[pool[i].value]) continue;
      seen[pool[i].value] = 1;
      ys.push(pool[i].value);
    }
    if (ys.length < 3) return null;
    ys.sort(function (a, b) { return a - b; });
    var gaps = [];
    for (var j = 1; j < ys.length; j++) gaps.push(ys[j] - ys[j - 1]);
    gaps.sort(function (a, b) { return a - b; });
    var m = gaps[Math.floor(gaps.length / 2)];
    return m > 0 ? m : 1;
  }

  /* Neighbouring year facts, nearest first, one entry per distinct year.
     Facts already used in this round are pushed to the back rather than
     dropped, so a thin category still has something to measure against. */
  function neighbours(fact, pool, used) {
    var out = [], seen = {};
    for (var i = 0; i < pool.length; i++) {
      var o = pool[i];
      if (o.kind !== 'year' || o.id === fact.id || o.value === fact.value) continue;
      if (seen[o.value]) continue;
      seen[o.value] = 1;
      out.push({ fact: o, d: Math.abs(o.value - fact.value), spent: !!(used && used[o.id]) });
    }
    /* Distance decides the order and nothing else -- the rank windows below
       index this array as if it were monotonic in distance, so sorting spent
       facts to the back would silently widen the easy band as a round went on.
       Being spent only breaks a tie between two equally distant years. */
    out.sort(function (a, b) {
      if (a.d !== b.d) return a.d - b.d;
      return (a.spent ? 1 : 0) - (b.spent ? 1 : 0);
    });
    return out;
  }

  /* The number the player is shown, and the real event it came from.

     Difficulty used to be a fixed distance from the truth: easy meant 8 to 30
     years off. That is broken for anything famous. 1776 asked against 1806 is
     not a question -- everyone knows the Declaration came first. The probe
     that works is 1783, because people genuinely confuse the Treaty of Paris
     with the Constitution.

     So the probe is drawn from the dates of real neighbouring events in the
     same category, ranked by distance. The Revolution packs 15 events into 26
     years and yields tight questions on its own; Ancient Egypt spreads 9 across
     5,022 years and yields wide ones. The category tunes itself. `fame` is the
     override for the case that density gets wrong -- a household date sitting
     in a thin file, like the Titanic. */
  var TIGHTER = { easy: 'medium', medium: 'hard', hard: 'hard' };

  function probeFor(fact, band, pool, used, plausibleOnly) {
    var fame = fameOf(fact);
    var dir = coin() ? -1 : 1;
    var anchor = null;
    var p;

    /* A true/false statement has to be believable to be a question at all.
       "Champollion cracked hieroglyphs in 1274 BC" is not a hard question,
       it is a free point -- so those get a tighter window and a hard ceiling
       on how far the anchor may sit from the truth. */
    var useBand = plausibleOnly ? TIGHTER[band] : band;

    if (fact.kind === 'year' && pool) {
      var near = neighbours(fact, pool, used);

      /* Ancient Egypt is not one spread of dates, it is two: the pharaohs,
         then the archaeologists who dug them up three thousand years later.
         Reaching across that chasm produces "was Hatshepsut before 1822?",
         which nobody has to think about. So the probe is capped -- relative
         both to how tightly the category clusters and to how isolated this
         particular fact is. */
      if (near.length) {
        /* The ceiling is measured from this fact's own close neighbours, not
           from the whole file. Ancient Egypt's median gap is inflated by the
           three-thousand-year chasm between the pharaohs and the archaeologists
           who dug them up, so a file-wide median licensed exactly the jump it
           was meant to forbid. */
        var localGap = near[0].d || 3;
        var ceiling = plausibleOnly
          ? Math.max(5, localGap * 3)
          : Math.max(10, localGap * 6);
        var kept = near.filter(function (n) { return n.d <= ceiling; });
        if (kept.length) near = kept;
      }

      /* Choose the side FIRST, then find a probe on it. Picking the nearest
         neighbour and accepting whichever side it fell on left 29% of year
         facts with a single possible answer: the Titanic sank in 1912 and its
         only near neighbour is 1911, so "After" was correct every single time
         it was ever asked. */
      var wantLater = coin();
      var side = near.filter(function (n) {
        return wantLater ? n.fact.value > fact.value : n.fact.value < fact.value;
      });

      if (side.length) {
        var win = RANK[fame][useBand];
        var last = side.length - 1;
        var lo = Math.min(last, Math.round(win[0] * last));
        var hi = Math.min(last, Math.round(win[1] * last));
        /* Never let a window collapse onto one candidate: in a thin category
           the hard band rounded to a single index, so the question was
           identical every time and memorised after one exposure. */
        if (hi <= lo && last > 0) hi = Math.min(last, lo + 1);
        anchor = side[randInt(lo, Math.max(lo, hi))].fact;
        p = anchor.value;
      } else {
        /* Nothing real on the side we wanted -- a fact at the end of its
           timeline. Compute one rather than flipping to the only side that
           has neighbours, which is what made the answer constant. */
        /* Mirror the nearest real neighbour rather than reaching by the
           usual multiple. At the edge of a timeline there is nothing to
           measure against, and four times the gap put the founding of Rome
           against 2461 BC -- a date with no meaning to anyone. */
        var unit = near.length ? near[0].d : (medianGap(pool) || 3);
        var EDGE = { easy: 1.2, medium: 0.8, hard: 0.4 };
        var reach = Math.max(1, Math.round(unit * EDGE[useBand]));
        p = fact.value + (wantLater ? reach : -reach);
      }
      if (p === undefined) {
        var gap = medianGap(pool);
        if (gap) {
          p = fact.value + dir * Math.max(1, Math.round(gap * SPREAD[fame][useBand]));
        } else {
          var fx = FIXED[fame][useBand];
          p = fact.value + dir * randInt(fx[0], fx[1]);
        }
      }
    } else if (fact.kind === 'year') {
      var fx2 = FIXED[fame][useBand];
      p = fact.value + dir * randInt(fx2[0], fx2[1]);
    } else {
      /* A proportional band is meaningless on a small count. Sixty percent
         either side of thirteen colonies asks "more or fewer than 3?", which
         is not a question -- it is a formality with a number in it. Under
         thirty, step by whole units instead. */
      if (Math.abs(fact.value) <= 30) {
        var step = STEP[fame][useBand];
        /* The step also has to stay small relative to the value itself.
           Rome's seven hills stepped by five and asked "more or fewer than
           two?", which nobody has to think about -- the phrase IS the fact. */
        var cap = Math.max(1, Math.round(Math.abs(fact.value) *
          (useBand === 'easy' ? 0.45 : useBand === 'medium' ? 0.25 : 0.15)));
        var lo2 = Math.min(step[0], cap);
        p = fact.value + dir * randInt(lo2, Math.max(lo2, Math.min(step[1], cap)));
        if (p <= 0) p = fact.value + randInt(lo2, Math.max(lo2, Math.min(step[1], cap)));
      } else {
        var fr = FRACTION[fame][useBand];
        var frac = randFloat(fr[0], fr[1]);
        /* Downward, a fraction at or above 1 lands on zero and the guard
           below then flips the direction it was meant to preserve. */
        if (dir < 0) frac = Math.min(frac, 0.8);
        p = niceRound(fact.value * (1 + dir * frac));
      }
    }

    /* Units carry limits the arithmetic does not know about. "Percentage of
       first-class women who survived: 230 percent, more or fewer?" was a live
       question. */
    if (fact.kind === 'number' && /percent|%/i.test(fact.unit || '') && p > 100) {
      p = fact.value + Math.round((100 - fact.value) * randFloat(0.35, 0.9));
      if (p === fact.value) p = Math.max(1, fact.value - randInt(3, 12));
    }

    if (p === fact.value || (fact.kind === 'number' && p <= 0)) {
      anchor = null;
      var bump = Math.max(1, Math.round(Math.abs(fact.value) * 0.12));
      p = fact.value + (dir < 0 ? -bump : bump);
      if (fact.kind === 'number' && p <= 0) p = fact.value + bump;
    }
    return { value: p, anchor: anchor };
  }

  /* ---------- question builders ---------- */

  function makeOverUnder(fact, band, mode, pool, used) {
    var got = probeFor(fact, band, pool, used);
    var probe = got.value;
    var isYear = fact.kind === 'year';
    var shown = fmtValue(fact, probe);
    return {
      mode: mode || 'overunder',
      band: band,
      facts: [fact],
      fact: fact,
      stem: fact.claim + '.',
      big: shown,
      ask: isYear ? 'Before or after?' : 'More or fewer?',
      options: isYear
        ? [{ key: 'under', label: 'Before', cls: 'under' }, { key: 'over', label: 'After', cls: 'over' }]
        : [{ key: 'under', label: 'Fewer', cls: 'under' }, { key: 'over', label: 'More', cls: 'over' }],
      correct: fact.value > probe ? 'over' : 'under',
      anchor: got.anchor,
      base: 100
    };
  }

  function makeTrueFalse(fact, band, pool, used) {
    var statement, truth, anchor = null;

    if (fact.kind === 'boolean') {
      statement = fact.claim + '.';
      truth = fact.answer;
    } else {
      truth = coin();
      var shown = fact.value;
      if (!truth) {
        var got = probeFor(fact, band, pool, used, true);
        shown = got.value;
        anchor = got.anchor;
      }
      statement = fact.kind === 'year'
        ? fact.claim + ' in ' + fmtYear(shown) + '.'
        : fact.claim + ': ' + fmtNum(fact, shown) + '.';
      truth = (shown === fact.value);
      if (truth) anchor = null;
    }

    return {
      mode: 'truefalse',
      band: band,
      facts: [fact],
      fact: fact,
      stem: statement,
      big: null,
      ask: 'True or false?',
      options: [{ key: 'true', label: 'True', cls: 'over' }, { key: 'false', label: 'False', cls: 'under' }],
      correct: truth ? 'true' : 'false',
      anchor: anchor,
      base: 100
    };
  }

  function makeOrder(band, pool, used) {
    /* Ten years apart is a gentle question in the Revolution and a
       meaningless one in Ancient Egypt, so scale it to the category. */
    var unit = medianGap(pool) || 3;
    var gap = Math.max(1, Math.round(unit * (band === 'easy' ? 3 : band === 'medium' ? 1.5 : 0.5)));
    var years = pool.filter(function (f) { return f.kind === 'year' && !used[f.id]; });
    for (var i = 0; i < years.length; i++) {
      for (var j = i + 1; j < years.length; j++) {
        if (Math.abs(years[i].value - years[j].value) >= gap) {
          var a = years[i], b = years[j];
          var pair = coin() ? [a, b] : [b, a];
          var earlier = a.value < b.value ? a : b;
          return {
            mode: 'order',
            band: band,
            facts: pair,
            fact: earlier,
            stem: 'Which of these happened first?',
            big: null,
            ask: 'Pick one',
            options: [
              { key: pair[0].id, label: pair[0].claim, cls: 'claim' },
              { key: pair[1].id, label: pair[1].claim, cls: 'claim' }
            ],
            stack: true,
            correct: earlier.id,
            base: 120
          };
        }
      }
    }
    return null;
  }

  /* ---------- round assembly ---------- */

  var PLAN = [
    { mode: 'overunder', band: 'easy' },
    { mode: 'truefalse', band: 'easy' },
    { mode: 'overunder', band: 'easy' },
    { mode: 'truefalse', band: 'medium' },
    { mode: 'overunder', band: 'medium' },
    { mode: 'truefalse', band: 'medium' },
    { mode: 'order', band: 'medium' },
    { mode: 'overunder', band: 'hard' },
    { mode: 'truefalse', band: 'hard' },
    { mode: 'overunder', band: 'hard' }
  ];

  function firstFree(pool, used, pred) {
    for (var i = 0; i < pool.length; i++) {
      if (!used[pool[i].id] && pred(pool[i])) return pool[i];
    }
    return null;
  }

  function tryMake(mode, band, pool, used, opening) {
    var f;
    /* Tone rule: a body count is never one of the three questions that open a
       round. Casualty facts are asked plainly, in the middle of a round, and
       never used as the light opening the game leads with. */
    var ok = function (x) { return !(opening && x.sensitive); };

    if (mode === 'order') return makeOrder(band, pool, used);

    if (mode === 'truefalse') {
      /* Weighted rather than strict, so the same handful of boolean facts do
         not turn up in every single round of a category. */
      var boolFirst = Math.random() < 0.6;
      var asBool = function (x) { return x.kind === 'boolean' && ok(x); };
      var asNum = function (x) { return isNumeric(x) && ok(x); };
      f = boolFirst
        ? (firstFree(pool, used, asBool) || firstFree(pool, used, asNum))
        : (firstFree(pool, used, asNum) || firstFree(pool, used, asBool));
      return f ? makeTrueFalse(f, band, pool, used) : null;
    }

    f = firstFree(pool, used, function (x) { return isNumeric(x) && ok(x); });
    return f ? makeOverUnder(f, band, null, pool, used) : null;
  }

  function buildRound(catId, gentle) {
    var pool = shuffle(DATA.facts[catId].slice());
    var used = {};
    var qs = [];

    for (var i = 0; i < PLAN.length; i++) {
      var band = gentle ? soften(PLAN[i].band) : PLAN[i].band;
      var opening = i < 3;
      var q = tryMake(PLAN[i].mode, band, pool, used, opening)
           || tryMake('truefalse', band, pool, used, opening)
           || tryMake('overunder', band, pool, used, opening);
      if (!q) continue;
      q.facts.forEach(function (f) { used[f.id] = true; });
      qs.push(q);
    }

    return { catId: catId, questions: qs, i: 0, score: 0, streak: 0, results: [], continued: false, multi: false };
  }

  /* Blocks are what a table plays: one period, one question each. Same
     generator as a solo round, just a different number of slots. */
  function buildBlock(catId, n, usedGlobal, gentle) {
    var pool = shuffle(DATA.facts[catId].slice());
    var used = {};
    Object.keys(usedGlobal).forEach(function (k) { used[k] = true; });

    var modes = [];
    for (var i = 0; i < n; i++) modes.push(i % 2 === 0 ? 'overunder' : 'truefalse');
    if (n >= 4) modes[Math.floor(n / 2)] = 'order';

    var qs = [];
    for (var j = 0; j < n; j++) {
      var band = j < Math.ceil(n / 3) ? 'easy' : j < Math.ceil(n * 2 / 3) ? 'medium' : 'hard';
      if (gentle) band = soften(band);
      var q = tryMake(modes[j], band, pool, used, j === 0)
           || tryMake('truefalse', band, pool, used, j === 0)
           || tryMake('overunder', band, pool, used, j === 0);
      if (!q) continue;
      q.facts.forEach(function (f) { used[f.id] = true; usedGlobal[f.id] = true; });
      qs.push(q);
    }
    return qs;
  }

  /* ---------- state ---------- */

  var R = null;   /* the questions in play right now */
  var M = null;   /* the table, when more than one person is playing */
  var answered = false;

  /* Each question is worth this before the band and block multipliers. A player
     commits a share of the question's value, never a share of their score -- so
     a bad call costs the question, never the game. */
  var Q_BASE = 200;

  /* Everyone starts with this. It never changes the rankings, since everyone
     gets it, but it guarantees that a player who has had a rotten game still
     has something to wager on the final question. Without it their comeback
     does not exist. */
  var Q_START = 200;

  /* 25 / 50 / 100. Three targets are easier to hit than four on a phone, and
     dropping 75 rather than 100 keeps the button that takes the whole question
     -- which is the one worth having. It also keeps every figure round: a
     medium question at 75% would read 225. */
  var STAKES = [0.25, 0.5, 1];

  function show(name) {
    ['home', 'setup', 'pick', 'handoff', 'play', 'standings', 'results', 'research'].forEach(function (s) {
      $('screen-' + s).classList.toggle('on', s === name);
    });
  }

  /* ---------- home ---------- */

  function categoryCard(c, onPick) {
    var n = (DATA.facts[c.id] || []).length;
    var b = best[c.id];
    var el = document.createElement('button');
    el.className = 'cat';
    el.type = 'button';
    el.innerHTML =
      '<span class="cat-era">' + (c.when || c.era) + '</span>' +
      '<span class="cat-title">' + c.title + '</span>' +
      '<span class="cat-blurb">' + c.blurb + '</span>' +
      '<span class="cat-meta"><span>' + n + ' facts</span>' +
      (b ? '<span>best <b>' + b.toLocaleString('en-US') + '</b></span>' : '<span>not played</span>') +
      '</span>';
    el.addEventListener('click', function () { onPick(c.id); });
    return el;
  }

  function renderHome() {
    $('res-count').textContent = String(research.length);
    $('bank').textContent = bank.toLocaleString('en-US') + ' points banked';
    $('gentle').checked = !!LS.get('gentle', false);
  }

  /* Grouped by era in the order data/categories.json lists them, so that file
     controls both grouping and sequence. A flat list stops being browsable
     somewhere around a dozen entries, and the plan runs to a hundred. */
  function renderPick(heading, sub, onPick) {
    var order = [];
    var groups = {};
    DATA.categories.forEach(function (c) {
      if (!groups[c.era]) { groups[c.era] = []; order.push(c.era); }
      groups[c.era].push(c);
    });

    var body = $('pick-body');
    body.innerHTML =
      '<div class="home-head">' +
        '<p class="kicker">' + sub + '</p>' +
        '<h1 class="wordmark" style="font-size:2.4rem">' + heading + '</h1>' +
      '</div>' +
      '<div class="cats" id="pick-cats"></div>' +
      '<button class="ans wide" id="pick-back" type="button">Back</button>';

    var wrap = $('pick-cats');
    order.forEach(function (era) {
      var h = document.createElement('h2');
      h.className = 'era-head';
      h.textContent = era;
      wrap.appendChild(h);
      groups[era].forEach(function (c) { wrap.appendChild(categoryCard(c, onPick)); });
    });

    $('pick-back').addEventListener('click', goHome);
    show('pick');
    body.scrollTop = 0;
  }

  /* ---------- the table ---------- */

  function renderSetup() {
    var saved = LS.get('players', ['', '']);
    var names = saved.length >= 2 ? saved.slice(0, 6) : ['', ''];

    function draw() {
      var body = $('setup-body');
      body.innerHTML =
        '<div class="home-head">' +
          '<p class="kicker">Two to six players, one phone</p>' +
          '<h1 class="wordmark" style="font-size:2.4rem">Who is playing?</h1>' +
          '<p class="tagline">Everyone gets to choose a period, and everyone answers the same number of questions.</p>' +
        '</div>' +
        '<div class="players" id="players"></div>' +
        '<button class="ans wide" id="add-player" type="button">Add another player</button>' +
        '<button class="next-btn" id="start-table" type="button">Start</button>' +
        '<button class="ans wide" id="setup-back" type="button">Back</button>';

      var list = $('players');
      names.forEach(function (nm, i) {
        var row = document.createElement('div');
        row.className = 'player-row';
        row.innerHTML =
          '<span class="player-n">' + (i + 1) + '</span>' +
          '<input class="name-input" type="text" maxlength="14" placeholder="Name" ' +
            'autocomplete="off" autocapitalize="words" value="' + nm.replace(/"/g, '&quot;') + '">' +
          (names.length > 2 ? '<button class="drop-btn" type="button" aria-label="Remove player">&times;</button>' : '<span></span>');
        var input = row.querySelector('input');
        input.addEventListener('input', function () { names[i] = input.value; });
        var drop = row.querySelector('.drop-btn');
        if (drop) drop.addEventListener('click', function () { names.splice(i, 1); draw(); });
        list.appendChild(row);
      });

      $('add-player').disabled = names.length >= 6;
      $('add-player').addEventListener('click', function () {
        if (names.length < 6) { names.push(''); draw(); }
      });
      $('setup-back').addEventListener('click', goHome);
      $('start-table').addEventListener('click', function () {
        var clean = names.map(function (n, i) { return (n || '').trim() || ('Player ' + (i + 1)); });
        if (clean.length < 2) return;
        LS.set('players', clean);
        startTable(clean);
      });
    }

    draw();
    show('setup');
    $('setup-body').scrollTop = 0;
  }

  function startTable(names) {
    var n = names.length;
    M = {
      players: names.map(function (nm) { return { name: nm, score: Q_START }; }),
      blocks: Math.min(n, 4),          /* one block each, capped so a big table still ends */
      blockLen: Math.max(4, n),        /* at least four questions, or one per player */
      block: 0,
      used: {},
      facts: [],
      stakePct: 0.5
    };
    beginBlock();
  }

  function whoseTurn(i) {
    /* The starting player shifts each block, so nobody always answers first. */
    return M.players[(M.block + i) % M.players.length];
  }

  function beginBlock() {
    var picker = M.players[M.block % M.players.length];
    renderPick(picker.name + ', choose a period',
      'Block ' + (M.block + 1) + ' of ' + M.blocks,
      function (catId) {
        R = {
          catId: catId,
          questions: buildBlock(catId, M.blockLen, M.used, !!$('gentle').checked),
          i: 0, score: 0, streak: 0, results: [], multi: true
        };
        handoff();
      });
  }

  function handoff() {
    var p = whoseTurn(R.i);
    var cat = DATA.categories.filter(function (c) { return c.id === R.catId; })[0];
    $('handoff-body').innerHTML =
      '<p class="kicker">Question ' + (R.i + 1) + ' of ' + R.questions.length +
        ' &middot; ' + cat.title +
        (blockMultiplier() > 1 ? ' &middot; double points' : '') + '</p>' +
      '<div class="handoff-to">' + p.name + '</div>' +
      '<p class="handoff-sub">Pass the phone along, then tap when you have it.</p>' +
      '<button class="next-btn" id="take-turn" type="button">I&rsquo;m ready</button>';
    show('handoff');
    $('take-turn').addEventListener('click', function () {
      M.stakePct = 0.5;
      show('play');
      renderQuestion();
    });
    $('take-turn').focus();
  }

  function isLastOfGame() {
    return M && M.block === M.blocks - 1 && R.i === R.questions.length - 1;
  }

  /* The back half of the game is worth double, which is Double Jeopardy and it
     is there for the same reason: a bad opening block should not settle the
     evening, and whoever is behind at the turn needs a real route back. */
  function blockMultiplier() { return M.block >= Math.ceil(M.blocks / 2) ? 2 : 1; }

  function questionValue(q) {
    return Math.round(Q_BASE * BAND_MULT[q.band] * blockMultiplier());
  }

  function endBlock() {
    M.facts = M.facts.concat(R.results.map(function (r) { return r.q.fact; }));
    M.block += 1;
    if (M.block >= M.blocks) { renderFinal(); return; }
    renderStandings();
  }

  function standingsList() {
    var ranked = M.players.slice().sort(function (a, b) { return b.score - a.score; });
    var top = ranked[0].score;
    return '<ul class="standings">' + ranked.map(function (p, i) {
      return '<li class="' + (p.score === top && top > 0 ? 'lead' : '') + '">' +
        '<span class="pos">' + (i + 1) + '</span>' +
        '<span class="who">' + p.name + '</span>' +
        '<span class="pts">' + p.score.toLocaleString('en-US') + '</span></li>';
    }).join('') + '</ul>';
  }

  function factRoll(facts) {
    return '<ul class="rlist">' + facts.map(function (f) {
      var val = f.kind === 'boolean'
        ? (f.answer ? 'True statement' : 'False statement')
        : fmtValue(f, f.value);
      return '<li><span class="mark part">&middot;</span>' +
        '<span class="rc"><span>' + f.claim + '</span><span class="rv">' + val + '</span></span>' +
        '<a href="' + f.source.url + '" target="_blank" rel="noopener">source</a></li>';
    }).join('') + '</ul>';
  }

  function renderStandings() {
    var next = M.players[M.block % M.players.length];
    $('standings-body').innerHTML =
      '<div class="home-head">' +
        '<p class="kicker">Block ' + M.block + ' of ' + M.blocks + ' done</p>' +
        '<h1 class="wordmark" style="font-size:2.4rem">Standings</h1>' +
      '</div>' +
      standingsList() +
      '<h2 class="sec">What that block turned up</h2>' +
      factRoll(R.results.map(function (r) { return r.q.fact; })) +
      '<button class="next-btn" id="next-block" type="button">' + next.name + ' picks next</button>' +
      '<button class="ans wide" id="stand-quit" type="button">Stop here</button>';
    show('standings');
    $('standings-body').scrollTop = 0;
    $('next-block').addEventListener('click', beginBlock);
    $('stand-quit').addEventListener('click', renderFinal);
  }

  function renderFinal() {
    var ranked = M.players.slice().sort(function (a, b) { return b.score - a.score; });
    var facts = M.facts.concat(R && R.results ? R.results.map(function (r) { return r.q.fact; }) : []);
    var seen = {}, unique = [];
    facts.forEach(function (f) { if (f && !seen[f.id]) { seen[f.id] = 1; unique.push(f); } });

    $('results-body').innerHTML =
      '<div class="home-head">' +
        '<p class="kicker">Game over</p>' +
        '<h1 class="wordmark" style="font-size:2.6rem">' + ranked[0].name + ' wins</h1>' +
      '</div>' +
      standingsList() +
      '<h2 class="sec">Everything the table met</h2>' +
      factRoll(unique) +
      '<div class="stack">' +
        '<button class="next-btn" id="again-table" type="button">Play again</button>' +
        '<button class="ans wide" id="home-btn" type="button">Back to the start</button>' +
      '</div>';
    show('results');
    $('results-body').scrollTop = 0;
    $('again-table').addEventListener('click', function () {
      startTable(M.players.map(function (p) { return p.name; }));
    });
    $('home-btn').addEventListener('click', goHome);
  }

  /* ---------- play ---------- */

  function startRound(catId) {
    M = null;
    R = buildRound(catId, !!$('gentle').checked);
    answered = false;
    show('play');
    renderQuestion();
  }

  function renderDots() {
    var d = $('dots');
    d.innerHTML = '';
    for (var i = 0; i < R.questions.length; i++) {
      var s = document.createElement('span');
      s.className = 'dot';
      var r = R.results[i];
      if (r) s.className += r.grade === 'good' ? ' hit' : ' miss';
      else if (i === R.i) s.className += ' now';
      d.appendChild(s);
    }
  }

  function renderQuestion() {
    var q = R.questions[R.i];
    answered = false;

    renderDots();

    if (R.multi) {
      var me = whoseTurn(R.i);
      $('score').textContent = me.score.toLocaleString('en-US');
      $('band').textContent = me.name + ' \u00b7 ' +
        (isLastOfGame() ? 'Last question of the game' : BAND_LABEL[q.band]);
    } else {
      $('score').textContent = R.score.toLocaleString('en-US');
      $('band').textContent = q.eased ? 'With more room'
        : R.i === R.questions.length - 1 ? 'Last one'
        : BAND_LABEL[q.band];
    }
    $('stem').textContent = q.stem;

    var big = $('big');
    if (q.big) {
      big.hidden = false;
      big.textContent = q.big;
      big.classList.toggle('small', q.big.length > 9);
    } else {
      big.hidden = true;
    }

    $('ask').textContent = q.ask;

    renderActions(q);
  }

  function renderActions(q) {
    var a = $('actions');
    a.innerHTML = '';

    /* A stake is a share of the question, not of your score, so a bad call
       costs you the question and never the game. The one exception is the very
       last question, where an all-in has nothing after it to spoil. */
    if (R.multi) {
      var me = whoseTurn(R.i);
      var last = isLastOfGame();
      var pool = last ? me.score : questionValue(q);

      var lab = document.createElement('p');
      lab.className = 'stake-label';
      lab.textContent = last
        ? 'All or nothing \u2014 how much of your ' + me.score.toLocaleString('en-US') + ' rides on this?'
        : 'How much of this question do you want?';
      a.appendChild(lab);

      var stakes = document.createElement('div');
      stakes.className = 'stakes';
      STAKES.forEach(function (pct) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'stake' + (M.stakePct === pct ? ' on' : '');
        b.innerHTML = (pct * 100) + '%<br>' + Math.round(pool * pct).toLocaleString('en-US');
        b.addEventListener('click', function () { M.stakePct = pct; renderActions(q); });
        stakes.appendChild(b);
      });
      a.appendChild(stakes);
    }

    var container = document.createElement('div');
    container.className = q.stack ? 'stack' : 'row';
    q.options.forEach(function (o) {
      var b = document.createElement('button');
      b.className = 'ans ' + (o.cls || '');
      b.type = 'button';
      b.textContent = o.label;
      b.addEventListener('click', function () { answer(o.key); });
      container.appendChild(b);
    });
    a.appendChild(container);

    /* A hint bought before committing, never a second guess afterwards. On a
       two-answer question a retry would simply hand over the answer, so the
       only honest help is more room: push the number further from the truth.
       The question gets easier and is worth correspondingly less. */
    if (!R.multi && q.mode === 'overunder' && !q.eased && q.band !== 'easy') {
      var room = document.createElement('button');
      room.className = 'room-btn';
      room.type = 'button';
      room.textContent = 'Give me more room \u00b7 ' + ROOM_COST + ' pts';
      room.disabled = bank < ROOM_COST;
      room.addEventListener('click', giveRoom);
      a.appendChild(room);
    }
  }

  function giveRoom() {
    var q = R.questions[R.i];
    if (q.eased || bank < ROOM_COST) return;
    bank -= ROOM_COST;
    LS.set('bank', bank);
    var nq = makeOverUnder(q.fact, q.band === 'hard' ? 'medium' : 'easy');
    nq.eased = true;
    R.questions[R.i] = nq;
    renderQuestion();
  }

  /* ---------- answering ---------- */

  function answer(given) {
    if (answered) return;
    answered = true;

    var q = R.questions[R.i];
    var correct = (given === q.correct);
    var grade = correct ? 'good' : 'bad';

    if (R.multi) {
      var me = whoseTurn(R.i);
      var last = isLastOfGame();
      var stake = Math.round((last ? me.score : questionValue(q)) * M.stakePct);
      var delta = correct ? stake : (last ? -stake : 0);
      me.score = Math.max(0, me.score + delta);
      R.results[R.i] = { grade: grade, earned: delta, given: given, q: q, who: me.name };
      $('score').textContent = me.score.toLocaleString('en-US');
      renderDots();
      openSheet(q, R.results[R.i], 0);
      return;
    }

    var earned = correct ? Math.round(q.base * BAND_MULT[q.band]) : 0;

    /* Streaks: quietly awarded on a sensitive fact, never celebrated. */
    R.streak = correct ? R.streak + 1 : 0;
    var bonus = (correct && R.streak > 2) ? Math.min(100, 25 * (R.streak - 2)) : 0;
    earned += bonus;

    R.score = R.score + earned;
    R.results[R.i] = { grade: grade, earned: earned, given: given, q: q };

    $('score').textContent = R.score.toLocaleString('en-US');
    renderDots();
    openSheet(q, R.results[R.i], bonus);
  }

  /* ---------- reveal ---------- */

  function isSaved(id) {
    return research.some(function (r) { return r.id === id; });
  }

  function openSheet(q, res, bonus) {
    var sheet = $('sheet');
    var f = q.fact;
    var verdictText = (res.who ? res.who + ' \u2014 ' : '') +
      (res.grade === 'good' ? 'Correct' : 'Not this time');

    var ptsText = (res.earned >= 0 ? '+' : '') + res.earned.toLocaleString('en-US');

    var truthVal;
    if (q.mode === 'order') {
      truthVal = fmtYear(q.facts[0].value) + ' &middot; ' + fmtYear(q.facts[1].value);
    } else if (q.kind === 'boolean' || f.kind === 'boolean') {
      truthVal = f.answer ? 'True' : 'False';
    } else {
      truthVal = fmtValue(f, f.value);
    }

    var claimLine = q.mode === 'order'
      ? q.facts[0].claim + ' &mdash; then &mdash; ' + q.facts[1].claim
      : f.claim;

    var html =
      '<div class="verdict ' + res.grade + '">' +
        '<span>' + verdictText +
          (bonus && !f.sensitive ? ' &middot; ' + R.streak + ' in a row' : '') +
        '</span>' +
        '<span class="pts">' + ptsText + '</span>' +
      '</div>' +
      '<div class="truth">' +
        '<span class="truth-claim">' + claimLine + '</span>' +
        '<span class="truth-val">' + truthVal + '</span>' +
      '</div>' +
      '<p class="context">' + f.context + '</p>' +
      /* When the number shown was a real event rather than a generated offset,
         say so. The player learns the fact they were measured against too. */
      (q.anchor
        ? '<p class="anchor">The year you were weighed against, <b>' +
            fmtYear(q.anchor.value) + '</b>: ' + q.anchor.claim + '.</p>'
        : '') +
      (f.goDeeper ? '<p class="deeper"><b>Go deeper</b>' + f.goDeeper + '</p>' : '') +
      '<div class="sheet-links">' +
        '<a href="' + f.source.url + '" target="_blank" rel="noopener">Read the source</a>' +
        '<button class="save-btn' + (isSaved(f.id) ? ' saved' : '') + '" id="save-fact" type="button">' +
          (isSaved(f.id) ? 'Saved &#9733;' : 'Save to list') +
        '</button>' +
      '</div>' +
      '<button class="next-btn" id="next" type="button">' +
        (R.i !== R.questions.length - 1
          ? (R.multi ? 'Next player' : 'Next question')
          : (R.multi ? 'See the standings' : 'See your round')) +
      '</button>' +
      '<p class="draft-flag">Unreviewed draft &middot; ' + f.source.title + '</p>';

    sheet.innerHTML = html;
    sheet.hidden = false;
    $('sheet-back').hidden = false;

    $('save-fact').addEventListener('click', function () {
      if (isSaved(f.id)) return;
      research.push({
        id: f.id, claim: f.claim,
        value: q.mode === 'order' ? ''
          : f.kind === 'boolean' ? (f.answer ? 'True statement' : 'False statement')
          : fmtValue(f, f.value),
        source: f.source, cat: R.catId
      });
      curiosity += 1;
      LS.set('research', research);
      LS.set('curiosity', curiosity);
      var b = $('save-fact');
      b.className = 'save-btn saved';
      b.innerHTML = 'Saved &#9733;';
      $('res-count').textContent = String(research.length);
    });

    $('next').addEventListener('click', nextQuestion);
    $('next').focus();
  }

  function closeSheet() {
    $('sheet').hidden = true;
    $('sheet-back').hidden = true;
  }

  function nextQuestion() {
    closeSheet();

    if (R.multi) {
      if (R.i === R.questions.length - 1) { endBlock(); return; }
      R.i += 1;
      handoff();
      return;
    }

    if (R.i === R.questions.length - 1) { renderResults(); return; }
    if (R.i === 4 && !R.continued) { openBreak(); return; }
    R.i += 1;
    renderQuestion();
  }

  function bumpPull(key) {
    var p = LS.get('pull', { yes: 0, no: 0 });
    p[key] += 1;
    LS.set('pull', p);
  }

  /* Halfway. Whether people choose to carry on is the most informative single
     thing this prototype can report, so it is asked out loud and counted. */
  function openBreak() {
    var sheet = $('sheet');
    sheet.innerHTML =
      '<div class="verdict"><span>Five down</span>' +
      '<span class="pts">' + R.score.toLocaleString('en-US') + '</span></div>' +
      '<p class="context">Five more in this period, and the margins get tighter. ' +
      'Or stop here &mdash; everything you have scored is already yours.</p>' +
      '<button class="next-btn" id="go-on" type="button">Five more</button>' +
      '<button class="ans wide" id="stop-here" type="button">Stop here</button>';
    sheet.hidden = false;
    $('sheet-back').hidden = false;
    $('go-on').addEventListener('click', function () {
      R.continued = true;
      bumpPull('yes');
      closeSheet();
      R.i += 1;
      renderQuestion();
    });
    $('stop-here').addEventListener('click', function () {
      bumpPull('no');
      closeSheet();
      renderResults();
    });
    $('go-on').focus();
  }

  /* ---------- results ---------- */

  function renderResults() {
    var hits = R.results.filter(function (r) { return r.grade === 'good'; }).length;
    bank += R.score;
    LS.set('bank', bank);
    var prev = best[R.catId] || 0;
    var beaten = R.score > prev;
    if (beaten) { best[R.catId] = R.score; LS.set('best', best); }

    var cat = DATA.categories.filter(function (c) { return c.id === R.catId; })[0];

    var html =
      '<div class="res-head">' +
        '<p class="kicker">' + cat.title + '</p>' +
        '<div class="res-score">' + R.score.toLocaleString('en-US') + '</div>' +
        '<p class="res-sub">' + hits + ' of ' + R.results.length + ' right</p>' +
        (beaten
          ? '<p class="res-best">New best for this period.</p>'
          : '<p class="res-sub">Best ' + prev.toLocaleString('en-US') + '</p>') +
      '</div>' +
      '<h2 class="sec">Everything you just met</h2>' +
      '<ul class="rlist">' +
        R.results.map(function (r) {
          var f = r.q.fact;
          var mark = r.grade === 'good' ? '&#10003;' : '&#10007;';
          var val = f.kind === 'boolean'
            ? (f.answer ? 'True statement' : 'False statement')
            : fmtValue(f, f.value);
          return '<li>' +
            '<span class="mark ' + r.grade + '">' + mark + '</span>' +
            '<span class="rc"><span>' + f.claim + '</span>' +
              '<span class="rv">' + val + '</span></span>' +
            '<a href="' + f.source.url + '" target="_blank" rel="noopener">source</a>' +
          '</li>';
        }).join('') +
      '</ul>' +
      '<div class="stack">' +
        '<button class="next-btn" id="again" type="button">Play this period again</button>' +
        '<button class="ans wide" id="home-btn" type="button">Choose another period</button>' +
      '</div>';

    $('results-body').innerHTML = html;
    show('results');
    $('results-body').scrollTop = 0;
    $('again').addEventListener('click', function () { startRound(R.catId); });
    $('home-btn').addEventListener('click', goHome);
  }

  /* ---------- research list ---------- */

  function renderResearch() {
    var html =
      '<div class="home-head">' +
        '<p class="kicker">Curiosity ' + curiosity + '</p>' +
        '<h1 class="wordmark" style="font-size:2.4rem">Research list</h1>' +
        '<p class="tagline">The facts that caught you, with somewhere to read more.</p>' +
      '</div>';

    if (!research.length) {
      html += '<p class="res-empty">Nothing saved yet. Tap &ldquo;Save to list&rdquo; on any question you want to come back to.</p>';
    } else {
      html += '<ul class="rlist">' + research.map(function (r) {
        return '<li><span class="mark part">&#9733;</span>' +
          '<span class="rc"><span>' + r.claim + '</span><span class="rv">' + r.value + '</span></span>' +
          '<a href="' + r.source.url + '" target="_blank" rel="noopener">read</a></li>';
      }).join('') + '</ul>';
      html += '<button class="ans wide" id="clear-res" type="button">Clear the list</button>';
    }

    html += '<button class="next-btn" id="back-home" type="button">Back</button>';
    $('research-body').innerHTML = html;
    show('research');
    $('research-body').scrollTop = 0;

    if (research.length) {
      $('clear-res').addEventListener('click', function () {
        research = [];
        LS.set('research', research);
        $('res-count').textContent = '0';
        renderResearch();
      });
    }
    $('back-home').addEventListener('click', goHome);
  }

  function goHome() {
    closeSheet();
    M = null;
    renderHome();
    show('home');
  }

  /* ---------- wiring ---------- */

  $('quit').addEventListener('click', goHome);
  $('open-research').addEventListener('click', renderResearch);
  $('mode-solo').addEventListener('click', function () {
    renderPick('Choose a period', 'Playing on your own', startRound);
  });
  $('mode-together').addEventListener('click', renderSetup);
  $('gentle').addEventListener('change', function () { LS.set('gentle', $('gentle').checked); });

  document.addEventListener('keydown', function (e) {
    if ($('sheet').hidden === false) {
      if ((e.key === 'Enter' || e.key === ' ') && $('next')) { e.preventDefault(); nextQuestion(); }
      return;
    }
    if (!$('screen-play').classList.contains('on') || answered) return;
    var q = R && R.questions[R.i];
    if (!q) return;
    if (e.key === '1') answer(q.options[0].key);
    if (e.key === '2') answer(q.options[1].key);
  });

  renderHome();
})();
