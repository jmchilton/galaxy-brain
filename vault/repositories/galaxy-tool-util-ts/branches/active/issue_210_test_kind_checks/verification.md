# Verification — #210 cross-check (2026-10-27)

"main" = `issue_210_datatypes_snapshot` build (CLI unchanged from `origin/main` `a0476900`); "branch" = `issue_210_test_kind_checks` `8e4b0d7e`. Default tool cache (`~/.galaxy/tool_info_cache`, 765 tools), read offline.

## Real egapx repro (Foundry `egapx` worktree, `casts/claude/_emulated-runs/ncbi-egapx/`)

Unmodified `galaxy-workflow.gxwf-tests.yml`:
- main: `valid: true`.
- branch: `valid: false`, `/0/outputs/star_bam workflow_output_kind` — the real defect from foundry#731 §2 (`star_bam` is `list` via map-over, asserted as a dataset).

Issue's five cases, mutated into the tests file:

| Case | main | branch |
|---|---|---|
| `ftype: bam` on fasta output | pass | pass (deferred, Phase C) |
| `collection_type: list:paired` on `stats` (`list`) | pass | pass — `stats` unresolved: upstream `target_proteins` subworkflow uses uncached ToolShed tools (miniprot, pick_value), so downstream shapes are unknown and skipped |
| `class: Collection` on data input `genome` | pass | warning `workflow_input_collection_map_over` (Galaxy maps the workflow over it; see below) |
| `filetype: bam` on `proteins` (`format: fasta`) | pass | warning `workflow_input_format` |
| dataset-form `star_bam` on `list` output | pass | error `workflow_output_kind` |

Only 2 of 17 egapx outputs resolve offline with the default cache (`mask_stats`, `star_bam`).

## Corpus sweeps (`validate-tests-tree --auto-workflow --json`, main vs branch)

- Galaxy `origin/dev` `lib/galaxy_test/workflow/` (53 pairs): first pass had 9 `workflow_input_kind` errors — Galaxy's own passing tests bind `class: Collection` to `data` inputs (`collection_semantics_cat*`, `rename_based_on_input_collection`). Changed to map-over warning + skip that case's output checks. Final: 0 new errors, 24 map-over warnings.
- IWC `291268305` (127 tests files, 115 paired, 612 outputs resolved): first pass had 24 `workflow_output_kind` errors — IWC asserts collections with `element_tests` and no `class: Collection` (planemo's `for_collections` keys on `element_tests`; Galaxy schema rejects it, so these files already fail on main). Treated `element_tests`/`elements` as collection form. Final: 0 new errors; warnings: 2× `Post_Curation` `format: ["agp", " tabular"]` (leading space in the workflow's own tool_state — real defect), 1× QIIME2 `tsv` input given `tabular`, 1× velocyto `list:list` into `list` map-over.
- Summary counts identical main vs branch on both corpora.
