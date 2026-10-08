/* CiteChoice page: shared helpers (DOM, rich text, statistics, tooltip, theme, nav). */
(function () {
  'use strict';

  var CC = (window.CC = window.CC || {});
  var D = (CC.data = window.CC_DATA);
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------- DOM ---------- */
  CC.$ = function (s, r) { return (r || document).querySelector(s); };
  CC.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function build(node, attrs, kids) {
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'text') node.textContent = v;
        else if (k === 'class') node.setAttribute('class', v);
        else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (p) { node.style.setProperty(p, v[p]); });
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
      });
    }
    (kids || []).forEach(function add(k) {
      if (k == null || k === false) return;
      if (Array.isArray(k)) k.forEach(add);
      else node.appendChild(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k);
    });
    return node;
  }
  CC.el = function (tag, attrs) { return build(document.createElement(tag), attrs, Array.prototype.slice.call(arguments, 2)); };
  CC.svg = function (tag, attrs) { return build(document.createElementNS(SVGNS, tag), attrs, Array.prototype.slice.call(arguments, 2)); };
  CC.clear = function (n) { while (n.firstChild) n.removeChild(n.firstChild); return n; };

  CC.reduced = function () { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; };
  CC.later = function (fn, ms) { return CC.reduced() ? (fn(), 0) : setTimeout(fn, ms); };

  /* ---------- labels ---------- */
  CC.TOPICS = {
    ce: 'Consumer electronics', food: 'Cooking & food safety', edu: 'Education & study methods',
    health: 'Low-acuity health', diy: 'Home DIY', prod: 'Home products', legal: 'Legal & civic',
    fin: 'Personal finance', sw: 'Software how-to', travel: 'Travel'
  };
  CC.TOPIC_ORDER = ['ce', 'food', 'edu', 'health', 'diy', 'prod', 'legal', 'fin', 'sw', 'travel'];
  CC.PHRASINGS = {
    nfb: 'Neutral fact bundle', fps: 'First-person scenario', psr: 'Primary-source request',
    peq: 'Plain-English question', tss: 'Terse search-style'
  };
  CC.PHRASING_ORDER = ['nfb', 'fps', 'psr', 'peq', 'tss'];
  CC.CELLS = ['PH', 'PL', 'SH', 'SL'];

  /* ---------- numbers ---------- */
  var MINUS = '−';
  CC.sign = function (v, d) {
    var r = Number(v.toFixed(d));
    if (r === 0) return (0).toFixed(d);
    return (r > 0 ? '+' : MINUS) + Math.abs(r).toFixed(d);
  };
  CC.pp = function (v, d) { return CC.sign(v * 100, d == null ? 1 : d); };
  CC.p3 = function (p) {
    if (p < 0.001) return '< .001';
    var s = p >= 0.995 ? '1.00' : p.toFixed(p < 0.01 ? 4 : 3);
    return s.replace(/^0/, '');
  };

  /* ---------- rich text: **bold** and {T}/{C}/{O} citation markers ---------- */
  CC.chip = function (kind, label, isNew) {
    return CC.el('span', { class: 'cite cite--' + kind + (isNew ? ' is-new' : ''), 'aria-label': kind === 'T' ? 'target citation' : kind === 'C' ? 'competitor citation' : 'other source citation' }, label || (kind === 'O' ? '·' : kind));
  };
  CC.rich = function (str, opts) {
    opts = opts || {};
    var frag = document.createDocumentFragment();
    var parts = String(str).split(/(\{[TCO]\}|\*\*[^*]+\*\*)/);
    parts.forEach(function (part) {
      if (!part) return;
      var m = part.match(/^\{([TCO])\}$/);
      if (m) { frag.appendChild(CC.chip(m[1], null, opts.animate && m[1] === 'T')); return; }
      var b = part.match(/^\*\*([^*]+)\*\*$/);
      if (b) { frag.appendChild(CC.el('strong', { text: b[1] })); return; }
      frag.appendChild(document.createTextNode(part));
    });
    return frag;
  };

  /* Model-visible text: keep the raw serialization, tint its markdown markers. */
  CC.snapshot = function (node, text) {
    CC.clear(node);
    String(text).split('\n').forEach(function (line, i, all) {
      var h = line.match(/^(#{1,6} )(.*)$/);
      var li = line.match(/^(\s*[-*] |\s*\d+\. )(.*)$/);
      if (h) node.appendChild(CC.el('span', null, CC.el('span', { class: 'md', text: h[1] }), CC.el('span', { class: 'h', text: h[2] })));
      else if (li) node.appendChild(CC.el('span', null, CC.el('span', { class: 'md', text: li[1] }), li[2]));
      else node.appendChild(document.createTextNode(line));
      if (i < all.length - 1) node.appendChild(document.createTextNode('\n'));
    });
  };

  /* Unit chart: one block per citation. */
  CC.units = function (node, kind, n, prev) {
    CC.clear(node);
    if (!n) { node.appendChild(CC.el('span', { class: 'zero', text: 'none' })); return; }
    for (var i = 0; i < n; i++) {
      var isNew = prev != null && i >= prev && !CC.reduced();
      var u = CC.el('i', { class: 'u-' + kind + (isNew ? ' is-new' : '') });
      if (isNew) u.style.animationDelay = ((i - prev) * 70) + 'ms';
      node.appendChild(u);
    }
  };

  /* ---------- tooltip ---------- */
  var tipEl = null;
  CC.tip = {
    show: function (anchor, rows) {
      tipEl = tipEl || document.getElementById('tip');
      if (!tipEl) return;
      CC.clear(tipEl);
      rows.forEach(function (r) { tipEl.appendChild(CC.el('div', { class: r[0], text: r[1] })); });
      tipEl.hidden = false;
      var b = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y, width: 0 };
      var tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
      var x = b.left + (b.width || 0) / 2 - tw / 2;
      var y = b.top - th - 10;
      if (y < 8) y = b.bottom + 10;
      x = Math.max(8, Math.min(window.innerWidth - tw - 8, x));
      tipEl.style.left = x + 'px';
      tipEl.style.top = y + 'px';
    },
    hide: function () { if (tipEl) tipEl.hidden = true; }
  };
  CC.bindTip = function (node, rowsFn) {
    var show = function () { CC.tip.show(node, rowsFn()); };
    node.addEventListener('pointerenter', show);
    node.addEventListener('focus', show);
    node.addEventListener('pointerleave', CC.tip.hide);
    node.addEventListener('blur', CC.tip.hide);
  };
  window.addEventListener('scroll', function () { CC.tip.hide(); }, { passive: true });

  /* ---------- responsive drawing ---------- */
  CC.responsive = function (node, draw) {
    var w = 0, raf = 0;
    function run(force) {
      var nw = Math.round(node.clientWidth);
      if (nw && (force || Math.abs(nw - w) > 1)) { w = nw; draw(w); }
    }
    run();
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { run(); }); }).observe(node);
    } else {
      window.addEventListener('resize', function () { run(); });
    }
    return { redraw: function () { run(true); } };
  };

  /* Segmented controls: one pressed button per group. */
  CC.seg = function (group, onPick) {
    var btns = CC.$$('button', group);
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        onPick(b);
      });
    });
    return {
      set: function (pred) { btns.forEach(function (o) { o.setAttribute('aria-pressed', String(!!pred(o))); }); }
    };
  };

  /* ---------- study data: pair and family effects ---------- */
  function cited(p, i) { return p.cells[i][0] > 0 ? 1 : 0; }
  function count(p, i) { return p.cells[i][0]; }
  CC.pairEffect = function (p, m) {
    if (m === 'inc') return (cited(p, 2) + cited(p, 3)) / 2 - (cited(p, 0) + cited(p, 1)) / 2;
    if (m === 'cnt') return (count(p, 2) + count(p, 3)) / 2 - (count(p, 0) + count(p, 1)) / 2;
    if (m === 'rank') return (cited(p, 0) + cited(p, 2)) / 2 - (cited(p, 1) + cited(p, 3)) / 2;
    throw new Error('unknown metric ' + m);
  };
  CC.families = function (m, onlyOk) {
    var by = {}, order = [];
    D.pairs.forEach(function (p) {
      if (onlyOk && !p.ok) return;
      if (!by[p.fam]) { by[p.fam] = []; order.push(p.fam); }
      by[p.fam].push(p);
    });
    return order.map(function (f) {
      var ps = by[f];
      var v = ps.reduce(function (s, p) { return s + CC.pairEffect(p, m); }, 0) / ps.length;
      return { fam: f, topic: ps[0].topic, pairs: ps, v: Math.round(v * 1e9) / 1e9 };
    });
  };
  CC.mean = function (a) { return a.reduce(function (s, v) { return s + v; }, 0) / a.length; };

  /* ---------- statistics (same procedures as the paper) ---------- */
  CC.rng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  CC.percentile = function (sorted, q) {
    var pos = q * (sorted.length - 1), lo = Math.floor(pos), hi = Math.ceil(pos), w = pos - lo;
    return sorted[lo] * (1 - w) + sorted[hi] * w;
  };
  /* Runs `total` replicates in animation-frame chunks; step(i, rand) returns one replicate value. */
  CC.chunked = function (total, chunk, step, onProgress, done) {
    var out = new Float64Array(total), i = 0, cancelled = false;
    function tick() {
      if (cancelled) return;
      var end = Math.min(total, i + chunk);
      for (; i < end; i++) out[i] = step(i);
      onProgress(out.subarray(0, i), i / total);
      if (i < total) requestAnimationFrame(tick); else done(out);
    }
    if (CC.reduced()) { chunk = total; }
    requestAnimationFrame(tick);
    return function cancel() { cancelled = true; };
  };

  /* ---------- page chrome: theme, nav, copy ---------- */
  var root = document.documentElement;
  var themeBtn = document.getElementById('theme-btn');
  var media = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  function effectiveTheme() {
    var t = root.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return media && media.matches ? 'dark' : 'light';
  }
  function syncThemeBtn() {
    if (!themeBtn) return;
    var dark = effectiveTheme() === 'dark';
    themeBtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    CC.$('.i-moon', themeBtn).hidden = dark;
    CC.$('.i-sun', themeBtn).hidden = !dark;
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('cc-theme', next); } catch (e) { /* storage unavailable: theme still applies for this view */ }
      syncThemeBtn();
    });
    if (media && media.addEventListener) media.addEventListener('change', syncThemeBtn);
    new MutationObserver(syncThemeBtn).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    syncThemeBtn();
  }

  var nav = document.getElementById('site-nav');
  var menuBtn = document.getElementById('menu-btn');
  if (nav && menuBtn) {
    menuBtn.addEventListener('click', function () {
      var open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) { nav.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false'); }
    });
  }
  if (nav && 'IntersectionObserver' in window) {
    var links = CC.$$('a', nav);
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0; });
      var best = null, bestR = 0;
      Object.keys(visible).forEach(function (id) { if (visible[id] > bestR) { bestR = visible[id]; best = id; } });
      links.forEach(function (a) { a.removeAttribute('aria-current'); });
      if (best && map[best]) map[best].setAttribute('aria-current', 'true');
    }, { rootMargin: '-45% 0px -50% 0px', threshold: [0, 0.01] });
    Object.keys(map).forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) io.observe(sec);
    });
    var fsec = document.getElementById('findings');
    if (fsec) { io.observe(fsec); }
  }

  CC.$$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var src = CC.$(btn.getAttribute('data-copy'));
      var label = CC.$('span', btn);
      var text = src ? src.textContent : '';
      function done(msg) { if (label) { label.textContent = msg; setTimeout(function () { label.textContent = 'Copy'; }, 1600); } }
      function fallback() {
        var r = document.createRange();
        r.selectNodeContents(src);
        var s = window.getSelection();
        s.removeAllRanges(); s.addRange(r);
        done('Selected, press Ctrl+C');
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done('Copied'); }, fallback);
      else fallback();
    });
  });
})();
