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
      meta,
      CC.chip(role)
    ];
  }
  var metaC = el('span', { class: 'rdoc__meta', text: 'never edited' });
  var top = el('div', { class: 'rdoc__top' });
  docTop('C', ex.c.pos, 'Passport services FAQ', ex.c.dom, metaC).forEach(function (n) { top.appendChild(n); });
  docC.appendChild(top);
  var metaT = el('span', { class: 'rdoc__meta' });
  docTop('T', ex.t.pos, ex.t.title, ex.t.dom, metaT).forEach(function (n) { topT.appendChild(n); });

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

  function render(animate) {
    var cell = cells[arm];
    var structured = arm === 'S';
    metaT.textContent = (structured ? 'structured · ' + ex.words.structured : 'prose · ' + ex.words.prose) + ' words';
    CC.snapshot(snap, structured ? ex.text.structured : ex.text.prose);
    snap.scrollTop = 0;
    CC.clear(answer);
    answer.appendChild(el('p', null, CC.rich(cell.lines[0], { animate: animate })));
    total.textContent = cell.n + ' citations in this answer';
    CC.units(CC.$('.units', rowT), 'T', cell.t, animate && last ? last.t : null);
    CC.units(CC.$('.units', rowC), 'C', cell.c, animate && last ? Math.min(last.c, cell.c) : null);
    CC.$('.n', rowT).textContent = cell.t;
    CC.$('.n', rowC).textContent = cell.c;
    CC.clear(both);
    var p = el('span', { text: 'prose ' + cells.P.t + '×' }), s = el('span', { text: 'structured ' + cells.S.t + '×' });
    both.appendChild(document.createTextNode('Target cited: '));
    both.appendChild(structured ? p : el('b', null, p));
    both.appendChild(document.createTextNode(' → '));
    both.appendChild(structured ? el('b', null, s) : s);
    both.appendChild(document.createTextNode('. The competitor is cited either way.'));
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
