# Workflow Brief note has no rule for source-bundled helper code, or for proposing a different scientific method

- Target: galaxyproject/foundry (`content/research/workflow-brief-design`, rev 6; the `nextflow-summary-to-workflow-brief` eval's scope property). Foundry tracking needed: yes (this is the Foundry issue).
- Seen in: /home/ubuntu/foundry-runs/prose-nf2wb-hic-2026-11-01, phase 2 (nextflow-summary-to-workflow-brief rev 2), 2026-11-01. Ledger id `brief-note-no-rule-for-bundled-helper-code-or-method-substitution` (gap, minor).
- Existing issues/PRs: none for the brief side. Related: #694 / PR #696 (open; edits the same note to rev 7, no overlap), #725 / PR #728 (open; scope-vs-source conflicts become open questions; close to half (b), does not cover method replacement), #672 / PR #710 (downstream vendoring of `bin/` scripts and templates in tool authoring), 56 (the summary-side gap), 10 item 9 (attribution tiers; the coordinator supplied the rule this run needed).
- hic v0 (/home/ubuntu/foundry-runs/prose-wb2g-hic-v0-2026-11-01, phase 2, ledger `data-flow-contract-silent-on-port-or-replace`): the downstream half. The interface handed port-or-replace of helpers to data-flow (ledger `hicpro-helpers-carriage`), but `galaxy-data-flow-draft-contract` gives it no home; hic wrote a 23-row table (16 user tools), and viralrecon invented the same section. Add to the proposal: data-flow records, per helper, the carriage class (wrapper candidate by repo, embedded user tool with container and verbatim-port rule, subsumed) and the cited reason no wrapper fits. The source-side binary/source mismatch hic found is finding [64](64-nf-core-hic-cutsite-trimming-binary-source-mismatch.md).

## Symptom
nf-core/hic 2.1.0: 9 of 29 processes run pipeline-bundled `bin/` helpers, seven Python/shell scripts and two committed x86-64 executables built from `bin/src/*.cpp`, and the valid-pair, duplicate and statistics semantics live there, not in a packaged tool. The writer had to invent how to say "reproduce the helpers' behaviour at the pin; packaging is a design question" without an availability claim, and whether to prefer rebuilding the binaries from source (it proposed rebuilding, medium confidence; `workflow-brief.md:110-114`). Separately, the obvious Galaxy shortcut is a different Hi-C method (HiCUP is what IWC carries, per the pre-plan). Nothing in the note says whether a brief may propose that; the coordinator had to say it in `caller-request.md` ("a scope change the brief may propose with evidence, not assume"), and the brief proposed keeping HiC-Pro (high) on that authority (`:106-108`).

## Root cause
`workflow-brief-design` rev 6 says named source tools are evidence, not Galaxy choices (`:46`), and bans tool availability claims, but:
- (a) it treats the source's tools as packages. It has no case where the result-defining code is the source repository itself, so it doesn't say what the brief records (the helper as behavioural reference, cited at the pin) and what it leaves to design (packaging, vendoring, rebuild vs committed binary).
- (b) it has no rule for replacing the source's scientific method. Its conflict rule (`:50`) covers expert intent vs source behaviour, and PR #728 adds scope vs source; neither says that swapping the method is a change of expert intent that the brief can only propose.

## Evidence
- Note `content/research/workflow-brief-design/index.md` @ 52808616: `:30` Requirements row, `:46` no tool availability or concrete versions, `:48` tool discovery belongs downstream, `:50` expert-vs-source conflicts only. `grep -n "helper\|bundled\|method"` finds nothing relevant.
- Brief: Requirements helper paragraph (`workflow-brief.md:81`), open questions "Is HiC-Pro's processing method kept…" (`:106`) and "How are the bundled helpers … carried?" (`:110`).
- `caller-request.md` coordinator context, second paragraph (helpers and `digest` are a carrying question; method substitution needs evidence).
- `summary-nextflow.json` warning `source fact (pipeline helpers, no schema field)`.

## Proposed fix
In `workflow-brief-design` (rebase after #696 and #728):
1. When source results depend on pipeline-bundled scripts, templates or binaries, the brief names them in Requirements as the behavioural reference at the source pin, with cites, and leaves packaging (wrapper, vendoring, rebuild) to design. No availability claim either way. For a committed binary, cite its in-repo source when there is one, and record whether byte-identity to the committed build is required as an open question, not a decision.
2. Replacing the source's scientific method (aligner pipeline, caller, normalisation scheme) is a change of expert intent. The brief may raise it only as an Open question with evidence that results stay equivalent and the affected acceptance criteria named; it is never written as an implementation detail, and "no Galaxy wrapper exists" is not evidence for it.
3. Mirror both in the brief Mold's eval scope property ("source and expert intent determine scope"): helpers are carried as requirements, and no method substitution appears outside Open questions.

## Draft issue
**Title:** workflow-brief-design: rules for source-bundled helper code and for proposing a different scientific method

The note treats source tools as packaged evidence and forbids availability claims, but has no rule for result-defining code shipped inside the source repo. nf-core/hic 2.1.0 runs 9 of 29 processes through `bin/` helpers (Python and shell scripts, plus two committed x86-64 binaries built from `bin/src/`), and HiC-Pro's valid-pair, duplicate and statistics semantics live there. A brief writer had to invent how to require "the helpers' behaviour at the pin" while leaving packaging to design, and whether to prefer rebuilding from source.

The note also has no rule for replacing the source's method (here HiC-Pro by another Hi-C pipeline, the easy route when Galaxy already has one). The caller had to say it is a scope change the brief may propose with evidence.

Proposal: (1) bundled helpers are named in Requirements as the behavioural reference at the pin, packaging left to design, binaries referenced by their in-repo sources; (2) a method substitution is an Open question with equivalence evidence, never an implementation detail; (3) matching eval assertions. Related: #696, #728 (same note/Mold), #672 / #710 (downstream vendoring), #665 (summary side).
