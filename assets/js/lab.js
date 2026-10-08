/* Replay lab: the 2x2 for three featured pairs, or any of the 113. */
(function () {
  'use strict';
  var CC = window.CC;
  var D = CC.data;
  var host = document.getElementById('lab-view');
  if (!D || !host) return;
  var el = CC.el;

  var FEATURED = {
    passport: {
      tab: 'Passport validity', k: 'structure',
      short: { t: 'After You Get Your New Passport', c: 'Passport services FAQ' },
      story: 'Two State Department pages, both stating the six-month validity rule. The structured target joins the answer; the prose one never does.',
      arm: 'P'
    },
    globalentry: {
      tab: 'Global Entry vs MPC', k: 'rank',
      short: { t: 'Global Entry FAQ', c: 'Mobile Passport Control' },
      story: 'Two CBP pages at opposite ends of one call. Promoted from #5 to #1, the Global Entry FAQ earns a citation in either rendering.',
      arm: 'S'
    },
    acetaminophen: {
      tab: 'Acetaminophen vs ibuprofen', k: 'rank',
      short: { t: '21 CFR § 201.326, OTC analgesic labeling', c: 'Ibuprofen, MedlinePlus' },
      story: 'A federal labeling regulation at #1 against a MedlinePlus page at #5. At #1 the regulation is cited four times; demoted to #5, not once.',
      arm: 'S'
    }
  };
  var ORDER = ['passport', 'globalentry', 'acetaminophen'];

  var state = { key: 'passport', pair: null, arm: 'P', ord: null };

  /* ---------- tabs ---------- */
  var tabs = document.getElementById('lab-tabs');
  var tabBtns = {};
  ORDER.forEach(function (k) {
    var f = FEATURED[k];
    var b = el('button', { type: 'button', class: 'tab', role: 'tab', 'aria-selected': 'false', id: 'lab-tab-' + k }, f.tab, el('span', { class: 'k', text: f.k }));
    b.addEventListener('click', function () { load(k); });
    tabs.appendChild(b);
    tabBtns[k] = b;
  });
  tabs.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var i = ORDER.indexOf(state.key);
    if (i < 0) i = 0;
    var n = (i + (e.key === 'ArrowRight' ? 1 : -1) + ORDER.length) % ORDER.length;
    load(ORDER[n]);
    tabBtns[ORDER[n]].focus();
    e.preventDefault();
  });
  document.getElementById('lab-random').addEventListener('click', function () {
    var featuredIds = ORDER.map(function (k) { return D.examples[k].pair; });
    var pool = D.pairs.filter(function (p) { return featuredIds.indexOf(p.id) < 0 && (!state.pair || p.id !== state.pair.id); });
    loadPair(pool[Math.floor(Math.random() * pool.length)]);
  });

  /* ---------- layout ---------- */
  var q = el('div', { class: 'lab__q' });
  var ctrls = el('div', { class: 'lab__ctrls' });
  var body = el('div', { class: 'lab__body' });
  var colCall = el('div', { class: 'lab__col' });
  var colText = el('div', { class: 'lab__col' });
  var colOut = el('div', { class: 'lab__col lab__col--out', 'aria-live': 'polite' });
  body.appendChild(colCall); body.appendChild(colText); body.appendChild(colOut);
  var foot = el('div', { class: 'lab__foot' });
  host.appendChild(q); host.appendChild(ctrls); host.appendChild(body); host.appendChild(foot);

  var armSeg = el('div', { class: 'seg', role: 'group', 'aria-labelledby': 'lab-arm-l' },
    el('button', { type: 'button', 'data-v': 'P', 'aria-pressed': 'true', text: 'Prose' }),
    el('button', { type: 'button', 'data-v': 'S', 'aria-pressed': 'false', text: 'Structured' }));
  var ordSeg = el('div', { class: 'seg', role: 'group', 'aria-labelledby': 'lab-ord-l' },
    el('button', { type: 'button', 'data-v': 'H', 'aria-pressed': 'true', text: 'Target higher' }),
    el('button', { type: 'button', 'data-v': 'L', 'aria-pressed': 'false', text: 'Target lower' }));
  var changed = el('span', { class: 'faint ui', style: { 'font-size': 'var(--t-sm)' } });
  ctrls.appendChild(el('div', { class: 'ctrl' }, el('span', { class: 'ctrl__label', id: 'lab-arm-l', text: 'Target rendering' }), armSeg));
  ctrls.appendChild(el('div', { class: 'ctrl' }, el('span', { class: 'ctrl__label', id: 'lab-ord-l', text: 'Pair order' }), ordSeg));
  ctrls.appendChild(changed);
  var armCtl = CC.seg(armSeg, function (b) { state.arm = b.getAttribute('data-v'); render(true); });
  var ordCtl = CC.seg(ordSeg, function (b) { state.ord = b.getAttribute('data-v'); render(true); });

  /* ---------- helpers ---------- */
  function current() {
    if (state.key) {
      var e = D.examples[state.key];
      return { ex: e, f: FEATURED[state.key], p: D.pairs.filter(function (x) { return x.id === e.pair; })[0] };
    }
    return { ex: null, f: null, p: state.pair };
  }
  function originalOrder(p) { return p.t.pos < p.c.pos ? 'H' : 'L'; }
  function cellOf(c, key) {
    if (c.ex) return c.ex.cells[key];
    var i = CC.CELLS.indexOf(key);
    var a = c.p.cells[i];
    return { t: a[0], c: a[1], n: a[2], lines: null };
  }
  function positions(p, ord) {
    var hi = Math.min(p.t.pos, p.c.pos), lo = Math.max(p.t.pos, p.c.pos);
    return ord === 'H' ? { t: hi, c: lo } : { t: lo, c: hi };
  }

  var listEl = null;
  function drawCall(c, animate) {
    var p = c.p;
    var pos = positions(p, state.ord);
    var before = {};
    if (listEl && animate && !CC.reduced()) {
      CC.$$('li', listEl).forEach(function (li) { before[li.getAttribute('data-k')] = li.getBoundingClientRect().top; });
    }
    if (!listEl || !animate) {
      CC.clear(colCall);
      colCall.appendChild(el('div', { class: 'mini-label' }, el('span', { text: 'Search call, in array order' }), el('span', { text: 'model-visible' })));
      listEl = el('ol', { class: 'results' });
      colCall.appendChild(listEl);
      colCall.appendChild(el('div', { class: 'mini-label' }, el('span', { text: 'All four replays · target citations' })));
      colCall.appendChild(mini(c));
    }
    var short = c.f ? c.f.short : { t: p.t.title, c: p.c.title };
    var rows = [];
    for (var i = 1; i <= 5; i++) {
      if (i === pos.t) rows.push({ k: 'T', pos: i, name: short.t, dom: p.t.dom });
      else if (i === pos.c) rows.push({ k: 'C', pos: i, name: short.c, dom: p.c.dom });
      else rows.push({ k: 'o' + i, pos: i, name: null, dom: c.ex && c.ex.call[i - 1] ? c.ex.call[i - 1] : 'other result · unchanged' });
    }
    CC.clear(listEl);
    rows.forEach(function (r) {
      var role = r.k === 'T' || r.k === 'C' ? r.k : null;
      listEl.appendChild(el('li', { class: 'result' + (role ? ' result--' + role : ' result--dim'), 'data-k': r.k },
        el('span', { class: 'result__pos', text: '#' + r.pos }),
        el('span', { class: 'result__name', title: r.name ? r.name + ' · ' + r.dom : r.dom }, r.name ? el('b', { text: r.name }) : null, r.name ? ' · ' : '', r.dom),
        role ? CC.chip(role) : el('span')));
    });
    if (Object.keys(before).length) {
      CC.$$('li', listEl).forEach(function (li) {
        var k = li.getAttribute('data-k');
        if (before[k] == null) return;
        var dy = before[k] - li.getBoundingClientRect().top;
        if (!dy) return;
        li.style.transform = 'translateY(' + dy + 'px)';
        li.style.transition = 'none';
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            li.style.transition = 'transform .55s cubic-bezier(.2,.8,.2,1)';
            li.style.transform = '';
          });
        });
      });
    }
    var m = CC.$('.mini22', colCall);
    if (m) colCall.replaceChild(mini(c), m);
  }

  function mini(c) {
    var g = el('div', { class: 'mini22', role: 'group', 'aria-label': 'Target citations in each of the four replays; select one to view it' });
    g.appendChild(el('span'));
    g.appendChild(el('span', { class: 'hd', text: 'target higher' }));
    g.appendChild(el('span', { class: 'hd', text: 'target lower' }));
    var max = 1;
    CC.CELLS.forEach(function (k) { max = Math.max(max, cellOf(c, k).t); });
    [['P', 'prose'], ['S', 'structured']].forEach(function (row) {
      g.appendChild(el('span', { class: 'rl', text: row[1] }));
      ['H', 'L'].forEach(function (o) {
        var key = row[0] + o;
        var cell = cellOf(c, key);
        var on = state.arm === row[0] && state.ord === o;
        var b = el('button', { type: 'button', 'aria-pressed': String(on), 'aria-label': row[1] + ', target ' + (o === 'H' ? 'higher' : 'lower') + ': target cited ' + cell.t + ' times' },
          el('span', { class: 'bg', style: { opacity: cell.t ? String(0.25 + 0.75 * cell.t / max) : '0' } }),
          el('span', { text: String(cell.t), style: { color: cell.t / max > 0.55 ? 'var(--on-target)' : 'var(--ink)' } }));
        b.addEventListener('click', function () {
          state.arm = row[0]; state.ord = o;
          armCtl.set(function (x) { return x.getAttribute('data-v') === state.arm; });
          ordCtl.set(function (x) { return x.getAttribute('data-v') === state.ord; });
          render(true);
        });
        g.appendChild(b);
      });
    });
    return g;
  }

  function drawText(c) {
    CC.clear(colText);
    if (c.ex) {
      var arm = state.arm === 'S' ? 'structured' : 'prose';
      colText.appendChild(el('div', { class: 'mini-label' }, el('span', { text: 'Target text the model reads' }), el('span', { class: 'num', text: c.ex.words[arm] + ' words' })));
      var s = el('div', { class: 'snapshot snapshot--tall', tabindex: '0', 'aria-label': 'Target text, ' + arm + ' rendering' });
      CC.snapshot(s, c.ex.text[arm]);
      colText.appendChild(s);
      colText.appendChild(el('p', { class: 'faint ui', style: { 'font-size': '0.78rem' }, text: (state.key === 'passport' ? 'Full rendering.' : 'Opening of the rendering; the model saw all of it.') + ' Rewritten from a U.S. government page, the ' + c.p.t.dom + ' snapshot of ' + c.ex.words.source.toLocaleString() + ' words.' }));
    } else {
      colText.appendChild(el('div', { class: 'mini-label' }, el('span', { text: 'The two documents' })));
      [['T', c.p.t], ['C', c.p.c]].forEach(function (d) {
        colText.appendChild(el('div', { class: 'docline' }, CC.chip(d[0]),
          el('div', { style: { display: 'grid', gap: '2px', 'min-width': '0' } }, el('span', { class: 't', text: d[1].title }), el('span', { class: 'd', text: d[1].dom + ' · originally #' + d[1].pos }))));
      });
      colText.appendChild(el('p', { class: 'note', text: 'Page text and answer excerpts are shown only for the three featured pairs, whose pages are U.S. government publications. Counts for every pair come from the archived trials.' }));
    }
  }

  var lastCell = null;
  function drawOut(c, animate) {
    var key = state.arm + state.ord;
    var cell = cellOf(c, key);
    CC.clear(colOut);
    colOut.appendChild(el('div', { class: 'mini-label' }, el('span', { text: 'This cell’s answer' }), el('span', { class: 'num', text: cell.n + ' citations' })));
    var tally = el('div', { class: 'tally' });
    var uT = el('span', { class: 'units' }), uC = el('span', { class: 'units' });
    tally.appendChild(el('div', { class: 'tally__row' }, el('span', { class: 'who' }, el('i', { class: 'swatch swatch--T' }), 'Target'), uT, el('span', { class: 'n num', text: String(cell.t) })));
    tally.appendChild(el('div', { class: 'tally__row' }, el('span', { class: 'who' }, el('i', { class: 'swatch swatch--C' }), 'Competitor'), uC, el('span', { class: 'n num', text: String(cell.c) })));
    colOut.appendChild(tally);
    CC.units(uT, 'T', cell.t, animate && lastCell ? Math.min(lastCell.t, cell.t) : null);
    CC.units(uC, 'C', cell.c, animate && lastCell ? Math.min(lastCell.c, cell.c) : null);
    lastCell = cell;

    if (cell.lines) {
      colOut.appendChild(el('div', { class: 'mini-label' }, el('span', { text: cell.t ? 'Lines citing the target' : 'Target not cited · lines citing the competitor' })));
      var exs = el('div', { class: 'excerpts' });
      cell.lines.forEach(function (ln) { exs.appendChild(el('p', null, CC.rich(ln, { animate: animate }))); });
      colOut.appendChild(exs);
      if (cell.al && cell.t) {
        var sh = cell.al[0], ns = cell.al[1];
        colOut.appendChild(el('div', { class: 'align-note' },
          el('span', { class: 'role', text: 'post hoc' }),
          el('span', { text: 'Alignment audit: ' + sh + ' of ' + cell.t + ' target citation' + (cell.t > 1 ? 's' : '') + ' backed a shared unit; ' + ns + (ns === 1 ? ' was' : ' were') + ' target-specific.' })));
      }
    }
  }

  function summary(c) {
    var p = c.p;
    var parts = [CC.TOPICS[p.topic], CC.PHRASINGS[p.phr], 'family ' + p.fam, 'pair ' + p.id];
    CC.clear(q);
    q.appendChild(el('div', { class: 'query' },
      CC.svg('svg', { width: 16, height: 16, viewBox: '0 0 16 16', 'aria-hidden': 'true' },
        CC.svg('circle', { cx: 7, cy: 7, r: 5, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6 }),
        CC.svg('path', { d: 'm11 11 3.5 3.5', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round' })),
      el('span', { text: p.q })));
    var meta = el('div', { class: 'lab__meta' });
    parts.forEach(function (t) { meta.appendChild(el('span', { text: t })); });
    meta.appendChild(el('span', { text: p.ok ? 'human-confirmed competition' : 'failed the human shared-evidence audit' }));
    q.appendChild(meta);
    if (c.f) q.appendChild(el('p', { class: 'ui', style: { 'font-size': 'var(--t-sm)', color: 'var(--ink-2)', 'max-width': '60rem' }, text: c.f.story }));

    CC.clear(foot);
    var eff = function (m) { return CC.pairEffect(p, m); };
    foot.appendChild(el('div', { class: 'readout' },
      el('span', null, 'Pair-level structure effect on count ', el('b', { text: CC.sign(eff('cnt'), 1) })),
      el('span', null, 'on incidence ', el('b', { text: CC.pp(eff('inc'), 0) + ' pp' })),
      el('span', null, 'rank effect on incidence ', el('b', { text: CC.pp(eff('rank'), 0) + ' pp' }))));
    var link = el('a', { href: '#explorer', class: 'ui', style: { 'font-size': 'var(--t-sm)' }, text: 'Open in the explorer →' });
    link.addEventListener('click', function () { if (CC.explorerSelect) CC.explorerSelect(p.id); });
    foot.appendChild(link);
  }

  function render(animate) {
    var c = current();
    var orig = originalOrder(c.p);
    var pos = positions(c.p, state.ord);
    var bits = ['target text (' + (state.arm === 'S' ? 'structured' : 'prose') + ' rewrite)'];
    if (state.ord !== orig) bits.push('slots #' + Math.min(pos.t, pos.c) + ' ↔ #' + Math.max(pos.t, pos.c) + ' swapped');
    else bits.push('original order kept');
    changed.textContent = 'Changed from the archive: ' + bits.join(' · ');
    CC.$$('button', ordSeg).forEach(function (b) {
      var o = b.getAttribute('data-v'), ps = positions(c.p, o);
      b.textContent = (o === 'H' ? 'Target higher' : 'Target lower') + ' (#' + ps.t + ')';
    });
    drawCall(c, animate);
    drawText(c);
    drawOut(c, animate);
  }

  function select(key) {
    ORDER.forEach(function (k) { tabBtns[k].setAttribute('aria-selected', String(k === key)); tabBtns[k].tabIndex = (k === key || (!key && k === ORDER[0])) ? 0 : -1; });
  }

  function load(key) {
    state.key = key; state.pair = null;
    var e = D.examples[key];
    var p = D.pairs.filter(function (x) { return x.id === e.pair; })[0];
    state.arm = FEATURED[key].arm;
    state.ord = originalOrder(p);
    armCtl.set(function (x) { return x.getAttribute('data-v') === state.arm; });
    ordCtl.set(function (x) { return x.getAttribute('data-v') === state.ord; });
    select(key);
    listEl = null; lastCell = null;
    summary(current());
    render(false);
  }
  function loadPair(p) {
    state.key = null; state.pair = p;
    state.arm = 'S'; state.ord = originalOrder(p);
    armCtl.set(function (x) { return x.getAttribute('data-v') === state.arm; });
    ordCtl.set(function (x) { return x.getAttribute('data-v') === state.ord; });
    select(null);
    listEl = null; lastCell = null;
    summary(current());
    render(false);
  }
  CC.labLoadPair = function (id) {
    var p = D.pairs.filter(function (x) { return x.id === id; })[0];
    var k = ORDER.filter(function (k) { return D.examples[k].pair === id; })[0];
    if (k) load(k); else if (p) loadPair(p);
  };

  load('passport');
})();
