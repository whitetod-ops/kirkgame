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

  function probeFor(fact, band) {
    var dir = coin() ? -1 : 1;
    var p;

    if (fact.kind === 'year') {
      var mag = band === 'easy' ? randInt(8, 30) : band === 'medium' ? randInt(3, 7) : randInt(1, 2);
      p = fact.value + dir * mag;
    } else {
      var f = band === 'easy' ? randFloat(0.6, 1.6)
            : band === 'medium' ? randFloat(0.25, 0.5)
            : randFloat(0.08, 0.18);
      p = niceRound(fact.value * (1 + dir * f));
    }

    if (p === fact.value || (fact.kind === 'number' && p <= 0)) {
      var bump = Math.max(1, Math.round(Math.abs(fact.value) * 0.12));
      p = fact.value + (dir < 0 ? -bump : bump);
      if (fact.kind === 'number' && p <= 0) p = fact.value + bump;
    }
    return p;
  }

  /* ---------- question builders ---------- */

  function makeOverUnder(fact, band, mode) {
    var probe = probeFor(fact, band);
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
      base: 100
    };
  }

  function makeTrueFalse(fact, band) {
    var statement, truth;

    if (fact.kind === 'boolean') {
      statement = fact.claim + '.';
      truth = fact.answer;
    } else {
      truth = coin();
      var shown = truth ? fact.value : probeFor(fact, band);
      statement = fact.kind === 'year'
        ? fact.claim + ' in ' + fmtYear(shown) + '.'
        : fact.claim + ': ' + fmtNum(fact, shown) + '.';
      truth = (shown === fact.value);
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
      base: 100
    };
  }

  function makeOrder(band, pool, used) {
    var gap = band === 'easy' ? 10 : band === 'medium' ? 4 : 1;
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

  function makeClosest(fact, band) {
    var span = fact.kind === 'year'
      ? (band === 'easy' ? 60 : band === 'medium' ? 30 : 14)
      : Math.max(4, niceRound(Math.abs(fact.value) * (band === 'easy' ? 1.6 : band === 'medium' ? 0.9 : 0.45)));

    var min = Math.round(fact.value - span / 2 + (Math.random() - 0.5) * span * 0.4);
    var max = min + span;
    var margin = Math.max(1, Math.round(span * 0.1));
    if (fact.value - min < margin) min = fact.value - margin;
    if (max - fact.value < margin) max = fact.value + margin;
    if (fact.kind === 'number' && min < 0) min = 0;

    var step = fact.kind === 'year' ? 1 : Math.max(1, niceRound((max - min) / 100) || 1);

    return {
      mode: 'closest',
      band: band,
      facts: [fact],
      fact: fact,
      stem: fact.claim + '.',
      big: null,
      ask: 'Slide to your best guess',
      slider: { min: min, max: max, step: step, span: span },
      base: 150
    };
  }

  /* ---------- round assembly ---------- */

  var PLAN = [
    { mode: 'overunder', band: 'easy' },
    { mode: 'truefalse', band: 'easy' },
    { mode: 'overunder', band: 'easy' },
    { mode: 'closest', band: 'medium' },
    { mode: 'truefalse', band: 'medium' },
    { mode: 'overunder', band: 'medium' },
    { mode: 'order', band: 'medium' },
    { mode: 'truefalse', band: 'hard' },
    { mode: 'overunder', band: 'hard' },
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
    /* Tone rule: a body count is never the dial on a closest-guess slider and
       never one of the three questions that open a round. */
    var ok = function (x) { return !(opening && x.sensitive); };
    var okNum = function (x) { return isNumeric(x) && !x.sensitive; };

    if (mode === 'order') return makeOrder(band, pool, used);

    if (mode === 'closest') {
      f = firstFree(pool, used, okNum);
      return f ? makeClosest(f, band) : null;
    }

    if (mode === 'truefalse') {
      /* Weighted rather than strict, so the same handful of boolean facts do
         not turn up in every single round of a category. */
      var boolFirst = Math.random() < 0.6;
      var asBool = function (x) { return x.kind === 'boolean' && ok(x); };
      var asNum = function (x) { return isNumeric(x) && ok(x); };
      f = boolFirst
        ? (firstFree(pool, used, asBool) || firstFree(pool, used, asNum))
        : (firstFree(pool, used, asNum) || firstFree(pool, used, asBool));
      return f ? makeTrueFalse(f, band) : null;
    }

    f = firstFree(pool, used, function (x) { return isNumeric(x) && ok(x); });
    return f ? makeOverUnder(f, band) : null;
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

    return { catId: catId, questions: qs, i: 0, score: 0, streak: 0, results: [], continued: false };
  }

  /* ---------- state ---------- */

  var R = null;
  var answered = false;

  function show(name) {
    ['home', 'play', 'results', 'research'].forEach(function (s) {
      $('screen-' + s).classList.toggle('on', s === name);
    });
  }

  /* ---------- home ---------- */

  function renderHome() {
    var wrap = $('cats');
    wrap.innerHTML = '';

    DATA.categories.forEach(function (c) {
      var n = (DATA.facts[c.id] || []).length;
      var b = best[c.id];
      var el = document.createElement('button');
      el.className = 'cat';
      el.type = 'button';
      el.innerHTML =
        '<span class="cat-era">' + c.era + '</span>' +
        '<span class="cat-title">' + c.title + '</span>' +
        '<span class="cat-blurb">' + c.blurb + '</span>' +
        '<span class="cat-meta"><span>' + n + ' facts</span>' +
        (b ? '<span>best <b>' + b.toLocaleString('en-US') + '</b></span>' : '<span>not played</span>') +
        '</span>';
      el.addEventListener('click', function () { startRound(c.id); });
      wrap.appendChild(el);
    });

    $('res-count').textContent = String(research.length);
    $('bank').textContent = bank.toLocaleString('en-US') + ' points banked';
    $('gentle').checked = !!LS.get('gentle', false);
  }

  /* ---------- play ---------- */

  function startRound(catId) {
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
      if (r) s.className += r.grade === 'good' ? ' hit' : r.grade === 'part' ? ' part' : ' miss';
      else if (i === R.i) s.className += ' now';
      d.appendChild(s);
    }
  }

  function renderQuestion() {
    var q = R.questions[R.i];
    answered = false;

    renderDots();
    $('score').textContent = R.score.toLocaleString('en-US');
    $('band').textContent = q.eased ? 'With more room'
      : R.i === R.questions.length - 1 ? 'Last one'
      : BAND_LABEL[q.band];
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

    var sw = $('slider-wrap');
    if (q.mode === 'closest') {
      sw.hidden = false;
      var s = $('slider');
      s.min = q.slider.min; s.max = q.slider.max; s.step = q.slider.step;
      s.value = Math.round((q.slider.min + q.slider.max) / 2 / q.slider.step) * q.slider.step;
      $('slider-min').textContent = fmtValue(q.fact, q.slider.min);
      $('slider-max').textContent = fmtValue(q.fact, q.slider.max);
      updateSliderVal();
    } else {
      sw.hidden = true;
    }

    renderActions(q);
  }

  function updateSliderVal() {
    var q = R.questions[R.i];
    $('slider-val').textContent = fmtValue(q.fact, Number($('slider').value));
  }

  function renderActions(q) {
    var a = $('actions');
    a.innerHTML = '';

    if (q.mode === 'closest') {
      var lock = document.createElement('button');
      lock.className = 'ans brass wide';
      lock.type = 'button';
      lock.textContent = 'Lock it in';
      lock.addEventListener('click', function () { answer(Number($('slider').value)); });
      a.appendChild(lock);
      return;
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
    if (q.mode === 'overunder' && !q.eased && q.band !== 'easy') {
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
    var grade, earned = 0, correct = false, offBy = null;

    if (q.mode === 'closest') {
      offBy = Math.abs(given - q.fact.value);
      var tol = q.slider.span * 0.4;
      earned = offBy === 0 ? 150 : Math.max(0, Math.round(150 * (1 - offBy / tol)));
      correct = earned > 0;
      grade = offBy === 0 ? 'good' : earned > 0 ? 'part' : 'bad';
    } else {
      correct = (given === q.correct);
      earned = correct ? Math.round(q.base * BAND_MULT[q.band]) : 0;
      grade = correct ? 'good' : 'bad';
    }

    /* Streaks: quietly awarded on a sensitive fact, never celebrated. */
    R.streak = correct ? R.streak + 1 : 0;
    var bonus = (correct && R.streak > 2) ? Math.min(100, 25 * (R.streak - 2)) : 0;
    earned += bonus;

    R.score = R.score + earned;
    R.results[R.i] = { grade: grade, earned: earned, given: given, offBy: offBy, q: q };

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
    var verdictText = res.grade === 'good' ? 'Correct'
                    : res.grade === 'part' ? 'Close' : 'Not this time';

    var ptsText = '+' + res.earned.toLocaleString('en-US');

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
          (res.offBy !== null && res.offBy > 0
            ? ' &middot; off by ' + res.offBy.toLocaleString('en-US') : '') +
          (bonus && !f.sensitive ? ' &middot; ' + R.streak + ' in a row' : '') +
        '</span>' +
        '<span class="pts">' + ptsText + '</span>' +
      '</div>' +
      '<div class="truth">' +
        '<span class="truth-claim">' + claimLine + '</span>' +
        '<span class="truth-val">' + truthVal + '</span>' +
      '</div>' +
      '<p class="context">' + f.context + '</p>' +
      (f.goDeeper ? '<p class="deeper"><b>Go deeper</b>' + f.goDeeper + '</p>' : '') +
      '<div class="sheet-links">' +
        '<a href="' + f.source.url + '" target="_blank" rel="noopener">Read the source</a>' +
        '<button class="save-btn' + (isSaved(f.id) ? ' saved' : '') + '" id="save-fact" type="button">' +
          (isSaved(f.id) ? 'Saved &#9733;' : 'Save to list') +
        '</button>' +
      '</div>' +
      '<button class="next-btn" id="next" type="button">' +
        (R.i === R.questions.length - 1 ? 'See your round' : 'Next question') +
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
    var parts = R.results.filter(function (r) { return r.grade === 'part'; }).length;
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
        '<p class="res-sub">' + hits + ' of ' + R.results.length + ' right' +
          (parts ? ' &middot; ' + parts + ' close' : '') + '</p>' +
        (beaten
          ? '<p class="res-best">New best for this period.</p>'
          : '<p class="res-sub">Best ' + prev.toLocaleString('en-US') + '</p>') +
      '</div>' +
      '<h2 class="sec">Everything you just met</h2>' +
      '<ul class="rlist">' +
        R.results.map(function (r) {
          var f = r.q.fact;
          var mark = r.grade === 'good' ? '&#10003;' : r.grade === 'part' ? '&#8776;' : '&#10007;';
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
    renderHome();
    show('home');
  }

  /* ---------- wiring ---------- */

  $('quit').addEventListener('click', goHome);
  $('open-research').addEventListener('click', renderResearch);
  $('slider').addEventListener('input', updateSliderVal);
  $('gentle').addEventListener('change', function () { LS.set('gentle', $('gentle').checked); });

  document.addEventListener('keydown', function (e) {
    if ($('sheet').hidden === false) {
      if ((e.key === 'Enter' || e.key === ' ') && $('next')) { e.preventDefault(); nextQuestion(); }
      return;
    }
    if (!$('screen-play').classList.contains('on') || answered) return;
    var q = R && R.questions[R.i];
    if (!q || q.mode === 'closest') return;
    if (e.key === '1') answer(q.options[0].key);
    if (e.key === '2') answer(q.options[1].key);
  });

  renderHome();
})();
