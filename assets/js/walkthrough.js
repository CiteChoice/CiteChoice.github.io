/* Walkthrough: one real record (CCV2_TRV06_02) through the eight pipeline stages. */
(function () {
  'use strict';
  var CC = window.CC;
  var ex = CC.data && CC.data.examples && CC.data.examples.globalentry;
  var root = document.getElementById('walk');
  if (!ex || !root) return;
  var el = CC.el;

  var textBox = CC.$('#walk-text', root);
  var viz = CC.$('#walk-viz', root);
  var timers = [];
  function later(fn, ms) { if (CC.reduced()) { fn(); return; } timers.push(setTimeout(fn, ms)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  var check = function () {
    return CC.svg('svg', { width: 14, height: 14, viewBox: '0 0 14 14', 'aria-hidden': 'true' },
      CC.svg('path', { d: 'm2.5 7.3 2.8 2.8 6-6.4', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  };
  var lock = function () {
    return CC.svg('svg', { width: 12, height: 12, viewBox: '0 0 12 12', 'aria-hidden': 'true' },
      CC.svg('rect', { x: 2, y: 5.2, width: 8, height: 5.6, rx: 1.4, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.3 }),
      CC.svg('path', { d: 'M4 5.2V3.8a2 2 0 0 1 4 0v1.4', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.3 }));
  };
  function label(text, right) { return el('div', { class: 'mini-label' }, el('span', { text: text }), right ? el('span', { text: right }) : null); }

  /* Facts for this record, from the archived run and the paper's Appendix E. */
  var UNITS = [
    ['U01', 'Eligibility criteria apply to Mobile Passport Control and Global Entry for U.S. arrivals.'],
    ['U02', 'Enrollment and cost details are available for Mobile Passport Control and Global Entry.'],
    ['U03', 'Availability exists at participating airports for Mobile Passport Control and Global Entry.'],
    ['U04', 'Speed and convenience differ for Mobile Passport Control versus Global Entry.'],
    ['U05', 'Mobile Passport Control is distinct from Trusted Traveler programs such as Global Entry.'],
    ['U06', 'App-use caveats apply to Mobile Passport Control and Global Entry.']
  ];
  var SHARED = { U01: 1, U02: 1, U06: 1 };
  var SEARCHES = [
    ['SC01', 'CBP Mobile Passport Control official Global Entry official fees interview current 2025 infrequent traveler comparison'],
    ['SC02', 'official CBP Mobile Passport Control eligibility participating airports no pre-approval free app official'],
    ['SC03', 'official CBP Global Entry fee interview required benefits TSA PreCheck official current']
  ];
  var QUOTES = [
    ['U02', 'cost', 'Cost | Free | $120 for 5-year membership', 'pay the $120 Global Entry application fee'],
    ['U06', 'app use', 'Must download and use the MPC app', 'The Global Entry Mobile App will allow members to validate their arrival…'],
    ['U01', 'eligibility', 'Available to U.S. citizens, U.S. lawful permanent residents…', 'Applicants may not qualify for Global Entry participation if they:']
  ];
  var cellsOrder = [['PH', 'Prose', 1], ['PL', 'Prose', 5], ['SH', 'Structured', 1], ['SL', 'Structured', 5]];

  var STEPS = [
    {
      phase: 0, title: 'A person-style question, its facts frozen first',
      body: ['The record comes from a 130-query frame: ten everyday topics crossed with five ways people phrase questions. This one is travel, phrased as a first-person scenario.',
        'Before any search runs, the facts an acceptable answer must cover are written down as atomic answer units and hashed into the run manifest. They cannot drift after documents are seen.'],
      sure: 'Answer units are frozen before retrieval.',
      draw: drawQuery
    },
    {
      phase: 0, title: 'The agent runs its own searches',
      body: ['A tool-using GPT-5.4 agent must search before answering. It can issue up to three parallel search_web calls per turn, over at most five turns, then answer with opaque citation handles.',
        'Here it sent three searches in its first turn and then answered. Every prompt, native message, retry and result object is archived. This is the only live pass; everything after runs on the frozen archive.'],
      sure: 'One authentic pass, then frozen.',
      draw: drawAgent
    },
    {
      phase: 0, title: 'Each call returns five results, in order',
      body: ['Each call returns five Exa results with up to 10,000 characters of page text each. The model receives only source ID, title, URL, date, author and text.',
        'There is no rank or relevance-score field, so order reaches the model only as position in the array. Positions 1 and 5 of the first call, both cbp.gov pages, will become this query’s competing pair.'],
      sure: 'No numeric rank or score is ever model-visible.',
      draw: drawResults
    },
    {
      phase: 1, title: 'A blinded audit checks the evidence',
      body: ['A separate Grok evaluator reads each document’s text with the title, domain, rank and any answer or citation hidden. It labels which frozen units the text supports.',
        'Support counts only when the evaluator returns a quote that is found verbatim in the archived text. Both pages support the cost, app-use and eligibility units, so citing either would be correct.'],
      sure: 'Exact-quote verification; paraphrases are downgraded.',
      draw: drawAudit
    },
    {
      phase: 1, title: 'Freeze the pair, pick the target by hash',
      body: ['Two same-call documents that share a supported unit, don’t contradict it and aren’t duplicates form a candidate pair. Screening picks one pair per query without ever seeing ranks, answers or citations.',
        'An outcome-blind hash of the seed, pair ID and source IDs then names the target, the document that will receive treatments. Here it is the Global Entry FAQ at rank 5. The Mobile Passport Control page becomes the competitor and is never edited.'],
      sure: 'Selection is blind to ranks and outcomes.',
      draw: drawFreeze
    },
    {
      phase: 2, title: 'Write two matched renderings of the target',
      body: ['From the target’s archived text, one call writes two versions at once: polished prose with paragraphs only, and polished structured with headings, short paragraphs and lists.',
        'Both must keep every claim, number, entity and caveat and stay within 25% in length. Code checks length and markup; a separate blinded pass must clear seven fidelity dimensions.'],
      sure: 'Both arms are rewrites, so editorial polish is held constant.',
      draw: drawTreat
    },
    {
      phase: 2, title: 'Replay the frozen transcript four times',
      body: ['The provider-native conversation is rebuilt with live search off. Each trial changes only declared fields: the target’s text, and in two cells the order of the pair inside its original call.',
        'An integrity gate diffs every trial against the baseline and fails closed on any other change. Then only the final answer is regenerated. Promoted to rank 1, the target was cited once in each text arm; left at rank 5, never. The competitor drew 5 to 7 citations everywhere.'],
      sure: 'All 452 trials passed the hash-verified integrity gate.',
      draw: drawReplay
    },
    {
      phase: 2, title: 'Check what the new citation was for',
      body: ['A citation can credit evidence both pages carried, or content only the target offered. A blinded alignment audit sees just the query, the shared units and the cited sentence, never the arm, rank or document.',
        'Here the promoted target’s citation backed TSA PreCheck eligibility, which is not one of the contested units. Position moved credit, but for a target-specific fact.'],
      sure: 'Alignment is a post-hoc, LLM-scored analysis.',
      draw: drawAlign
    }
  ];

  /* ---------- step visuals ---------- */
  function drawQuery(v) {
    var typed = el('span');
    var caret = el('span', { class: 'caret', 'aria-hidden': 'true' });
    var box = el('div', { class: 'searchbox' },
      CC.svg('svg', { width: 18, height: 18, viewBox: '0 0 16 16', 'aria-hidden': 'true' },
        CC.svg('circle', { cx: 7, cy: 7, r: 5, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6 }),
        CC.svg('path', { d: 'm11 11 3.5 3.5', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round' })),
      el('span', null, typed, caret));
    box.setAttribute('aria-label', ex.q);
    v.appendChild(box);
    if (CC.reduced()) { typed.textContent = ex.q; caret.remove(); }
    else {
      var i = 0;
      (function type() {
        i = Math.min(ex.q.length, i + 2);
        typed.textContent = ex.q.slice(0, i);
        if (i < ex.q.length) later(type, 18); else later(function () { caret.remove(); }, 900);
      })();
    }

    v.appendChild(label('Query frame', '10 topics × 5 phrasings · 130 queries'));
    var frame = el('div', { class: 'frame', role: 'img', 'aria-label': 'The query sits in the travel row and the first-person scenario column of the 10 by 5 frame.' });
    frame.appendChild(el('span'));
    var abbr = { nfb: 'Neutral', fps: 'First-person', psr: 'Primary source', peq: 'Plain English', tss: 'Terse' };
    CC.PHRASING_ORDER.forEach(function (k) { frame.appendChild(el('span', { class: 'hd' + (k === 'fps' ? ' is-hit' : ''), text: abbr[k] })); });
    var shortTopic = { ce: 'Electronics', food: 'Food safety', edu: 'Education', health: 'Health', diy: 'Home DIY', prod: 'Home products', legal: 'Legal & civic', fin: 'Finance', sw: 'Software', travel: 'Travel' };
    CC.TOPIC_ORDER.forEach(function (t) {
      frame.appendChild(el('span', { class: 'rl' + (t === 'travel' ? ' is-hit' : ''), text: shortTopic[t], title: CC.TOPICS[t] }));
      CC.PHRASING_ORDER.forEach(function (k) {
        frame.appendChild(el('span', { class: 'cell' + (t === 'travel' && k === 'fps' ? ' is-hit' : '') }));
      });
    });
    v.appendChild(frame);

    v.appendChild(label('Answer units for this record'));
    v.appendChild(el('div', { class: 'lockline' }, lock(), 'frozen before retrieval · append-only · SHA-256 in the run manifest'));
    var ul = el('ul', { class: 'unitlist' });
    UNITS.forEach(function (u) { ul.appendChild(el('li', null, el('span', { class: 'uid', text: u[0] }), el('span', { text: u[1] }), el('span'))); });
    v.appendChild(ul);
  }

  function drawAgent(v) {
    v.appendChild(el('div', { class: 'agent' },
      el('div', { class: 'agent__box' },
        el('span', { class: 'agent__icon', text: 'GPT' }),
        el('div', { style: { display: 'grid', gap: '6px' } },
          el('b', { class: 'ui', text: 'Tool-using answer agent · GPT-5.4' }),
          el('div', { class: 'agent__rules' },
            el('span', { text: 'search before answering' }), el('span', { text: '≤ 3 calls per turn' }),
            el('span', { text: '≤ 5 turns' }), el('span', { text: 'cite [[cite:SOURCE_ID]]' }))))));
    var turns = el('div', { class: 'turnbar', 'aria-hidden': 'true' });
    for (var i = 0; i < 5; i++) turns.appendChild(el('i', { class: i === 0 ? 'on' : '' }));
    v.appendChild(label('Turn 1 of 5', 'three parallel search_web calls'));
    v.appendChild(turns);
    var calls = el('div', { class: 'calls' });
    v.appendChild(calls);
    SEARCHES.forEach(function (s, i) {
      later(function () {
        calls.appendChild(el('div', { class: 'call viz-in' + (i === 0 ? ' is-pair' : '') }, el('span', { class: 'cid', text: s[0] }), el('span', { text: s[1] })));
      }, 250 + i * 520);
    });
    later(function () {
      v.appendChild(el('p', { class: 'note viz-in', text: 'Across the study the agent completed 129 of 130 queries with 346 search calls over 1,490 unique documents. Its answers carry a median of 29 citation markers over six distinct documents.' }));
    }, 250 + 3 * 520 + 200);
  }

  function resultRow(pos, dom, name, pairRole) {
    return el('li', { class: 'result' + (pairRole ? '' : ' result--dim'), style: pairRole ? { 'border-color': 'var(--ink)' } : null },
      el('span', { class: 'result__pos', text: '#' + pos }),
      el('span', { class: 'result__name' }, name ? el('b', { text: name }) : null, name ? ' · ' : '', dom),
      pairRole ? el('span', { class: 'role', text: 'pair' }) : el('span'));
  }

  function drawResults(v) {
    v.appendChild(label('SC01 · five results, in array order'));
    var ol = el('ol', { class: 'results' });
    ex.call.forEach(function (dom, i) {
      var pos = i + 1;
      var name = pos === 1 ? 'Mobile Passport Control (MPC)' : pos === 5 ? 'Global Entry Frequently Asked Questions' : null;
      ol.appendChild(resultRow(pos, dom || 'other result', name, pos === 1 || pos === 5));
    });
    v.appendChild(ol);
    v.appendChild(label('What the model receives for result #5, in replay'));
    var j = el('div', { class: 'json', tabindex: '0', 'aria-label': 'Model-visible JSON fields for one result' });
    var rows = [
      ['{', null], ['  "source_id": ', '"RF49E1C",'], ['  "title": ', '"Global Entry Frequently Asked Questions | U.S. Customs and Border Protection",'],
      ['  "url": ', '"https://www.cbp.gov/travel/trusted-traveler-programs/global-entry/frequently-asked-questions",'],
      ['  "published_date": ', 'null,'], ['  "author": ', 'null,'], ['  "text": ', '"Global Entry Frequently Asked Questions | U.S. Customs and …"'], ['}', null]
    ];
    rows.forEach(function (r, i) {
      j.appendChild(el('span', { class: 'k', text: r[0] }));
      if (r[1]) j.appendChild(document.createTextNode(r[1]));
      j.appendChild(document.createTextNode('\n'));
    });
    j.appendChild(el('span', { class: 'x', text: '  "rank": 5, "score": …' }));
    j.appendChild(document.createTextNode('   ← archived, never serialized'));
    v.appendChild(j);
    v.appendChild(el('p', { class: 'note', text: 'Source IDs are deterministic opaque handles, so an identifier can’t leak the original order either. A schema audit of 2,010 archived result objects found no other field.' }));
  }

  function drawAudit(v) {
    v.appendChild(label('The auditor sees text only'));
    var blind = el('div', { class: 'blind' });
    ['title', 'domain', 'rank', 'baseline answer', 'citations'].forEach(function (b) { blind.appendChild(el('span', { text: b })); });
    v.appendChild(blind);
    var pair = el('div', { class: 'docpair' });
    [['Document A', QUOTES[0][2]], ['Document B', QUOTES[0][3]]].forEach(function (d, i) {
      var bars = el('div', { class: 'redact' }, el('span', { text: d[0] }));
      [44, 28, 16].forEach(function (w, k) {
        var bar = el('i', { style: { width: '0px', transition: 'width .5s ease ' + (k * 90 + i * 140) + 'ms' } });
        bars.appendChild(bar);
        later(function () { bar.style.width = w + 'px'; }, 30);
      });
      pair.appendChild(el('div', { class: 'doc' }, bars,
        el('div', null, '…', el('mark', { text: d[1] }), '…'),
        el('span', { class: 'verify' }, check(), 'U02 · exact quote found in archived text')));
    });
    v.appendChild(pair);
    v.appendChild(label('Verified support for the shared units'));
    var t = el('table', { class: 'qtable' },
      el('thead', null, el('tr', null, el('th', { text: 'Unit' }), el('th', { text: 'MPC page' }), el('th', { text: 'Global Entry FAQ' }))));
    var tb = el('tbody');
    QUOTES.forEach(function (q, i) {
      tb.appendChild(el('tr', { class: i === 0 ? 'is-key' : '' }, el('td', null, el('b', { text: q[0] }), ' ' + q[1]), el('td', { class: 'q', text: '“' + q[2] + '”' }), el('td', { class: 'q', text: '“' + q[3] + '”' })));
    });
    t.appendChild(tb);
    v.appendChild(el('div', { style: { 'overflow-x': 'auto' } }, t));
    v.appendChild(el('p', { class: 'note', text: 'The units differ in how tightly they pin one proposition. Both pages state the $120 fee outright, so the human adjudicator treated cost as the decisive unit and confirmed the pair as a genuine competition, one of 103 of 113.' }));
  }

  function drawFreeze(v) {
    v.appendChild(label('Eight screening criteria', 'pair PC812B36BC572'));
    var crit = ['same model-issued search call', 'verified support for a shared unit', 'no material contradiction', 'no duplicate or syndicated text',
      'metadata complete for integrity diffs', 'unit coverage within two', 'length ratio at least 0.25', 'text suits a faithful rewrite'];
    var ul = el('ul', { class: 'checks' });
    crit.forEach(function (c, i) {
      var li = el('li', { style: { opacity: CC.reduced() ? 1 : 0, transition: 'opacity .3s ease' } }, check(), c);
      ul.appendChild(li);
      later(function () { li.style.opacity = 1; }, 80 + i * 110);
    });
    v.appendChild(ul);
    v.appendChild(label('Never visible to selection'));
    var blind = el('div', { class: 'blind' });
    ['original ranks', 'baseline answers', 'citation outcomes'].forEach(function (b) { blind.appendChild(el('span', { text: b })); });
    v.appendChild(blind);
    var a = el('div', null, el('span', { class: 'role-name', text: 'pair member' }), el('b', { text: 'Mobile Passport Control' }), el('span', { class: 'faint', text: 'cbp.gov · rank 1' }));
    var b = el('div', null, el('span', { class: 'role-name', text: 'pair member' }), el('b', { text: 'Global Entry FAQ' }), el('span', { class: 'faint', text: 'cbp.gov · rank 5' }));
    var coin = el('div', { class: 'coin' }, a, b);
    var box = el('div', { class: 'hashbox' }, el('code', { text: 'target = hash(seed, pair ID, sorted source IDs)' }), coin);
    v.appendChild(box);
    var flips = CC.reduced() ? 0 : 7, n = 0;
    function settle() {
      a.className = 'is-C'; b.className = 'is-T';
      CC.$('.role-name', a).textContent = 'competitor · never edited';
      CC.$('.role-name', b).textContent = 'target · receives treatments';
    }
    (function flip() {
      if (n >= flips) { settle(); return; }
      a.className = n % 2 ? 'is-T' : ''; b.className = n % 2 ? '' : 'is-T';
      n++;
      later(flip, 90 + n * 22);
    })();
    v.appendChild(el('p', { class: 'note', text: 'From at least 1,894 candidates, one machine-screened pair was frozen per query: 114 pairs. A fixed priority score (shared units, length ratio, coverage balance) picks it, with ties broken by pair ID.' }));
  }

  function drawTreat(v) {
    var arm = 'prose';
    var head = el('div', { class: 'chart-card__head' });
    var seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Rendering' },
      el('button', { type: 'button', 'aria-pressed': 'true', 'data-a': 'prose', text: 'Polished prose' }),
      el('button', { type: 'button', 'aria-pressed': 'false', 'data-a': 'structured', text: 'Polished structured' }));
    var wc = el('span', { class: 'mini-label' });
    head.appendChild(seg); head.appendChild(wc);
    v.appendChild(head);
    var snap = el('div', { class: 'snapshot snapshot--tall', tabindex: '0', 'aria-label': 'Target rendering excerpt' });
    v.appendChild(snap);
    function show() {
      CC.snapshot(snap, ex.text[arm]);
      wc.textContent = 'excerpt · full text ' + ex.words[arm] + ' words';
    }
    CC.seg(seg, function (btn) { arm = btn.getAttribute('data-a'); show(); });
    show();
    v.appendChild(label('Seven-dimension fidelity gate', 'all pass'));
    var ul = el('ul', { class: 'checks' });
    ['claim equivalence', 'no new facts', 'caveat preservation', 'quantitative fidelity', 'attribution fidelity', 'structure contrast', 'length balance'].forEach(function (c) { ul.appendChild(el('li', null, check(), c)); });
    ul.appendChild(el('li', null, check(), 'length ratio ' + (ex.words.structured / ex.words.prose).toFixed(2) + ' (limit 1.25)'));
    v.appendChild(ul);
    v.appendChild(el('p', { class: 'note', text: 'Source snapshot ' + ex.words.source.toLocaleString() + ' words. Both arms compress it symmetrically, so no replay cell uses the untouched original text.' }));
  }

  function drawReplay(v) {
    v.appendChild(label('2 × 2 replay of pair PC812B36BC572', 'answer model GPT-5.4'));
    var g = el('div', { class: 'grid22' });
    g.appendChild(el('span'));
    g.appendChild(el('span', { class: 'hd', text: 'Target promoted to #1' }));
    g.appendChild(el('span', { class: 'hd', text: 'Target at original #5' }));
    var cellsEl = {};
    ['Prose', 'Structured'].forEach(function (rowName, r) {
      g.appendChild(el('span', { class: 'rl', text: rowName }));
      [0, 1].forEach(function (cIdx) {
        var key = (r ? 'S' : 'P') + (cIdx === 0 ? 'H' : 'L');
        var c = ex.cells[key];
        var diff = cIdx === 0 ? 'Δ text ×2 · position ×2' : 'Δ text ×2';
        var uT = el('span', { class: 'units' }), uC = el('span', { class: 'units' });
        var node = el('div', { class: 'g22cell is-pending' },
          el('div', { class: 'diff' }, el('span', { text: diff }), el('b', { class: 'gate', text: '' })),
          el('div', { class: 'cnt' },
            el('div', null, CC.chip('T'), uT, el('span', { class: 'n', text: String(c.t) })),
            el('div', null, CC.chip('C'), uC, el('span', { class: 'n', text: String(c.c) }))));
        cellsEl[key] = { node: node, uT: uT, uC: uC, c: c };
        g.appendChild(node);
      });
    });
    v.appendChild(g);
    ['PH', 'PL', 'SH', 'SL'].forEach(function (key, i) {
      later(function () {
        var o = cellsEl[key];
        CC.$('.gate', o.node).textContent = 'gate ✓';
        o.node.classList.remove('is-pending');
        o.node.classList.toggle('is-hit', o.c.t > 0);
        CC.units(o.uT, 'T', o.c.t, 0);
        CC.units(o.uC, 'C', o.c.c, 0);
      }, 250 + i * 450);
    });
    v.appendChild(el('p', { class: 'note', text: 'Each trial is identical to the archived transcript except for the declared fields: the target’s text in both calls where it appeared, plus the two swapped slots. 15 source exposures across 3 search calls, all hash-checked.' }));
  }

  function drawAlign(v) {
    var ph = ex.cells.PH;
    v.appendChild(label('Prose arm, target promoted to #1 · cited sentence'));
    v.appendChild(el('div', { class: 'sentence' }, CC.rich(ph.lines[0])));
    var verdict = ex.alignment.filter(function (a) { return a.arm === 'prose'; })[0];
    var sv = ex.alignment.filter(function (a) { return a.arm === 'structured'; })[0];
    v.appendChild(el('div', { class: 'verdict' },
      el('span', { class: 'who', text: 'Blinded alignment auditor (prompt D.6)' }),
      el('span', { class: 'res' }, 'matched shared unit: ', el('b', { text: verdict ? verdict.unit : 'none' })),
      verdict ? el('q', { text: verdict.reason }) : null,
      sv ? el('span', { class: 'faint', text: 'Structured arm, same position: also ' + sv.unit + '.' }) : null));
    v.appendChild(label('All 1,313 target citations in the study'));
    v.appendChild(el('div', { class: 'split', role: 'img', 'aria-label': '48.6% shared evidence, 50.7% target-specific, 0.7% unclear' },
      el('div', { class: 's-shared', style: { 'flex-basis': '48.6%' }, text: '48.6% shared' }),
      el('div', { class: 's-specific', style: { 'flex-basis': '50.7%' }, text: '50.7% target-specific' }),
      el('div', { class: 's-unclear', style: { 'flex-basis': '0.7%' } })));
    v.appendChild(el('p', { class: 'note', text: 'Contrast the passport pair in the hero: there, all three structured-arm target citations aligned to shared units such as the six-month rule itself.' }));
  }

  /* ---------- stepper ---------- */
  var cur = 0;
  var dots = [];
  STEPS.forEach(function (s, i) {
    var btn = el('button', { type: 'button', class: 'stepdot', 'aria-label': 'Stage ' + (i + 1) + ': ' + s.title, title: s.title, text: String(i + 1) });
    btn.addEventListener('click', function () { go(i); });
    CC.$('[data-phase="' + s.phase + '"]', root).appendChild(btn);
    dots.push(btn);
  });

  var prev = el('button', { type: 'button', class: 'btn btn--ghost btn--sm' }, '← Back');
  var next = el('button', { type: 'button', class: 'btn btn--sm' }, 'Next stage →');
  var count = el('span', { class: 'count' });
  prev.addEventListener('click', function () { go(cur - 1); });
  next.addEventListener('click', function () {
    if (cur === STEPS.length - 1) document.getElementById('scale').scrollIntoView({ behavior: CC.reduced() ? 'auto' : 'smooth' });
    else go(cur + 1);
  });

  function go(i, initial) {
    if (i < 0 || i >= STEPS.length) return;
    clearTimers();
    cur = i;
    var s = STEPS[i];
    dots.forEach(function (d, k) {
      d.classList.toggle('is-done', k < i);
      if (k === i) d.setAttribute('aria-current', 'step');
      else d.removeAttribute('aria-current');
    });
    CC.clear(textBox);
    textBox.appendChild(el('span', { class: 'walk__num', text: 'Stage ' + (i + 1) + ' of ' + STEPS.length }));
    textBox.appendChild(el('h3', { text: s.title }));
    s.body.forEach(function (p) { textBox.appendChild(el('p', { text: p })); });
    textBox.appendChild(el('div', { class: 'guarantee' }, check(), s.sure));
    count.textContent = (i + 1) + ' / ' + STEPS.length;
    prev.disabled = i === 0;
    next.textContent = i === STEPS.length - 1 ? 'See it at scale ↓' : 'Next stage →';
    textBox.appendChild(el('div', { class: 'walk__nav' }, prev, next, count));
    CC.clear(viz);
    var inner = el('div', { class: initial ? '' : 'viz-in', style: { display: 'grid', gap: '14px', 'min-width': '0' } });
    viz.appendChild(inner);
    s.draw(inner);
  }
  root.addEventListener('keydown', function (e) {
    if (e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowRight') { go(cur + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { go(cur - 1); e.preventDefault(); }
  });

  go(0, true);
})();
