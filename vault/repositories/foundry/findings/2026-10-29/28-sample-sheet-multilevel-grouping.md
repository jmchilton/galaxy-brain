# galaxy-sample-sheet-collections has no guidance for nested sample sheets (sample > replicate > run) regrouped at two levels

- Target: galaxyproject/foundry (`content/research/galaxy-sample-sheet-collections/index.md`, "Mapping from Nextflow sample sheets"). Nothing upstream: Galaxy and galaxy-tool-util stage what's needed. Foundry tracking needed: no, the target issue is the tracking issue for the grouping half. The test-staging half belongs on #579.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-atacseq-v0-2026-10-29, phase 1 (workflow-brief-to-galaxy-interface rev 5), 2026-10-29. Ledger `sample-sheet-note-silent-on-multilevel-grouping-and-test-staging` (minor).
- Existing issues/PRs: [#579](https://github.com/galaxyproject/foundry/issues/579) (open) is the test-staging half: no packaged note documents the `sample_sheet` + `rows:` job shape. Comment there and don't file it again. Grouping half: none. Related: #663 (`paired_or_unpaired` has no read-consuming wrapper), #267 (collection-shape selection note).
- chipseq: v0 (/home/ubuntu/foundry-runs/prose-wb2g-chipseq-v0-2026-10-30, phase 1): ledger `sample-sheet-note-element-identifier-control-overclaims`: the note maps nf-core `control` to an `element_identifier` column, but chipseq's control names a library (`<control>_REP<n>`, `bin/check_samplesheet.py:131,231`) that may merge several run rows; add the caveat to the hierarchical-sheets section. Ledger `sample-sheet-note-missing-test-job-syntax` is #579's half again, plus the sample_sheet → list normalisation for tool inputs (`type_description.py`). Staging drops `column_definitions` (finding [33](33-staging-drops-sample-sheet-column-definitions.md)), and splitting a sheet needs `__CONVERT_SAMPLE_SHEET__` first (finding [34](34-split-paired-unpaired-rejects-sample-sheet.md)).

## Symptom
nf-core/atacseq run ids are `<sample>_REP<r>_T<n>` (`bin/check_samplesheet.py:203`). Runs merge into libraries, and replicates into samples: two regroupings. The note maps nf-core sample sheets to `sample_sheet*` types but doesn't cover nesting. The interface Mold had to choose between typed `sample_sheet` columns and an identifier-encoded hierarchy regrouped with Apply Rules, without guidance. It chose one `list:paired_or_unpaired` with `<sample>_REP<r>_T<n>` identifiers. It also checked galaxy-tool-util source by hand (`galaxy/tool_util/cwl/util.py:366,639`, 26.1.2) to confirm that planemo can stage `sample_sheet` rows and `paired_or_unpaired` at all.

## Root cause
Confirmed by reading the note. "Mapping from Nextflow sample sheets" (`index.md:119-140`) gives one row per sheet shape: flat, paired, mixed via inner `paired_or_unpaired` (`:128`). It has no row or paragraph for hierarchical sheets. "Workflow integration" (`:102-118`) shows a `replicate` column (`:113`) but not how a workflow regroups by it. `API surfaces` (`:96-100`) covers `rows` for the API, not for test jobs (#579). The mixed-layout split (`__SPLIT_PAIRED_AND_UNPAIRED__`) is in `galaxy-paired-or-unpaired-collections` and `galaxy-collection-tools`, and this note doesn't link it.

## Evidence
The run's interface brief and discovery `iwc-atacseq-interface-precedent`. The chosen design held: planemo attempt 3 green, with 6 libraries and 2 merged-replicate samples regrouped by Apply Rules over identifiers.

## Proposed fix
Add "Hierarchical sheets" under the Nextflow mapping section:
- Option A: identifier-encoded hierarchy (`<sample>_REP<r>_T<n>`) on a flat `list` / `list:paired_or_unpaired`, regrouped with `__APPLY_RULES__` regex. Works with every wrapper and has IWC precedent, but identifiers carry structure.
- Option B: typed `sample_sheet` columns (`sample`, `replicate`), regrouped via `sample_sheet_to_tabular` + relabel/filter. More explicit, little tool or IWC support yet.
- Name the trade-offs. Link the mixed-layout split note. Point to #579's job-shape example once it exists.

## Draft issue
**Title:** galaxy-sample-sheet-collections: add guidance for hierarchical sheets (sample > replicate > run) regrouped at two levels

In an nf-core/atacseq Workflow Brief → Galaxy run (2026-10-29), run ids are `<sample>_REP<r>_T<n>` and merge at two levels (runs → libraries → samples). `galaxy-sample-sheet-collections` maps flat, paired and mixed sheets, but has nothing on nested sheets. The interface Mold had to choose between an identifier-encoded hierarchy regrouped by Apply Rules and typed `sample_sheet` columns, without trade-offs to go on. It chose identifiers on one `list:paired_or_unpaired`, which ran green.

Proposal: a "Hierarchical sheets" section with both options, their trade-offs (wrapper support, IWC precedent, identifier coupling), the regroup recipes, and a link to the `__SPLIT_PAIRED_AND_UNPAIRED__` note for mixed layouts.

Comment for #579:

> Another case: in an nf-core/atacseq wb2g run (2026-10-29) the interface Mold had to read galaxy-tool-util 26.1.2 (`galaxy/tool_util/cwl/util.py:366,639`) to confirm that planemo test jobs can stage `sample_sheet` rows and `paired_or_unpaired` before it chose an input shape. A worked job example here would have answered that from the bundle.
