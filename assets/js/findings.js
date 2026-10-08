/* Findings: funnel, effect charts, live bootstrap and sign-flip, rank deflation, noise budget, ablation. */
(function () {
  'use strict';
  var CC = window.CC;
  var D = CC.data;
  if (!D) return;
  var el = CC.el, S = CC.svg;

  function scale(d0, d1, r0, r1) {
    var f = function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); };
    f.inv = function (p) { return d0 + (p - r0) / (r1 - r0) * (d1 - d0); };
    return f;
  }
  function onView(node, fn, threshold) {
    if (!node) return;
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { io.disconnect(); fn(); }
    }, { threshold: threshold || 0.35 });
    io.observe(node);
  }
  function xAxis(g, x, ticks, y, fmt, h) {
    ticks.forEach(function (t) {
      g.appendChild(S('line', { class: t === 0 ? 'zero' : 'gridline', x1: x(t), x2: x(t), y1: y - h, y2: y }));
      g.appendChild(S('text', { class: 'ax-label', x: x(t), y: y + 16, 'text-anchor': 'middle', text: fmt(t) }));
    });
  }

  /* ---------- funnel ---------- */
  var funnel = document.getElementById('funnel');
  if (funnel) {
    var rows = [
      ['Queries selected', 130, 'queries'], ['Acquired by the agent', 129, 'queries'], ['Evidence-processed', 128, 'queries'],
      ['With candidate pairs', 125, 'queries'], ['Frozen pairs, one per query', 114, 'pairs'], ['Replayed in the 2×2', 113, 'pairs'],
      ['Independent answer-target families', 89, 'families']
    ];
    var fills = [];
    rows.forEach(function (r, i) {
      var key = i === rows.length - 1;
      var fill = el('div', { class: 'fbar__fill' + (key ? ' is-key' : ''), style: { width: (r[1] / 130 * 100) + '%' } },
        el('span', { class: 'fbar__val', text: r[1] + ' ' + r[2] }));
      fills.push([fill, r[1]]);
      funnel.appendChild(el('div', { class: 'fbar' }, el('span', { class: 'fbar__label', text: r[0] }), el('div', { class: 'fbar__track' }, fill)));
    });
    /* Bars rest at their true widths; on first view they replay the narrowing once. */
    onView(funnel, function () {
      if (CC.reduced()) return;
      fills.forEach(function (f) { f[0].style.transition = 'none'; f[0].style.width = '60%'; });
      void funnel.offsetWidth;
      fills.forEach(function (f, i) {
        f[0].style.transition = '';
        setTimeout(function () { f[0].style.width = (f[1] / 130 * 100) + '%'; }, 30 + i * 70);
      });
    });
  }

  /* ---------- Finding 1a: the citation budget ---------- */
  var budget = document.getElementById('chart-budget');
  if (budget) {
    var BUDGET = [
      { k: 'Target citations', v: 0.50, lo: 0.20, hi: 0.84, cls: 'pt--T' },
      { k: 'Competitor citations', v: -0.02, lo: -0.28, hi: 0.24, cls: 'pt--C' },
      { k: 'All citation markers', v: -0.49, lo: -1.6, hi: 0.6, cls: '' },
      { k: 'Unique sources cited', v: -0.05, lo: -0.20, hi: 0.11, cls: '' }
    ];
    CC.responsive(budget, function (w) {
      CC.clear(budget);
      var narrow = w < 470;
      var lw = narrow ? 0 : 150, rowH = narrow ? 50 : 40, top = 8, h = top + BUDGET.length * rowH + 26;
      var x = scale(-1.8, 1.05, lw + 10, w - 46);
      var svg = S('svg', { width: w, height: h, role: 'img', 'aria-label': 'Structured minus prose: target citations +0.50, competitor citations −0.02, all citation markers −0.49, unique sources −0.05; only the target interval excludes zero.' });
      var g = S('g', { class: 'ax' });
      xAxis(g, x, [-1.5, -1, -0.5, 0, 0.5, 1], top + BUDGET.length * rowH, function (t) { return t === 0 ? '0' : CC.sign(t, 1); }, BUDGET.length * rowH);
      svg.appendChild(g);
      BUDGET.forEach(function (r, i) {
        var cy = top + i * rowH + (narrow ? 32 : rowH / 2);
        if (narrow) svg.appendChild(S('text', { class: 'lbl', x: 0, y: cy - 16, text: r.k }));
        else svg.appendChild(S('text', { class: 'lbl', x: 0, y: cy + 4, text: r.k }));
        svg.appendChild(S('line', { class: 'ci', x1: x(r.lo), x2: x(r.hi), y1: cy, y2: cy }));
        svg.appendChild(S('circle', { class: 'pt ' + r.cls, cx: x(r.v), cy: cy, r: i === 0 ? 6.5 : 5 }));
        svg.appendChild(S('text', { class: i === 0 ? 'lbl-b' : 'lbl-2', x: x(r.hi) + 8, y: cy + 4, text: CC.sign(r.v, 2) }));
      });
      budget.appendChild(svg);
    });
  }

  /* ---------- Finding 1b: every family's effect ---------- */
  var dist = document.getElementById('chart-dist');
  var distMetric = 'cnt';
  function drawDist(w) {
    CC.clear(dist);
    var fams = CC.families(distMetric);
    var vals = fams.map(function (f) { return f.v; });
    var mean = CC.mean(vals);
    var isInc = distMetric === 'inc';
    var d0 = isInc ? -1.1 : -3.4, d1 = isInc ? 1.1 : 6.9;
    var groups = {};
    fams.forEach(function (f) { var k = f.v.toFixed(4); (groups[k] = groups[k] || []).push(f); });
    var maxN = Math.max.apply(null, Object.keys(groups).map(function (k) { return groups[k].length; }));
    var r = w < 480 ? 2.6 : 3.4, pitch = 2 * r + 1.4;
    var plotH = Math.min(230, Math.max(120, maxN * pitch));
    var rowsMax = Math.floor(plotH / pitch);
    var top = 26, base = top + plotH, h = base + 46;
    var x = scale(d0, d1, 14, w - 14);
    var svg = S('svg', { width: w, height: h, role: 'img', 'aria-label': 'Dot plot of ' + fams.length + ' family effects; mean ' + CC.sign(mean, 2) });
    var g = S('g', { class: 'ax' });
    var ticks = isInc ? [-1, -0.5, 0, 0.5, 1] : [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
    xAxis(g, x, ticks, base + 4, function (t) { return isInc ? (t === 0 ? '0' : CC.sign(t * 100, 0)) : (t === 0 ? '0' : CC.sign(t, 0)); }, plotH + 4);
    svg.appendChild(g);
    svg.appendChild(S('text', { class: 'ax-label', x: w - 14, y: base + 38, 'text-anchor': 'end', text: isInc ? 'change in being cited, percentage points →' : 'change in target citations per answer →' }));
    var dotsG = S('g');
    Object.keys(groups).forEach(function (k) {
      var arr = groups[k];
      var cols = Math.ceil(arr.length / rowsMax);
      arr.forEach(function (f, i) {
        var col = Math.floor(i / rowsMax), row = i % rowsMax;
        var cx = x(f.v) + (col - (cols - 1) / 2) * pitch;
        var cy = base - r - 1 - row * pitch;
        var fill = f.v > 0 ? 'var(--target)' : f.v < 0 ? 'var(--ink-2)' : 'var(--other)';
        var dot = S('circle', { cx: cx, cy: cy, r: r, style: 'fill:' + fill + ';stroke:var(--panel);stroke-width:1' });
        var hit = S('circle', { class: 'hit', cx: cx, cy: cy, r: Math.max(r + 3, 6) });
        CC.bindTip(hit, function () {
          var p0 = f.pairs[0];
          return [['tv', (isInc ? CC.pp(f.v, 0) + ' pp' : CC.sign(f.v, 2) + ' citations')],
            ['tk', 'Family ' + f.fam + ' · ' + CC.TOPICS[f.topic] + (f.pairs.length > 1 ? ' · 2 pairs' : '')],
            ['tq', '“' + (p0.q.length > 110 ? p0.q.slice(0, 108) + '…' : p0.q) + '”']];
        });
        dotsG.appendChild(dot); dotsG.appendChild(hit);
      });
    });
    svg.appendChild(dotsG);
    svg.appendChild(S('line', { x1: x(mean), x2: x(mean), y1: top - 10, y2: base, style: 'stroke:var(--ink);stroke-width:2' }));
    svg.appendChild(S('text', { class: 'lbl-b', x: x(mean) + 6, y: top - 2, text: 'mean ' + (isInc ? CC.pp(mean, 1) + ' pp' : CC.sign(mean, 2)) }));
    dist.appendChild(svg);

    var pos = vals.filter(function (v) { return v > 0; }).length, neg = vals.filter(function (v) { return v < 0; }).length;
    var ro = document.getElementById('dist-readout');
    CC.clear(ro);
    ro.appendChild(el('span', null, el('i', { class: 'swatch swatch--T' }), ' favor structured ', el('b', { text: String(pos) })));
    ro.appendChild(el('span', null, el('i', { class: 'swatch', style: { background: 'var(--other)' } }), ' no change ', el('b', { text: String(vals.length - pos - neg) })));
    ro.appendChild(el('span', null, el('i', { class: 'swatch', style: { background: 'var(--ink-2)' } }), ' favor prose ', el('b', { text: String(neg) })));
    ro.appendChild(el('span', { text: isInc ? 'Most families never change: incidence moves only where the target is sometimes cited and sometimes not.' : 'A broad shift: median 0, quartiles −0.25 to +1.00, range −3.0 to +6.5.' }));
  }
  if (dist) {
    var distR = CC.responsive(dist, drawDist);
    CC.seg(document.getElementById('dist-metric'), function (b) { distMetric = b.getAttribute('data-m'); distR.redraw(); });
  }

  /* ---------- Finding 1c: stats lab ---------- */
  var PAPER = {
    'cnt|all': { est: '+0.50', ci: '[+0.20, +0.84]', p: '.0022 (Holm .033)' },
    'inc|all': { est: '+4.5 pp', ci: '[−1.4, +10.4]', p: '.168' },
    'cnt|ok': { est: '+0.51', ci: '[+0.17, +0.88]', p: '.005' },
    'inc|ok': { est: '+5.9 pp', ci: '[+0.3, +12.0]', p: '.066' }
  };
  var lab = { m: 'cnt', set: 'all', seed: 20260723, cancel: [] };
  var bootC = document.getElementById('chart-boot'), flipC = document.getElementById('chart-flip');
  var bootR = document.getElementById('boot-readout'), flipR = document.getElementById('flip-readout');
  var bootP = document.getElementById('boot-prog'), flipP = document.getElementById('flip-prog');

  function labVals() { return CC.families(lab.m, lab.set === 'ok').map(function (f) { return f.v; }); }
  function fmtV(v) { return lab.m === 'inc' ? CC.pp(v, 1) + ' pp' : CC.sign(v, 2); }

  function histogram(container, samples, opt) {
    var w = Math.max(240, container.clientWidth), h = 170, top = 10, base = h - 26;
    CC.clear(container);
    var d0 = opt.d0, d1 = opt.d1;
    var x = scale(d0, d1, 8, w - 8);
    var nb = Math.min(60, Math.max(24, Math.floor(w / 9)));
    var bw = (d1 - d0) / nb;
    var counts = new Array(nb).fill(0);
    for (var i = 0; i < samples.length; i++) {
      var b = Math.floor((samples[i] - d0) / bw);
      if (b >= 0 && b < nb) counts[b]++;
    }
    var maxC = Math.max(1, Math.max.apply(null, counts));
    var svg = S('svg', { width: w, height: h, role: 'img', 'aria-label': opt.aria });
    var g = S('g', { class: 'ax' });
    xAxis(g, x, opt.ticks, base, opt.tickFmt, 0);
    svg.appendChild(g);
    svg.appendChild(S('line', { x1: 8, x2: w - 8, y1: base, y2: base, style: 'stroke:var(--rule-2)' }));
    var gap = (x(d0 + bw) - x(d0)) > 5 ? 1.5 : 0.5;
    counts.forEach(function (c, i) {
      if (!c) return;
      var x0 = x(d0 + i * bw), x1 = x(d0 + (i + 1) * bw);
      var mid = d0 + (i + 0.5) * bw;
      var hh = c / maxC * (base - top - 18);
      var inside = opt.shade ? opt.shade(mid) : false;
      svg.appendChild(S('rect', { x: x0 + gap / 2, y: base - hh, width: Math.max(0.5, x1 - x0 - gap), height: hh, rx: 1.5,
        style: 'fill:' + (inside ? opt.shadeFill : 'var(--rule-2)') }));
    });
    (opt.marks || []).forEach(function (m) {
      if (m.v < d0 || m.v > d1) return;
      svg.appendChild(S('line', { x1: x(m.v), x2: x(m.v), y1: top, y2: base, style: 'stroke:' + (m.color || 'var(--ink)') + ';stroke-width:2' }));
      if (m.label) svg.appendChild(S('text', { class: 'lbl-b', x: x(m.v) + (m.anchor === 'end' ? -6 : 6), y: top + 10, 'text-anchor': m.anchor || 'start', text: m.label }));
    });
    container.appendChild(svg);
  }

  function domainFor() { return lab.m === 'inc' ? { d0: -0.14, d1: 0.18, ticks: [-0.1, 0, 0.1], f: function (t) { return t === 0 ? '0' : CC.pp(t, 0) + ' pp'; } } : { d0: -0.6, d1: 1.15, ticks: [-0.5, 0, 0.5, 1], f: function (t) { return t === 0 ? '0' : CC.sign(t, 1); } }; }

  function runBoot() {
    if (!bootC) return;
    lab.cancel.forEach(function (c) { c && c(); });
    var vals = labVals(), n = vals.length, obs = CC.mean(vals), dm = domainFor();
    var rand = CC.rng(lab.seed);
    var key = lab.m + '|' + lab.set;
    document.getElementById('boot-run').disabled = true;
    bootP.parentNode.classList.remove('is-done');
    lab.cancel[0] = CC.chunked(20000, 700, function () {
      var s = 0;
      for (var j = 0; j < n; j++) s += vals[(rand() * n) | 0];
      return s / n;
    }, function (done, frac) {
      bootP.style.width = (frac * 100) + '%';
      histogram(bootC, done, { d0: dm.d0, d1: dm.d1, ticks: dm.ticks, tickFmt: dm.f, marks: [{ v: obs, label: 'observed ' + fmtV(obs) }], aria: 'Bootstrap distribution of the mean family effect' });
    }, function (all) {
      var sorted = Array.prototype.slice.call(all).sort(function (a, b) { return a - b; });
      var lo = CC.percentile(sorted, 0.025), hi = CC.percentile(sorted, 0.975);
      histogram(bootC, all, { d0: dm.d0, d1: dm.d1, ticks: dm.ticks, tickFmt: dm.f, shade: function (v) { return v >= lo && v <= hi; }, shadeFill: 'var(--ink-2)',
        marks: [{ v: obs, label: 'observed ' + fmtV(obs) }], aria: 'Bootstrap distribution; 95% interval ' + fmtV(lo) + ' to ' + fmtV(hi) });
      CC.clear(bootR);
      bootR.appendChild(el('span', null, 'Your 95% CI ', el('b', { text: '[' + fmtV(lo).replace(' pp', '') + ', ' + fmtV(hi) + ']' })));
      bootR.appendChild(el('span', { text: 'Paper: ' + PAPER[key].ci }));
      bootR.appendChild(el('span', { text: lo > 0 ? 'Excludes zero.' : 'Includes zero.' }));
      document.getElementById('boot-run').disabled = false;
      bootP.parentNode.classList.add('is-done');
    });
  }

  function runFlip() {
    if (!flipC) return;
    var vals = labVals(), nAll = vals.length, obs = CC.mean(vals), dm = domainFor();
    var nz = vals.filter(function (v) { return Math.abs(v) > 1e-12; });
    var obsAbs = Math.abs(nz.reduce(function (s, v) { return s + v; }, 0));
    var rand = CC.rng(lab.seed + 7);
    var extreme = 0, reps = 200000;
    var key = lab.m + '|' + lab.set;
    document.getElementById('flip-run').disabled = true;
    flipP.parentNode.classList.remove('is-done');
    lab.cancel[1] = CC.chunked(reps, 8000, function () {
      var s = 0;
      for (var j = 0; j < nz.length; j++) s += rand() < 0.5 ? nz[j] : -nz[j];
      if (Math.abs(s) + 1e-12 >= obsAbs) extreme++;
      return s / nAll;
    }, function (done, frac) {
      flipP.style.width = (frac * 100) + '%';
      if (frac < 1 && Math.round(frac * 25) % 5 !== 0) return;
      histogram(flipC, done, { d0: dm.d0, d1: dm.d1, ticks: dm.ticks, tickFmt: dm.f, marks: [{ v: obs, label: 'observed' }, { v: -obs, color: 'var(--ink-3)' }], aria: 'Sign-flip null distribution' });
    }, function (all) {
      var p = (extreme + 1) / (reps + 1);
      histogram(flipC, all, { d0: dm.d0, d1: dm.d1, ticks: dm.ticks, tickFmt: dm.f, shade: function (v) { return Math.abs(v) >= Math.abs(obs) - 1e-9; }, shadeFill: 'var(--ink-2)',
        marks: [{ v: obs, label: 'observed' }, { v: -obs, color: 'var(--ink-3)' }], aria: 'Sign-flip null distribution; p = ' + CC.p3(p) });
      CC.clear(flipR);
      flipR.appendChild(el('span', null, 'Your p ', el('b', { text: '= ' + CC.p3(p) })));
      flipR.appendChild(el('span', { text: 'Paper: ' + PAPER[key].p }));
      flipR.appendChild(el('span', { text: nz.length + ' of ' + nAll + ' families moved' }));
      document.getElementById('flip-run').disabled = false;
      flipP.parentNode.classList.add('is-done');
    });
  }
  function resetLab() {
    lab.cancel.forEach(function (c) { c && c(); });
    var vals = labVals(), obs = CC.mean(vals), dm = domainFor();
    [bootC, flipC].forEach(function (c) { histogram(c, [], { d0: dm.d0, d1: dm.d1, ticks: dm.ticks, tickFmt: dm.f, marks: [{ v: obs, label: 'observed ' + fmtV(obs) }], aria: 'Not yet run' }); });
    bootP.style.width = '0%'; flipP.style.width = '0%';
    CC.clear(bootR); CC.clear(flipR);
    bootR.appendChild(el('span', null, 'Observed mean ', el('b', { text: fmtV(obs) }), ' over ' + vals.length + ' families'));
    flipR.appendChild(el('span', { text: 'Waiting to run' }));
    document.getElementById('boot-run').disabled = false;
    document.getElementById('flip-run').disabled = false;
  }
  if (bootC && flipC) {
    resetLab();
    CC.seg(document.getElementById('sl-metric'), function (b) { lab.m = b.getAttribute('data-m'); resetLab(); runBoot(); runFlip(); });
    CC.seg(document.getElementById('sl-pairs'), function (b) { lab.set = b.getAttribute('data-p'); resetLab(); runBoot(); runFlip(); });
    document.getElementById('boot-run').addEventListener('click', function () { lab.seed += 101; runBoot(); });
    document.getElementById('flip-run').addEventListener('click', function () { lab.seed += 101; runFlip(); });
    onView(document.getElementById('stats-lab'), function () { runBoot(); setTimeout(runFlip, 350); }, 0.3);
    var lastW = bootC.clientWidth;
    if ('ResizeObserver' in window) new ResizeObserver(function () {
      if (Math.abs(bootC.clientWidth - lastW) > 30) { lastW = bootC.clientWidth; resetLab(); runBoot(); runFlip(); }
    }).observe(bootC);
  }

  /* ---------- Finding 2: rank deflation ---------- */
  var rankC = document.getElementById('chart-rank');
  var rankView = 'obs';
  var RANKS = [[1, 85.1, 276], [2, 66.0, 294], [3, 54.0, 300], [4, 49.8, 309], [5, 42.8, 311]];
  function drawRank(w, animate) {
    CC.clear(rankC);
    var h = 280;
    var svg = S('svg', { width: w, height: h });
    if (rankView === 'obs') {
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'Share of documents cited by first-exposure rank: 85.1%, 66.0%, 54.0%, 49.8%, 42.8%.');
      var left = 40, right = w - 10, top = 24, base = h - 40;
      var y = scale(0, 100, base, top);
      var g = S('g', { class: 'ax' });
      [0, 25, 50, 75, 100].forEach(function (t) {
        g.appendChild(S('line', { class: t ? 'gridline' : 'zero', x1: left, x2: right, y1: y(t), y2: y(t) }));
        g.appendChild(S('text', { class: 'ax-label', x: left - 8, y: y(t) + 4, 'text-anchor': 'end', text: t + '%' }));
      });
      svg.appendChild(g);
      var band = (right - left) / 5, bw = Math.min(46, band * 0.56);
      RANKS.forEach(function (r, i) {
        var cx = left + band * (i + 0.5);
        var bh = base - y(r[1]);
        var bar = S('path', { d: barPath(cx - bw / 2, base, bw, animate ? 0 : bh), style: 'fill:var(--ink)' });
        svg.appendChild(bar);
        if (animate && !CC.reduced()) {
          (function (bar, bh, cx, delay) {
            var t0 = null;
            function step(ts) {
              if (t0 == null) t0 = ts;
              var k = Math.min(1, (ts - t0 - delay) / 600);
              if (k < 0) { requestAnimationFrame(step); return; }
              var e = 1 - Math.pow(1 - k, 3);
              bar.setAttribute('d', barPath(cx - bw / 2, base, bw, bh * e));
              if (k < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
          })(bar, bh, cx, i * 80);
        } else bar.setAttribute('d', barPath(cx - bw / 2, base, bw, bh));
        svg.appendChild(S('text', { class: 'lbl-b', x: cx, y: y(r[1]) - 8, 'text-anchor': 'middle', text: r[1].toFixed(1) + '%' }));
        svg.appendChild(S('text', { class: 'lbl', x: cx, y: base + 17, 'text-anchor': 'middle', text: 'Rank ' + r[0] }));
        svg.appendChild(S('text', { class: 'ax-label', x: cx, y: base + 32, 'text-anchor': 'middle', text: 'n = ' + r[2] }));
      });
      var x1 = left + band * 0.5 + bw / 2 + 6, x5 = left + band * 4.5 - bw / 2 - 6;
      var yTop = y(85.1), yBot = y(42.8);
      var bx = left + band * 4.5 + bw / 2 + 8;
      if (bx < right - 4) {
        svg.appendChild(S('path', { d: 'M' + (bx - 4) + ' ' + yTop + 'H' + bx + 'V' + yBot + 'H' + (bx - 4), style: 'fill:none;stroke:var(--ink-3);stroke-width:1.2' }));
      }
      svg.appendChild(S('line', { x1: x1, x2: right - 2, y1: yTop, y2: yTop, style: 'stroke:var(--ink-3);stroke-width:1' }));
      svg.appendChild(S('text', { class: 'lbl-2', x: left + band * 4.5, y: y(66), 'text-anchor': 'middle', text: '42.3-point' }));
      svg.appendChild(S('text', { class: 'lbl-2', x: left + band * 4.5, y: y(66) + 15, 'text-anchor': 'middle', text: 'gap' }));
    } else {
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'On one percentage-point axis: observed gap 42.3; controlled swap scaled +7.9 (1.1 to 14.9); held out 0.0 (−5.4 to 5.4).');
      var narrow = w < 470;
      var lw = narrow ? 0 : 168, rowH = narrow ? 70 : 64, top2 = 22;
      var x = scale(-10, 50, lw + 8, w - 52);
      var base2 = top2 + rowH * 3;
      var g2 = S('g', { class: 'ax' });
      xAxis(g2, x, [-10, 0, 10, 20, 30, 40, 50], base2, function (t) { return t === 0 ? '0' : CC.sign(t, 0); }, rowH * 3);
      svg.appendChild(g2);
      svg.appendChild(S('text', { class: 'ax-label', x: w - 52, y: base2 + 32, 'text-anchor': 'end', text: 'percentage points' }));
      var R = [
        { k: 'Observed rank 1 − rank 5 gap', v: 42.3, bar: true },
        { k: 'Controlled swap, scaled', v: 7.9, lo: 1.1, hi: 14.9, sub: 'Holm p = .350' },
        { k: 'Controlled swap, held out', v: 0.0, lo: -5.4, hi: 5.4, sub: 'p = 1.00' }
      ];
      R.forEach(function (r, i) {
        var cy = top2 + rowH * i + (narrow ? 44 : rowH / 2);
        if (narrow) svg.appendChild(S('text', { class: 'lbl', x: 0, y: cy - 18, text: r.k }));
        else svg.appendChild(S('text', { class: 'lbl', x: 0, y: cy + 4, text: r.k }));
        if (r.bar) {
          var bar = S('rect', { x: x(0), y: cy - 9, height: 18, rx: 4, width: animate && !CC.reduced() ? 0 : x(r.v) - x(0), style: 'fill:var(--ink)' });
          svg.appendChild(bar);
          if (animate && !CC.reduced()) requestAnimationFrame(function () { bar.style.transition = 'width .7s cubic-bezier(.2,.8,.2,1)'; bar.setAttribute('width', x(r.v) - x(0)); });
          svg.appendChild(S('text', { class: 'lbl-b', x: x(r.v) + 8, y: cy + 4, text: '42.3' }));
        } else {
          var line = S('line', { class: 'ci', x1: x(r.v), x2: x(r.v), y1: cy, y2: cy });
          svg.appendChild(line);
          var dot = S('circle', { class: 'pt pt--T', cx: x(r.v), cy: cy, r: 6, style: 'opacity:' + (animate && !CC.reduced() ? 0 : 1) + ';transition:opacity .3s ease' });
          svg.appendChild(dot);
          var lab2 = S('text', { class: 'lbl-b', x: x(r.hi) + 8, y: cy + 4, text: CC.sign(r.v, 1).replace('0.0', '0.0') });
          svg.appendChild(lab2);
          svg.appendChild(S('text', { class: 'ax-label', x: x(r.hi) + 8, y: cy + 19, text: r.sub }));
          var grow = function () { line.setAttribute('x1', x(r.lo)); line.setAttribute('x2', x(r.hi)); dot.style.opacity = 1; };
          if (animate && !CC.reduced()) setTimeout(function () {
            line.style.transition = 'all .5s ease';
            grow();
          }, 650 + i * 260);
          else grow();
        }
      });
    }
    rankC.appendChild(svg);
  }
  function barPath(x0, base, bw, bh) {
    var r = Math.min(4, bh / 2, bw / 2);
    if (bh <= 0) return 'M' + x0 + ' ' + base + 'h' + bw + 'v0h' + (-bw) + 'Z';
    return 'M' + x0 + ' ' + base + 'V' + (base - bh + r) + 'Q' + x0 + ' ' + (base - bh) + ' ' + (x0 + r) + ' ' + (base - bh) +
      'H' + (x0 + bw - r) + 'Q' + (x0 + bw) + ' ' + (base - bh) + ' ' + (x0 + bw) + ' ' + (base - bh + r) + 'V' + base + 'Z';
  }
  if (rankC) {
    var rankAnimate = false;
    var rankR = CC.responsive(rankC, function (w) { drawRank(w, rankAnimate); rankAnimate = false; });
    CC.seg(document.getElementById('rank-view'), function (b) {
      rankView = b.getAttribute('data-v');
      document.getElementById('rank-title').textContent = rankView === 'obs' ? 'Citation rate by first-exposure rank' : 'Observed gap vs controlled swaps';
      var cap = document.getElementById('rank-caption');
      CC.clear(cap);
      if (rankView === 'obs') cap.appendChild(document.createTextNode('Descriptive. Rank is confounded with relevance, quality and the agent’s query choices. Switch to Controlled to put the same gap beside the pair-swap estimates on one percentage-point axis.'));
      else cap.appendChild(document.createTextNode('Same axis, different designs: the observed gap compares different documents at different ranks; the swaps move the same matched document inside a frozen transcript. A comparison of scale, not a decomposition.'));
      rankAnimate = true;
      rankR.redraw();
    });
    onView(rankC, function () { rankAnimate = true; rankR.redraw(); }, 0.5);
  }

  /* ---------- displacement strata ---------- */
  var disp = document.getElementById('chart-disp');
  if (disp) {
    var DISP = [[1, -3.3, -12.2, 5.6, 48, 0.0, 21], [2, 13.4, 0.0, 26.8, 31, -6.7, 15], [3, 13.0, 2.2, 26.1, 24, 9.1, 11], [4, 30.0, 0.0, 60.0, 10, 0.0, 9]];
    CC.responsive(disp, function (w) {
      CC.clear(disp);
      var h = 240, left = 44, right = w - 8, top = 12, base = h - 44;
      var y = scale(-15, 62, base, top);
      var svg = S('svg', { width: w, height: h, role: 'img', 'aria-label': 'Rank effect by swap distance. Scaled: −3.3, +13.4, +13.0, +30.0. Held out: 0.0, −6.7, +9.1, 0.0.' });
      var g = S('g', { class: 'ax' });
      [-10, 0, 10, 20, 30, 40, 50, 60].forEach(function (t) {
        g.appendChild(S('line', { class: t ? 'gridline' : 'zero', x1: left, x2: right, y1: y(t), y2: y(t) }));
        g.appendChild(S('text', { class: 'ax-label', x: left - 8, y: y(t) + 4, 'text-anchor': 'end', text: t === 0 ? '0' : CC.sign(t, 0) }));
      });
      svg.appendChild(g);
      var band = (right - left) / 4;
      DISP.forEach(function (d, i) {
        var cx = left + band * (i + 0.5);
        var xs = cx - 10, xh = cx + 12;
        svg.appendChild(S('line', { class: 'ci', x1: xs, x2: xs, y1: y(d[2]), y2: y(d[3]) }));
        var p1 = S('circle', { class: 'pt', cx: xs, cy: y(d[1]), r: 5.5, tabindex: '0' });
        svg.appendChild(p1);
        var p2 = S('circle', { class: 'pt--hollow', cx: xh, cy: y(d[5]), r: 5, tabindex: '0' });
        svg.appendChild(p2);
        CC.bindTip(p1, function () { return [['tv', CC.sign(d[1], 1) + ' pp'], ['tk', 'Scaled replay · ' + d[0] + '-slot swaps · ' + d[4] + ' pairs'], ['tk', '95% CI ' + CC.sign(d[2], 1) + ' to ' + CC.sign(d[3], 1)]]; });
        CC.bindTip(p2, function () { return [['tv', CC.sign(d[5], 1) + ' pp'], ['tk', 'Held out · ' + d[0] + '-slot swaps · ' + d[6] + ' pairs']]; });
        svg.appendChild(S('text', { class: 'lbl', x: cx, y: base + 18, 'text-anchor': 'middle', text: d[0] + (d[0] === 1 ? ' slot' : ' slots') }));
        svg.appendChild(S('text', { class: 'ax-label', x: cx, y: base + 33, 'text-anchor': 'middle', text: d[4] + ' / ' + d[6] + ' pairs' }));
      });
      disp.appendChild(svg);
    });
  }

  /* ---------- Finding 3: noise grid ---------- */
  var ng = document.getElementById('noise-grid');
  if (ng) {
    var byPair = {}, pairOrder = [];
    D.repeat.forEach(function (r) {
      if (!byPair[r[0]]) { byPair[r[0]] = {}; pairOrder.push(r[0]); }
      byPair[r[0]][r[1]] = r;
    });
    var cellEls = [];
    pairOrder.forEach(function (pid) {
      var t = el('div', { class: 'npair' });
      ['PH', 'PL', 'SH', 'SL'].forEach(function (k) {
        var r = byPair[pid][k];
        var i = el('i');
        cellEls.push([i, r[2] > 0, r[3] > 0]);
        t.appendChild(i);
      });
      ng.appendChild(t);
    });
    var gen = 1;
    var showGen = function (g) {
      gen = g;
      cellEls.forEach(function (c) {
        var a = c[1], b = c[2];
        var on = g === 1 ? a : b;
        c[0].className = (on ? 'on' : '') + (g === 2 && a !== b ? (b ? ' gain' : ' lose') : '');
      });
    };
    showGen(1);
    var nseg = CC.seg(document.getElementById('noise-gen'), function (b) { showGen(+b.getAttribute('data-g')); });
    onView(ng, function () {
      if (CC.reduced()) return;
      setTimeout(function () { if (gen === 1) { nseg.set(function (o) { return o.getAttribute('data-g') === '2'; }); showGen(2); } }, 1400);
    }, 0.6);
  }
  var agree = document.getElementById('agree');
  if (agree) {
    [['Target cited or not', 85.0], ['First pair member cited', 87.5], ['Exact set of pair members cited', 78.3], ['Exact target citation count', 61.7]].forEach(function (a) {
      agree.appendChild(el('div', { class: 'agree__row' }, el('span', { text: a[0] }), el('span', { class: 'bar' }, el('i', { style: { width: a[1] + '%' } })), el('span', { class: 'v', text: a[1].toFixed(1) + '%' })));
    });
  }

  /* ---------- power projection ---------- */
  var kR = document.getElementById('k-range'), nR = document.getElementById('n-range');
  if (kR && nR) {
    var NOISE = 0.050, TOTAL = 0.112, BETWEEN = TOTAL - NOISE;
    var varbar = document.getElementById('varbar');
    var vb = el('div', { class: 'v-between' }), vn = el('div', { class: 'v-noise' });
    varbar.appendChild(vb); varbar.appendChild(vn);
    var update = function () {
      var k = +kR.value, n = +nR.value;
      var noise = NOISE / k, tot = BETWEEN + noise;
      document.getElementById('k-val').textContent = k;
      document.getElementById('n-val').textContent = n;
      vb.style.flexBasis = (BETWEEN / TOTAL * 100) + '%';
      vn.style.flexBasis = (noise / TOTAL * 100) + '%';
      vb.textContent = 'between families ' + Math.round(BETWEEN / tot * 100) + '%';
      vn.textContent = noise / TOTAL > 0.12 ? 'decoding noise ' + Math.round(noise / tot * 100) + '%' : '';
      vn.title = 'decoding noise ' + Math.round(noise / tot * 100) + '% of the remaining variance';
      varbar.style.width = (tot / TOTAL * 100) + '%';
      varbar.setAttribute('aria-label', 'Variance of a single family effect: ' + Math.round(BETWEEN / tot * 100) + '% between families, ' + Math.round(noise / tot * 100) + '% decoding noise; total ' + Math.round(tot / TOTAL * 100) + '% of the one-generation design.');
      var mde = 8.5 * Math.sqrt(tot / TOTAL) * Math.sqrt(89 / n);
      var out = document.getElementById('mde-v');
      out.textContent = '≈ ' + mde.toFixed(1) + ' pp';
      out.parentNode.style.background = mde <= 4.5 ? 'var(--target-wash)' : '';
    };
    kR.addEventListener('input', update); nR.addEventListener('input', update);
    update();
  }

  /* ---------- mechanical ablation morph ---------- */
  var morph = document.getElementById('morph-text');
  var ex = D.examples.passport;
  if (morph && ex) {
    var stats = document.getElementById('morph-stats');
    var cur = 'prose';
    var show = function (arm, animate) {
      var text = ex.text[arm];
      var lines = text.split('\n');
      CC.clear(morph);
      if (animate && arm === 'mechanical' && cur === 'prose' && !CC.reduced()) {
        CC.snapshot(morph, text);
        var spans = Array.prototype.slice.call(morph.childNodes);
        spans.forEach(function (n) { if (n.nodeType === 1) { n.style.opacity = '0.15'; n.style.transition = 'opacity .25s ease'; } });
        var k = 0;
        spans.filter(function (n) { return n.nodeType === 1; }).forEach(function (n) { setTimeout(function () { n.style.opacity = '1'; }, 40 + (k++) * 45); });
      } else CC.snapshot(morph, text);
      cur = arm;
      var words = arm === 'structured' ? ex.words.structured : ex.words.prose;
      var heads = lines.filter(function (l) { return /^#{1,6} /.test(l); }).length;
      var items = lines.filter(function (l) { return /^\s*- /.test(l); }).length;
      var proseWords = ex.text.prose.split(/\s+/).filter(Boolean);
      var same = arm === 'mechanical' && proseWords.join(' ') === text.split(/\s+/).filter(function (w) { return w && w !== '-'; }).join(' ');
      CC.clear(stats);
      [words + ' words', heads + ' headings', items + ' list rows', arm === 'prose' ? 'continuous paragraphs' : arm === 'mechanical' ? (same ? 'word sequence identical to prose ✓' : 'word sequence differs') : 'rewritten wording, same facts'].forEach(function (s) { stats.appendChild(el('span', { text: s })); });
    };
    show('prose');
    CC.seg(document.getElementById('morph-arm'), function (b) { show(b.getAttribute('data-a'), true); });
  }

  var abl = document.getElementById('chart-ablation');
  if (abl) {
    var ABL = [['All 113 pairs', 6.7, 1.1, 12.4, true], ['30 families · original', -1.7], ['30 families · fresh', -8.3], ['30 families · averaged', -5.0, -11.7, 0.8, true]];
    CC.responsive(abl, function (w) {
      CC.clear(abl);
      var rowH = 30, top = 4, h = top + ABL.length * rowH + 24;
      var narrow = w < 300;
      var lw = narrow ? 0 : Math.min(150, w * 0.46);
      var x = scale(-15, 15, lw + 6, w - 10);
      var svg = S('svg', { width: w, height: h + (narrow ? ABL.length * 12 : 0), role: 'img', 'aria-label': 'Word-preserving ablation: all 113 pairs +6.7 (1.1 to 12.4); repeated subset original −1.7, fresh −8.3, averaged −5.0 (−11.7 to 0.8).' });
      var g = S('g', { class: 'ax' });
      var axisY = top + ABL.length * rowH + (narrow ? ABL.length * 12 : 0);
      xAxis(g, x, [-10, 0, 10], axisY, function (t) { return t === 0 ? '0' : CC.sign(t, 0); }, ABL.length * rowH + (narrow ? ABL.length * 12 : 0));
      svg.appendChild(g);
      ABL.forEach(function (r, i) {
        var cy = top + i * rowH + rowH / 2 + (narrow ? (i + 1) * 12 : 0);
        svg.appendChild(S('text', { class: 'lbl-2', x: 0, y: narrow ? cy - 12 : cy + 4, text: r[0] }));
        if (r[4]) svg.appendChild(S('line', { class: 'ci', x1: x(r[2]), x2: x(r[3]), y1: cy, y2: cy }));
        svg.appendChild(S('circle', { class: r[4] ? 'pt' : 'pt--hollow', cx: x(r[1]), cy: cy, r: 4.5 }));
      });
      abl.appendChild(svg);
    });
  }
})();
