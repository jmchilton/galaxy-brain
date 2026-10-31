# Collection patterns have no "look up a partner by key" recipe (IP → its control), and never mention `__CROSS_PRODUCT_FLAT__`

- Target: galaxyproject/foundry (`content/patterns/galaxy-collection-patterns.md` and a new pattern page). Galaxy already has the tools. Foundry tracking needed: no (this is the Foundry issue).
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-chipseq-v0-2026-10-30, phase 2 (data-flow), 2026-10-30. Ledger `collection-patterns-no-keyed-lookup-with-duplication` (major). The atacseq v0 run (2026-10-29) left the same control branch unbuilt (finding [27](27-scope-drops-without-brief-change.md), `controls-branch-dropped`).
- Existing issues/PRs: none (searched "keyed lookup", "CROSS_PRODUCT"). Related: #660 (topology repair has no split/duplicate/merge shape), #661 (fan-in after gated branches), #221.

## Symptom
ChIP-seq pairs each IP with its input control, and one control serves several IPs; each IP also needs its antibody's consensus SAF. The MOC covers sync, harmonize, relabel and reshape, all one-to-one. Relabel can't duplicate. Data-flow derived a recipe from Galaxy source (`lib/galaxy/tools/__init__.py:4156-4186, 4908-4967, 5108-5140` on release_26.1): `__CROSS_PRODUCT_FLAT__(IP, control, join ':')` → `__FILTER_FROM_FILE__` both outputs by the wanted `ip:control` keys → `__RELABEL_FROM_FILE__`. A driver probe confirmed it on 26.1, and the final workflow paired correctly in all five planemo cases (each IP against its own input; two inputs each serving two IPs).

## Root cause
Confirmed by reading the bundle at worktree `pipeline-run-chipseq` @ 38400847: `__CROSS_PRODUCT_FLAT__` appears only in `content/research/galaxy-collection-tools/index.md` and `iwc-transformations-survey`, in no pattern page and not in the MOC. No page covers a many-to-one lookup.

## Evidence
Run `workflow-brief-galaxy-data-flow.md` pairing E1-E6 and count lookup F15-F21; `../prose-wb2g-chipseq-v0-2026-10-30.bin/probe/PROBE_RESULTS.md` §4 (`ip1:c1, ip1:c2, ip2:c1, ip2:c2` → filter → `ip1_vs_c1, ip2_vs_c2`); `run-summary.md` "Controls".

## Proposed fix
New pattern page "lookup partner by key": cross product flat with an explicit separator, a key list built from the sample sheet (tabular), filter both outputs, relabel back to the left-hand ids. State the separator choices the tool offers (`_`, `:`, `-`), that the separator must not occur in identifiers, the |X|×|Y| copy cost (fine for tens of elements, not thousands), and the verified Galaxy release. Link it from the MOC "sync / harmonize" section and from the conditionals page where controls are optional.

## Draft issue
**Title:** Collection patterns: add a keyed partner lookup recipe (many-to-one), e.g. ChIP-seq IP → control

The collection MOC covers sync, harmonize, relabel and reshape, but nothing where each element of X needs a partner from Y and one partner serves several elements (ChIP-seq IP → input control; IP → its antibody's consensus SAF). Relabel can't duplicate, and `__CROSS_PRODUCT_FLAT__` is mentioned only in research notes. A wb2g nf-core/chipseq run (2026-10-30) derived the recipe from Galaxy source: `__CROSS_PRODUCT_FLAT__` (join `:`) → `__FILTER_FROM_FILE__` by the wanted `x:y` keys → `__RELABEL_FROM_FILE__`. It was verified on release_26.1 and paired correctly in five planemo cases. The atacseq sibling run dropped its controls branch instead.

Proposal: a pattern page with the recipe, separator rules, copy cost, and the verified release; link it from the MOC.
