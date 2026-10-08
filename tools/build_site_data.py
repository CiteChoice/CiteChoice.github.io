"""Build assets/js/data.js for the CiteChoice project page from the archived runs.

Usage: python3 tools/build_site_data.py <path-to-CiteChoice-repo> assets/js/data.js

Only derived, shareable records are emitted: per-trial citation counts, pair
metadata (query, topic, titles, domains, positions), human-audit validity, and,
for three featured public-domain (US government) pairs, the treatment
renderings plus short answer excerpts.
"""
import json, re, sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(sys.argv[1]).resolve()  # checkout of the CiteChoice research repository
RUN = ROOT / 'data/structure_replay_runs/20260723-050814-structure-by-rank-scale-113'
REPEAT = ROOT / 'data/structure_repeatability_runs/20260723-064207-structure-repeatability-scale-30/records.jsonl'
ABL_VARIANTS = ROOT / 'data/structure_variant_runs/20260724-162054-mechanical-structure-ablation-114/tables/accepted_variants.jsonl'
ALIGN = ROOT / 'data/shared_unit_alignment_runs/20260724-162645-shared-unit-alignment-252/records.jsonl'
AUDIT = ROOT / 'reports/human_audit/human_audit_results.json'
OUT = Path(sys.argv[2])

def jl(p):
    with open(p) as f:
        return [json.loads(l) for l in f]

def dom(u):
    d = urlparse(u).netloc.lower()
    return d[4:] if d.startswith('www.') else d

def cell_key(r):
    return ('S' if r['content_arm'] == 'polished_structured' else 'P') + ('H' if r['target_assigned_rank'] == 'higher' else 'L')

recs = [r for r in jl(RUN / 'records.jsonl') if r['status'] == 'generated']
assert len(recs) == 452
invalid = set(json.load(open(AUDIT))['pair_level']['invalid_pair_ids'])
variants = {v['pair_id']: v for v in jl(RUN / 'tables/accepted_variants.jsonl')}
mech = {v['pair_id']: v for v in jl(ABL_VARIANTS)}

PHRASING = {
    'neutral_fact_bundle': 'nfb', 'first_person_scenario': 'fps', 'primary_source_lure': 'psr',
    'plain_english_lure': 'peq', 'terse_search_style': 'tss',
}
TOPIC = {
    'consumer_electronics_support_and_specs': 'ce', 'cooking_and_food_safety': 'food',
    'education_study_methods': 'edu', 'health_self_care_low_acuity': 'health',
    'home_diy_renter_homeowner_basic': 'diy', 'home_products_buying_advice': 'prod',
    'legal_civic_us_basics': 'legal', 'personal_finance_us_consumer': 'fin',
    'software_howto_security_productivity': 'sw', 'travel_logistics_us_plus_international': 'travel',
}

pairs = {}
for r in recs:
    pid = r['pair_id']
    phr = r['record_id'].split('_', 3)[3]
    p = pairs.setdefault(pid, {'id': pid, 'fam': r['answer_target_id'], 'topic': TOPIC[r['topic']],
                               'phr': PHRASING[phr], 'q': r['query'], 'ok': 0 if pid in invalid else 1, 'cells': {}})
    for t in r['intervention']['targets']:
        side = 't' if t['original_source_id'] == r['target_source_id'] else 'c'
        p[side] = {'pos': t['before']['position'], 'title': t['before']['title'].strip(), 'dom': dom(t['before']['url'])}
    o = r['outcome']
    p['cells'][cell_key(r)] = [o['target_citation_count'], o['competitor_citation_count'], len(r['citations'])]

pair_list = sorted(pairs.values(), key=lambda p: (p['topic'], p['fam'], p['id']))
for p in pair_list:
    assert set(p['cells']) == {'PH', 'PL', 'SH', 'SL'}
    p['cells'] = [p['cells'][k] for k in ('PH', 'PL', 'SH', 'SL')]  # fixed order

# ---- repeatability: 30 pairs x 4 cells, first vs fresh generation ----------
rep = []
for r in (x for x in jl(REPEAT) if x['status'] == 'generated'):
    k = cell_key(r)
    g1 = pairs[r['pair_id']]['cells'][('PH', 'PL', 'SH', 'SL').index(k)][0]
    rep.append([r['pair_id'], k, g1, r['outcome']['target_citation_count']])
rep.sort(key=lambda x: (pairs[x[0]]['topic'], pairs[x[0]]['fam'], x[0], ('PH', 'PL', 'SH', 'SL').index(x[1])))
assert len(rep) == 120

# ---- featured examples ------------------------------------------------------
CITE = re.compile(r'\[\[cite:([A-Z0-9]+)\]\]')

def tokenize(line, th, ch):
    """Convert [[cite:X]] handles to {T}/{C}/{O} markers; trim long prose."""
    line = line.strip()
    if line.startswith('- '):
        line = line[2:]
    line = re.sub(r'^\d+\.\s+', '', line)
    m = re.search(r'((?:\s*\[\[cite:[A-Z0-9]+\]\])+)\s*\.?\s*$', line)
    tail = ''
    if m:
        tail = m.group(1)
        body = line[:m.start()].rstrip()
    else:
        body = line
    # inline cites inside body
    def rep_(mm):
        h = mm.group(1)
        return '{T}' if h == th else ('{C}' if h == ch else '{O}')
    if len(body) > 300:
        cut = body[:300].rsplit(' ', 1)[0].rstrip(',;:')
        body = cut + '…'
    body = CITE.sub(rep_, body)
    tail = ''.join(rep_(mm) for mm in CITE.finditer(tail))
    return (body + (' ' + tail if tail else '')).strip()

