/* Explorer: all 113 pairs as 2x2 glyphs, with filters and a detail panel. Also the prompt catalogue. */
(function () {
  'use strict';
  var CC = window.CC;
  var D = CC.data;
  var el = CC.el;
  var grid = document.getElementById('ex-grid');
  if (D && grid) {
    var detail = document.getElementById('ex-detail');
    var summary = document.getElementById('ex-summary');
    var qIn = document.getElementById('ex-q');
    var topicSel = document.getElementById('ex-topic');
    var effSel = document.getElementById('ex-effect');
    var okBox = document.getElementById('ex-ok');
    var selected = 'P2B841667E0D2';
    var tiles = {};

    topicSel.appendChild(el('option', { value: 'all', text: 'All topics' }));
    CC.TOPIC_ORDER.forEach(function (t) { topicSel.appendChild(el('option', { value: t, text: CC.TOPICS[t] })); });

    function bin(n) { return n === 0 ? '' : n === 1 ? 'b1' : n <= 3 ? 'b2' : n <= 6 ? 'b3' : 'b4'; }
    var LABEL = ['prose, target higher', 'prose, target lower', 'structured, target higher', 'structured, target lower'];

    var groups = {};
    CC.TOPIC_ORDER.forEach(function (t) {
      var tilesBox = el('div', { class: 'ex-tiles' });
      var countEl = el('span', { class: 'faint' });
      var g = el('div', { class: 'ex-group' }, el('h5', null, CC.TOPICS[t], countEl), tilesBox);
      groups[t] = { node: g, box: tilesBox, count: countEl };
      grid.appendChild(g);
    });
    D.pairs.forEach(function (p) {
      var b = el('button', { type: 'button', class: 'ptile', 'aria-pressed': 'false', tabindex: '-1',
        'aria-label': p.q + '. Target citations: ' + p.cells.map(function (c, i) { return LABEL[i] + ' ' + c[0]; }).join(', ') + (p.ok ? '' : '. Failed the human audit.') });
      p.cells.forEach(function (c) { b.appendChild(el('i', { class: bin(c[0]) })); });
      if (!p.ok) b.appendChild(el('span', { class: 'bad', 'aria-hidden': 'true' }));
      b.addEventListener('click', function () { select(p.id, true); });
      CC.bindTip(b, function () {
        var e = CC.pairEffect(p, 'cnt');
        return [['tv', 'Structure effect ' + CC.sign(e, 1) + ' citations'], ['tq', '“' + (p.q.length > 120 ? p.q.slice(0, 118) + '…' : p.q) + '”'], ['tk', p.t.dom + ' vs ' + p.c.dom]];
      });
      tiles[p.id] = { btn: b, p: p };
      groups[p.topic].box.appendChild(b);
    });

    function matches(p) {
      var q = qIn.value.trim().toLowerCase();
      if (q) {
        var hay = (p.q + ' ' + p.t.dom + ' ' + p.c.dom + ' ' + p.t.title + ' ' + p.c.title + ' ' + p.fam + ' ' + p.id).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      if (topicSel.value !== 'all' && p.topic !== topicSel.value) return false;
      if (okBox.checked && !p.ok) return false;
      var e = CC.pairEffect(p, 'cnt');
      switch (effSel.value) {
        case 'up': return e > 0;
        case 'down': return e < 0;
        case 'flat': return e === 0;
        case 'admit': return CC.pairEffect(p, 'inc') !== 0;
        default: return true;
      }
    }

    function apply() {
      var shown = [], up = 0, down = 0, flat = 0;
      D.pairs.forEach(function (p) {
        var ok = matches(p);
        tiles[p.id].btn.hidden = !ok;
        if (ok) {
          shown.push(p);
          var e = CC.pairEffect(p, 'cnt');
          if (e > 0) up++; else if (e < 0) down++; else flat++;
        }
      });
      CC.TOPIC_ORDER.forEach(function (t) {
        var n = shown.filter(function (p) { return p.topic === t; }).length;
        groups[t].node.hidden = n === 0;
        groups[t].count.textContent = n + (n === 1 ? ' pair' : ' pairs');
      });
      CC.clear(summary);
      if (!shown.length) {
        summary.appendChild(el('span', { text: 'No pairs match these filters. Clear the search or pick another topic.' }));
      } else {
        summary.appendChild(el('span', null, 'Showing ', el('b', { text: String(shown.length) }), ' of 113 pairs'));
        summary.appendChild(el('span', null, 'Structured rendering raised the target’s count in ', el('b', { text: String(up) }), ', lowered it in ', el('b', { text: String(down) }), ', no change in ', el('b', { text: String(flat) })));
        summary.appendChild(el('span', { class: 'faint', text: 'pair level, averaged over both orders' }));
      }
      roving();
    }

    function roving() {
      var vis = visible();
      var cur = vis.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0] || vis[0];
      vis.forEach(function (b) { b.tabIndex = b === cur ? 0 : -1; });
    }
    function visible() {
      return D.pairs.map(function (p) { return tiles[p.id]; }).filter(function (t) { return !t.btn.hidden && !t.btn.closest('[hidden]'); })
        .map(function (t) { return t.btn; });
    }
    grid.addEventListener('keydown', function (e) {
      var keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (!(e.key in keys) && e.key !== 'Home' && e.key !== 'End') return;
      var vis = visible();
      var i = vis.indexOf(document.activeElement);
      if (i < 0) return;
      var n = e.key === 'Home' ? 0 : e.key === 'End' ? vis.length - 1 : Math.max(0, Math.min(vis.length - 1, i + keys[e.key]));
      vis.forEach(function (b) { b.tabIndex = -1; });
      vis[n].tabIndex = 0;
      vis[n].focus();
      e.preventDefault();
    });

    function select(id, user) {
      selected = id;
      Object.keys(tiles).forEach(function (k) { tiles[k].btn.setAttribute('aria-pressed', String(k === id)); });
      roving();
      var p = tiles[id].p;
      CC.clear(detail);
      detail.appendChild(el('span', { class: 'mini-label', text: 'Pair ' + p.id }));
      detail.appendChild(el('h4', { text: p.q }));
      var kv = el('dl', { class: 'kv' });
      [['Topic', CC.TOPICS[p.topic]], ['Phrasing', CC.PHRASINGS[p.phr]], ['Family', p.fam + ' (' + D.pairs.filter(function (x) { return x.fam === p.fam; }).length + ' pair' + (D.pairs.filter(function (x) { return x.fam === p.fam; }).length > 1 ? 's' : '') + ')'],
        ['Human audit', p.ok ? 'confirmed shared-evidence competition' : 'invalid: related, not the same proposition']].forEach(function (r) {
        kv.appendChild(el('dt', { text: r[0] })); kv.appendChild(el('dd', { text: r[1] }));
      });
      detail.appendChild(kv);
      [['T', p.t, 'target'], ['C', p.c, 'competitor']].forEach(function (d) {
        detail.appendChild(el('div', { class: 'docline' }, CC.chip(d[0]),
          el('div', { style: { display: 'grid', gap: '2px', 'min-width': '0' } },
            el('span', { class: 't', text: d[1].title }),
            el('span', { class: 'd', text: d[2] + ' · ' + d[1].dom + ' · originally #' + d[1].pos }))));
      });
      var hi = Math.min(p.t.pos, p.c.pos), lo = Math.max(p.t.pos, p.c.pos);
      var tb = el('tbody');
      [['Prose', 'target #' + hi, 0], ['Prose', 'target #' + lo, 1], ['Structured', 'target #' + hi, 2], ['Structured', 'target #' + lo, 3]].forEach(function (r) {
        var c = p.cells[r[2]];
        tb.appendChild(el('tr', null, el('td', null, r[0] + ' · ', el('span', { class: 'faint', text: r[1] })), el('td', { text: String(c[0]) }), el('td', { text: String(c[1]) }), el('td', { text: String(c[2]) })));
      });
      detail.appendChild(el('table', { class: 'cells-table' },
        el('thead', null, el('tr', null, el('th', { text: 'Replay' }), el('th', null, CC.chip('T')), el('th', null, CC.chip('C')), el('th', { text: 'all' }))), tb));
      detail.appendChild(el('div', { class: 'effects' },
        el('div', null, el('span', { class: 'k', text: 'structure effect, count' }), el('span', { class: 'v', text: CC.sign(CC.pairEffect(p, 'cnt'), 1) })),
        el('div', null, el('span', { class: 'k', text: 'structure effect, cited at all' }), el('span', { class: 'v', text: CC.pp(CC.pairEffect(p, 'inc'), 0) + ' pp' })),
        el('div', null, el('span', { class: 'k', text: 'rank effect, cited at all' }), el('span', { class: 'v', text: CC.pp(CC.pairEffect(p, 'rank'), 0) + ' pp' }))));
      var go = el('button', { type: 'button', class: 'btn btn--sm' }, 'Replay it in the lab ↑');
      go.addEventListener('click', function () {
        if (CC.labLoadPair) CC.labLoadPair(p.id);
        document.getElementById('lab').scrollIntoView({ behavior: CC.reduced() ? 'auto' : 'smooth' });
      });
      detail.appendChild(el('div', null, go));
      if (user && window.innerWidth < 980) detail.scrollIntoView({ behavior: CC.reduced() ? 'auto' : 'smooth', block: 'nearest' });
    }
    CC.explorerSelect = function (id) {
      if (!tiles[id]) return;
      qIn.value = ''; topicSel.value = 'all'; effSel.value = 'all'; okBox.checked = false;
      apply();
      select(id, false);
    };

    [qIn, topicSel, effSel, okBox].forEach(function (c) { c.addEventListener(c === qIn ? 'input' : 'change', apply); });
    apply();
    select(selected, false);
  }

  /* ---------- prompt catalogue ---------- */
  var box = document.getElementById('prompts');
  var P = window.CC_PROMPTS;
  if (box && P) {
    var tabs = el('div', { class: 'prompts__tabs', role: 'tablist', 'aria-label': 'Prompts' });
    var head = el('div', { class: 'prompts__head' });
    var pre = el('pre', { class: 'code', id: 'prompt-text', tabindex: '0', role: 'tabpanel' });
    box.appendChild(tabs); box.appendChild(head); box.appendChild(pre);
    var btns = [];
    function show(i, focus) {
      var p = P[i];
      btns.forEach(function (b, k) { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
      if (focus) btns[i].focus();
      pre.setAttribute('aria-labelledby', 'ptab-' + i);
      CC.clear(head);
      var copy = el('button', { type: 'button', class: 'btn btn--sm btn--ghost' }, el('span', { text: 'Copy' }));
      copy.addEventListener('click', function () {
        var lab = CC.$('span', copy);
        var done = function (m) { lab.textContent = m; setTimeout(function () { lab.textContent = 'Copy'; }, 1500); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(p.text).then(function () { done('Copied'); }, function () { done('Select the text to copy'); });
        else done('Select the text to copy');
      });
      head.appendChild(el('div', { style: { display: 'grid', gap: '4px', 'min-width': '0' } },
        el('p', null, el('b', { text: p.id + ' ' + p.label }), ' · ' + p.role + ' prompt. ' + p.note),
        el('span', { class: 'prompts__sha', text: p.file + '.liquid · sha256 ' + p.sha256 })));
      head.appendChild(copy);
      pre.textContent = p.text;
      pre.scrollTop = 0;
    }
    P.forEach(function (p, i) {
      var b = el('button', { type: 'button', role: 'tab', id: 'ptab-' + i, 'aria-controls': 'prompt-text' }, el('span', { class: 'pid', text: p.id + ' · ' + p.sha256.slice(0, 8) }), p.label);
      b.addEventListener('click', function () { show(i); });
      tabs.appendChild(b);
      btns.push(b);
    });
    tabs.addEventListener('keydown', function (e) {
      var i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      if (e.key === 'ArrowRight') { show((i + 1) % btns.length, true); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { show((i - 1 + btns.length) % btns.length, true); e.preventDefault(); }
    });
    show(1);
  }
})();
