/* Hero: the passport target page shown as prose and as structured text, with how often each was cited. */
(function () {
  'use strict';
  var CC = window.CC;
  var el = CC.el;
  var ex = CC.data && CC.data.examples && CC.data.examples.passport;
  var duo = document.getElementById('hero-duo');
  if (!ex || !duo) return;

  /* Archived order (target below its competitor); the only change between the two cards is the target's text. */
  var ARMS = {
    P: { name: 'Prose', words: ex.words.prose, form: 'paragraphs', text: ex.text.prose, cell: ex.cells.PL },
    S: { name: 'Structured', words: ex.words.structured, form: 'headings, lists', text: ex.text.structured, cell: ex.cells.SL }
  };

  /* Render the serialized rendering as a small document: # and ## become headings, "- " lines a list. */
  function documentFrom(text) {
    var doc = el('div', { class: 'duo__doc', 'aria-hidden': 'true' });
    var list = null;
    text.split('\n').forEach(function (line) {
      var t = line.trim();
      if (!t) { list = null; return; }
      var h = t.match(/^(#{1,6})\s+(.*)$/);
      var li = t.match(/^[-*]\s+(.*)$/);
      if (h) { list = null; doc.appendChild(el(h[1].length === 1 ? 'h5' : 'h6', { text: h[2] })); }
      else if (li) {
        if (!list) { list = el('ul'); doc.appendChild(list); }
        list.appendChild(el('li', { text: li[1] }));
      } else { list = null; doc.appendChild(el('p', { text: t })); }
    });
    return doc;
  }

  function marks(node, n, animate) {
    CC.clear(node);
    if (!n) return;
    for (var i = 0; i < n; i++) {
      var c = CC.chip('T', 'T', animate);
      if (animate) c.style.animationDelay = (i * 220) + 'ms';
      node.appendChild(c);
    }
  }

  var counters = [];
  CC.$$('.duo__card', duo).forEach(function (card) {
    var a = ARMS[card.getAttribute('data-arm')];
    var num = el('span', { class: 'duo__num', text: String(a.cell.t) });
    var mk = el('div', { class: 'duo__marks', 'aria-hidden': 'true' });
    card.setAttribute('aria-label', a.name + ' version of the page: the answer cited it ' + a.cell.t + ' times; the unchanged page was cited ' + a.cell.c + ' times.');
    card.appendChild(el('div', { class: 'duo__top' },
      el('div', { class: 'duo__id' }, el('span', { class: 'duo__name', text: a.name }), el('span', { class: 'duo__meta' }, a.words + ' words', el('span', { class: 'd-only', text: ' · ' + a.form }))),
      el('div', { class: 'duo__score' }, el('span', { class: 'duo__what', text: 'Times cited' }), num, mk)));
    card.appendChild(el('div', { class: 'duo__sheet' }, documentFrom(a.text)));
    card.appendChild(el('p', { class: 'duo__comp' }, el('i', { class: 'swatch swatch--C', 'aria-hidden': 'true' }),
      el('span', null, el('span', { class: 'd-only', text: 'The other page, unchanged: cited ' }), el('span', { class: 'm-only', text: 'Other page: ' }), el('b', { text: a.cell.c + '×' }))));
    marks(mk, a.cell.t, false);
    counters.push({ num: num, mk: mk, n: a.cell.t });
  });

  var more = document.getElementById('duo-more');
  if (more) more.addEventListener('click', function () {
    var open = !duo.classList.contains('is-open');
    duo.classList.toggle('is-open', open);
    more.setAttribute('aria-expanded', String(open));
    more.textContent = open ? 'Show less' : 'Read both versions in full';
  });

  /* One quiet moment on first view: the structured card's citations land one by one. */
  if (!CC.reduced() && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      io.disconnect();
      counters.forEach(function (c) {
        if (!c.n) return;
        c.num.textContent = '0';
        CC.clear(c.mk);
        setTimeout(function () {
          marks(c.mk, c.n, true);
          for (var i = 1; i <= c.n; i++) (function (k) { setTimeout(function () { c.num.textContent = String(k); }, (k - 1) * 220 + 120); })(i);
        }, 700);
      });
    }, { threshold: 0.4 });
    io.observe(duo);
  }
})();