def excerpt_lines(r, prefer, n=2):
    th = r['source_handle_map'][r['target_source_id']]
    ch = r['source_handle_map'][r['competitor_source_id']]
    lines = [ln for ln in r['final_answer'].split('\n') if ln.strip()]
    out = []
    for who in prefer:
        h = th if who == 'T' else ch
        for ln in lines:
            if f'[[cite:{h}]]' in ln and len(ln.strip()) > 30:
                tok = tokenize(ln, th, ch)
                if tok not in out:
                    out.append(tok)
            if len(out) >= n:
                break
        if out:
            break
    return out

def words(s):
    return len(s.split())

def clip_words(s, n):
    """Keep the first n words, preserving line breaks; end on a full line."""
    out, count = [], 0
    for line in s.split('\n'):
        w = len(line.split())
        if count + w > n and out:
            break
        out.append(line)
        count += w
    return '\n'.join(out).rstrip() + ('\n…' if count < words(s) else '')

align = {}
for a in jl(ALIGN):
    if a['pair_id'] in ('PC812B36BC572', 'P2B841667E0D2', 'P50955652FFFC'):
        k = ('S' if a['content_arm'] == 'polished_structured' else 'P') + ('H' if 0 else '')
        align.setdefault(a['pair_id'], []).append(a)

FEATURE = {
    'passport': ('P2B841667E0D2', None),
    'globalentry': ('PC812B36BC572', 260),
    'acetaminophen': ('P50955652FFFC', 260),
}
CALLS = {  # model-visible result list of the pair's search call (positions 1-5, original order)
    'passport': ['travel.state.gov', 'travel.state.gov', 'travel.state.gov', 'cbp.gov', 'iata.org'],
    'globalentry': ['cbp.gov', 'cbp.gov', 'cbp.gov', 'ttp.cbp.dhs.gov', 'cbp.gov'],
    'acetaminophen': ['law.cornell.edu', 'govinfo.gov', None, 'dailymed.nlm.nih.gov', 'medlineplus.gov'],
}
examples = {}
for key, (pid, clip) in FEATURE.items():
    rs = {cell_key(r): r for r in recs if r['pair_id'] == pid}
    p = pairs[pid]
    v = variants[pid]['generation']
    mv = mech[pid]['generation']
    prose, struct, mlist = v['polished_prose']['text'], v['polished_structured']['text'], mv['polished_structured']['text']
    assert prose.split() == [w for w in mlist.split() if w != '-']
    by_trial = {a['trial_id']: a for a in align.get(pid, [])}
    cells = {}
    for k, r in rs.items():
        o = r['outcome']
        cells[k] = {'t': o['target_citation_count'], 'c': o['competitor_citation_count'], 'n': len(r['citations']),
                    'lines': excerpt_lines(r, ['T', 'C'])}
        a = by_trial.get(r['trial_id'])
        if a:  # post-hoc blinded alignment of each target citation to the pair's shared units
            cells[k]['al'] = [a['shared_unit_citation_count'], a['nonshared_citation_count'], a['unclear_citation_count']]
        elif o['target_citation_count']:
            raise SystemExit(f'missing alignment for cited trial {r["trial_id"]}')
    examples[key] = {
        'pair': pid, 'fam': p['fam'], 'topic': p['topic'], 'phr': p['phr'], 'q': p['q'],
        't': p['t'], 'c': p['c'], 'call': CALLS[key],
        'words': {k: variants[pid]['deterministic_validation'][k + '_word_count'] for k in ('source', 'prose', 'structured')},
        'text': {'prose': prose if clip is None else clip_words(prose, clip),
                 'structured': struct if clip is None else clip_words(struct, clip),
                 'mechanical': mlist if clip is None else clip_words(mlist, clip)},
        'units': [{'id': u['unit_id'], 'text': u['text']} for u in variants[pid]['shared_answer_units']],
        'cells': cells,
    }

# alignment verdicts for the walkthrough's promoted target (rank 1 cells)
ge_align = []
for a in align.get('PC812B36BC572', []):
    ex = {e['citation_index']: e['claim_excerpt'] for e in a['claim_excerpts']}
    for al in a['alignments']:
        ge_align.append({'arm': a['content_arm'].replace('polished_', ''), 'rank': a['rank_assignment'],
                         'unit': al['matched_unit_id'], 'reason': al['reason']})
examples['globalentry']['alignment'] = ge_align

data = {'pairs': pair_list, 'repeat': rep, 'examples': examples}
js = ('/* Generated by build_site_data.py from the archived CiteChoice runs (scaled wave).\n'
      '   Derived records only: per-trial citation counts, pair metadata, human-audit validity,\n'
      '   and treatment text for three featured U.S.-government pages. Cells are ordered\n'
      '   [prose/target-higher, prose/target-lower, structured/higher, structured/lower];\n'
      '   each cell is [target citations, competitor citations, total citation markers]. */\n'
      'window.CC_DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
OUT.write_text(js)
print('wrote', OUT, len(js), 'bytes')
