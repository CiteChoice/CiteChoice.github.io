"""Emit assets/js/prompts.js: the eight study prompts, verbatim, with SHA-256.

Usage: python3 tools/build_prompts.py <path-to-CiteChoice-repo> assets/js/prompts.js
"""
import hashlib, json, sys, glob
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()  # checkout of the CiteChoice research repository
PAPER_SHA8 = {'D.1': '8ef78b13', 'D.2': 'bfb73bf1', 'D.3': '8c88faa3', 'D.4': '23dbbdb8',
              'D.5': 'b0a455fa', 'D.6': 'abd01507', 'D.7': 'd98d2bc1', 'D.8': 'becb36ee'}
SPEC = [
    ('D.1', 'agent_loop_system', 'Acquisition agent', 'system',
     'The live agent contract: search before answering, bounded turns and calls, strict-JSON actions, opaque citation handles.'),
    ('D.2', 'answer_generation_system', 'Answer generation', 'system',
     'Used for every replayed trial. A generic product-style instruction; the model is never told documents are being compared.'),
    ('D.3', 'document_support_matrix_system', 'Evidence audit', 'system',
     'Defines the answer-bearing labels behind every pair. Blinded, with an explicit instruction not to reward order.'),
    ('D.4', 'structure_rewrite_system', 'Treatment generation', 'system',
     'Writes both renderings in one call. The editor is told not to reason about citations.'),
    ('D.5', 'structure_fidelity_audit_system', 'Fidelity audit', 'system',
     'A separate blinded pass gates every treatment on seven dimensions; one failure rejects it.'),
    ('D.6', 'shared_unit_alignment_system', 'Shared-unit alignment', 'system',
     'Post hoc. Sees only the query, the shared units and the cited sentences; never the arm, rank or document identity.'),
    ('D.7', 'unit_allocation_system', 'Unit expression and allocation', 'system',
     'Post hoc. Judges whether the answer expresses each shared unit and which neutral source tag is credited.'),
    ('D.8', 'factorial_replay_citation_repair_user', 'Citation repair', 'user',
     'Fires once if a final answer has no valid citation handle. Never triggered in the scaled GPT runs; Grok needed it for 121 of 219 answers.'),
]
out = []
for pid, name, label, role, note in SPEC:
    # several archived versions exist; take the one the paper's prompt catalogue hashes
    cands = [Path(p).read_bytes() for p in glob.glob(str(ROOT / 'data' / '**' / f'{name}.liquid'), recursive=True)]
    raw = next(c for c in cands if hashlib.sha256(c).hexdigest().startswith(PAPER_SHA8[pid]))
    out.append({'id': pid, 'file': name, 'label': label, 'role': role, 'note': note,
                'sha256': hashlib.sha256(raw).hexdigest(), 'text': raw.decode('utf-8').rstrip('\n')})
Path(sys.argv[2]).write_text('/* The eight CiteChoice prompts, verbatim from the archived run directories (SHA-256 of each file). */\n'
                             'window.CC_PROMPTS = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n')
for p in out:
    print(p['id'], p['sha256'][:8], len(p['text']))
