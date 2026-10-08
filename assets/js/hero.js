/* Hero: replay the passport pair under prose and structured target renderings. */
(function () {
  'use strict';
  var CC = window.CC;
  var ex = CC.data && CC.data.examples && CC.data.examples.passport;
  var card = document.getElementById('hero-replay');
  if (!ex || !card) return;

  var results = CC.$('#hero-results', card);
  var snap = CC.$('#hero-snapshot', card);
  var words = CC.$('#hero-words', card);
  var answer = CC.$('#hero-answer', card);
  var tally = CC.$('#hero-tally', card);
  var compare = CC.$('#hero-compare', card);
  var arm = 'P';
  var last = null;

  /* The archived call: target at position 3, competitor at 2 (original order = target lower). */
  var short = { t: 'After You Get Your New Passport', c: 'Passport services FAQ' };
  ex.call.forEach(function (dom, i) {
    var pos = i + 1;
    var role = pos === ex.t.pos ? 'T' : pos === ex.c.pos ? 'C' : null;
    var li = CC.el('li', { class: 'result' + (role ? ' result--' + role : ' result--dim') },
      CC.el('span', { class: 'result__pos', text: '#' + pos }),
      CC.el('span', { class: 'result__name' },
        role ? CC.el('b', { text: role === 'T' ? short.t : short.c }) : null,
        role ? ' · ' : '', dom),
      role ? CC.chip(role) : CC.el('span'));
    results.appendChild(li);
  });

  var rowT = CC.el('div', { class: 'tally__row' }, CC.el('span', { class: 'who' }, CC.el('i', { class: 'swatch swatch--T' }), 'Target'), CC.el('span', { class: 'units' }), CC.el('span', { class: 'n num' }));
  var rowC = CC.el('div', { class: 'tally__row' }, CC.el('span', { class: 'who' }, CC.el('i', { class: 'swatch swatch--C' }), 'Competitor'), CC.el('span', { class: 'units' }), CC.el('span', { class: 'n num' }));
  tally.appendChild(rowT);
  tally.appendChild(rowC);

  var cells = { P: ex.cells.PL, S: ex.cells.SL };
  CC.$('[data-arm="P"] .v', compare).textContent = 'target cited ' + cells.P.t + '×';
  CC.$('[data-arm="S"] .v', compare).textContent = 'target cited ' + cells.S.t + '×';

  function render(animate) {
    var cell = cells[arm];
    var text = arm === 'S' ? ex.text.structured : ex.text.prose;
    CC.snapshot(snap, text);
    snap.scrollTop = 0;
    words.textContent = (arm === 'S' ? ex.words.structured : ex.words.prose) + ' words';
    CC.clear(answer);
    cell.lines.slice(0, 1).forEach(function (ln) {
      answer.appendChild(CC.el('p', null, CC.rich(ln, { animate: animate })));
    });
    CC.units(CC.$('.units', rowT), 'T', cell.t, animate && last ? last.t : null);
    CC.units(CC.$('.units', rowC), 'C', cell.c, animate && last ? Math.min(last.c, cell.c) : null);
    CC.$('.n', rowT).textContent = cell.t;
    CC.$('.n', rowC).textContent = cell.c;
    CC.$$('[data-arm]', compare).forEach(function (d) { d.classList.toggle('is-on', d.getAttribute('data-arm') === arm); });
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
    }, { threshold: 0.6 });
    io.observe(card);
  }
})();
