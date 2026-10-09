/* Hero: replay the passport pair under prose and structured target renderings. */
(function () {
  'use strict';
  var CC = window.CC;
  var el = CC.el;
  var ex = CC.data && CC.data.examples && CC.data.examples.passport;
  var card = document.getElementById('hero-replay');
  if (!ex || !card) return;

  var docC = CC.$('#hero-doc-c', card);
  var docT = CC.$('#hero-doc-t', card);
  var topT = CC.$('#hero-doc-t-top', card);
  var snap = CC.$('#hero-snapshot', card);
  var others = CC.$('#hero-others', card);
  var answer = CC.$('#hero-answer', card);
  var total = CC.$('#hero-total', card);
  var tally = CC.$('#hero-tally', card);
  var both = CC.$('#hero-both', card);

  /* Archived order: competitor at #2, target at #3 (target lower). Only the target's text changes here. */
  var cells = { P: ex.cells.PL, S: ex.cells.SL };
  var arm = 'P';
  var last = null;

  function docTop(role, pos, title, dom, meta) {
    return [
      el('span', { class: 'rdoc__pos', text: '#' + pos }),
      el('span', { class: 'rdoc__title', title: title + ' · ' + dom, text: title }),
      meta || el('span'),
      CC.chip(role)
    ];
  }
  var metaC = el('span', { class: 'rdoc__meta', text: 'never edited' });
  var top = el('div', { class: 'rdoc__top' });
  docTop('C', ex.c.pos, 'Passport services FAQ', ex.c.dom, metaC).forEach(function (n) { top.appendChild(n); });
  docC.appendChild(top);
  docTop('T', ex.t.pos, ex.t.title, ex.t.dom, null).forEach(function (n) { topT.appendChild(n); });
  var labelT = el('div', { class: 'rdoc__label' });
  docT.insertBefore(labelT, snap);

  var rest = [];
  ex.call.forEach(function (dom, i) {
    var pos = i + 1;
    if (pos !== ex.t.pos && pos !== ex.c.pos) rest.push('#' + pos + ' ' + dom);
  });
  others.textContent = 'Both are ' + ex.t.dom + ' pages from the same search call. Unchanged: ' + rest.join(' · ');

  var rowT = el('div', { class: 'tally__row' }, el('span', { class: 'who' }, el('i', { class: 'swatch swatch--T' }), 'Target'), el('span', { class: 'units' }), el('span', { class: 'n num' }));
  var rowC = el('div', { class: 'tally__row' }, el('span', { class: 'who' }, el('i', { class: 'swatch swatch--C' }), 'Competitor'), el('span', { class: 'units' }), el('span', { class: 'n num' }));
  tally.appendChild(rowT);
  tally.appendChild(rowC);

  /* Both outcomes side by side, so the result reads at rest; each row also switches the rendering. */
  both.appendChild(el('span', { class: 'mini-label', text: 'Target citations, both renderings' }));
  var cmpRows = [['P', 'Prose'], ['S', 'Structured']].map(function (a) {
    var u = el('span', { class: 'units' });
    CC.units(u, 'T', cells[a[0]].t, null);
    var b = el('button', { type: 'button', class: 'hcmp__row', 'data-arm': a[0], 'aria-pressed': 'false', 'aria-label': a[1] + ' rendering: target cited ' + cells[a[0]].t + ' times' },
      el('span', { text: a[1] }), u, el('span', { class: 'n', text: String(cells[a[0]].t) }));
    b.addEventListener('click', function () {
      if (arm === a[0]) return;
      arm = a[0];
      seg.set(function (o) { return o.getAttribute('data-arm') === arm; });
      stopAuto();
      render(true);
    });
    both.appendChild(b);
    return b;
  });
  both.appendChild(el('p', { class: 'rstep__note', text: 'The competitor is cited in both: ' + cells.P.c + ' and ' + cells.S.c + ' times.' }));

  function render(animate) {
    var cell = cells[arm];
    var structured = arm === 'S';
    CC.clear(labelT);
    labelT.appendChild(el('span', null, 'text the model reads: ', el('b', { text: structured ? 'structured rewrite' : 'prose rewrite' })));
    labelT.appendChild(el('span', { text: (structured ? ex.words.structured : ex.words.prose) + ' words' }));
    CC.snapshot(snap, structured ? ex.text.structured : ex.text.prose);
    snap.scrollTop = 0;
    CC.clear(answer);
    answer.appendChild(el('p', null, CC.rich(cell.lines[0], { animate: animate })));
    total.textContent = cell.n + ' citations in this answer';
    CC.units(CC.$('.units', rowT), 'T', cell.t, animate && last ? last.t : null);
    CC.units(CC.$('.units', rowC), 'C', cell.c, animate && last ? Math.min(last.c, cell.c) : null);
    CC.$('.n', rowT).textContent = cell.t;
    CC.$('.n', rowC).textContent = cell.c;
    cmpRows.forEach(function (r) { r.setAttribute('aria-pressed', String(r.getAttribute('data-arm') === arm)); });
    if (animate && !CC.reduced()) {
      docT.classList.add('is-flash');
      setTimeout(function () { docT.classList.remove('is-flash'); }, 450);
    }
    last = cell;
  }

  var seg = CC.seg(CC.$('#hero-arm', card), function (b) {
    arm = b.getAttribute('data-arm');
    stopAuto();
    render(true);
  });

  render(false);

  /* One orchestrated moment: after a beat, flip prose to structured once. */
  var auto = 0;
  function stopAuto() { if (auto) { clearTimeout(auto); auto = 0; } }
  if (!CC.reduced() && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) {
        io.disconnect();
        auto = setTimeout(function () {
          auto = 0;
          arm = 'S';
          seg.set(function (o) { return o.getAttribute('data-arm') === 'S'; });
          render(true);
        }, 1800);
      }
    }, { threshold: 0.5 });
    io.observe(card);
  }
})();
