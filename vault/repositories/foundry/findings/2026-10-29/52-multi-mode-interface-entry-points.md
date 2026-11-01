# Interface and conditionals knowledge has no rule for multi-mode sources: one gated workflow or one per mode, and which collection operations survive a skipped branch

- Target: galaxyproject/foundry (`workflow-brief-to-galaxy-interface` Mold or `galaxy-workflow-testability-design`, and the conditionals MOC). The host behaviour behind it is Galaxy finding [47](47-galaxy-skipped-model-op-absent-optional-collection.md) and finding [11](11-galaxy-when-skip-model-operation.md). Foundry tracking needed: no (this is the Foundry issue).
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-viralrecon-v0-2026-10-31, phase 1 (interface chose one entry point), phase 2 (data-flow R1 risk), driver probes 2-3 and decision D1 (split after phase 4), 2026-11-01. Ledger `interface-mold-silent-on-multi-mode-entry-points` (major), `conditionals-patterns-silent-on-skipped-collection-ops` (major).
- Existing issues/PRs: none (searched "entry point", "multiple workflows"). Related: finding 21 (gate expressions), 42 (empty-list ops), #661 (fan-in after gated branches).

## Symptom
The brief left "one entry point or several" to design for Illumina vs Nanopore (disjoint read inputs, shared tail). Phase 1 chose one workflow with optional platform inputs, from sibling-run evidence outside the bundle. The template built it (321 steps). Driver probe 3 then showed the other platform could never run on 26.1 (finding 47), and the build was split by hand into two workflows (D1) after the template phase. Phase 2 also had to design around skipped collection operations without packaged guidance.

## Root cause
- Neither the interface Mold nor any note gives decision criteria for a multi-mode source: shared surface vs disjoint inputs, per-mode testability, one artifact vs several, required-when fail-fast checks for mode-exclusive inputs, and shared vs mode-prefixed output labels.
- The conditionals MOC covers gating single steps and `pick_value` merges, not gating whole branches containing collection operations, nor merging a skipped branch into a live tail (`__FILTER_NULL__` + `__MERGE_COLLECTION__`).
- Known host facts are not packaged. Probe 2 (26.1): 12 gated collection operations skip cleanly (`__FILTER_FAILED_DATASETS__`, `__FILTER_EMPTY_DATASETS__`, `__FILTER_NULL__`, `__MERGE_COLLECTION__`, `__HARMONIZELISTS__`, `__RELABEL_FROM_FILE__` tabular with a real labels file, `__FILTER_FROM_FILE__`, `__APPLY_RULES__`, `__BUILD_LIST__`, `__EXTRACT_DATASET__`, `__FLATTEN__`, `__ZIP_COLLECTION__`); invalid tool state fails even when skipped. Unsafe: content-reading ops fed a skipped file (finding 11) and any model op fed an absent optional collection (finding 47). An absent optional dataset into a required tool input errors the job unless the step is gated on that input (`when: $(inputs.when !== null)`).

## Evidence
`../prose-wb2g-viralrecon-v0-2026-10-31.bin/probe/PROBE_RESULTS.md` §2-3; `open-requirements.ledger.yml` decisions `interface-single-entry-point`, D1 split (pre-split draft kept as `galaxy-workflow-draft.single-entry.gxwf.yml`); `workflow-brief.md` open question on modes.

## Proposed fix
1. Interface (Mold step or testability note): a "mode-selected interface" section. Prefer one workflow per mode when modes have disjoint *collection* inputs (until finding 47 is fixed) or disjoint test cases; one gated workflow when modes share the input surface. Mode-exclusive inputs optional with a fail-fast check; shared outputs keep one label per workflow; record the null-output testing consequence. Make the choice in phase 1, not after the template.
2. Conditionals MOC: a "skipping branches with collection operations" section with the safe/unsafe table above (version-scoped to 26.1, citing findings 11 and 47), the `__FILTER_NULL__` + `__MERGE_COLLECTION__` live/skipped merge gated by the OR of its producers' gates, and "probe early".
3. Scenario + eval: the viralrecon case in both Molds' `scenarios.md`.

## Draft issue
**Title:** Interface/conditionals: no rule for multi-mode sources (one workflow vs one per mode) or for skipping branches that contain collection operations

nf-core/viralrecon (Illumina vs Nanopore) needs a call on one gated workflow vs one per platform. The interface Mold gives no criteria; the run chose one entry point, and after the template phase a probe showed that a `when`-false model operation fed an absent optional collection crashes scheduling on Galaxy 26.1 (upstream report pending), forcing a hand split. The conditionals MOC also lacks the skipped-collection-op facts a gated design needs (12 ops probed safe; content-reading ops and absent optional collections unsafe). Proposal: a mode-selected-interface section with decision criteria, a skipped-branch section in the conditionals MOC, scenarios for both Molds.
