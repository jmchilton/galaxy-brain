# Verification — #210 cross-check (2026-10-27)

"main" = `issue_210_datatypes_snapshot` `dd7a4397` CLI build: the CLI code is unchanged from `origin/main` `a0476900` (`@galaxy-tool-util/cli` 1.15.0). "branch" = `issue_210_test_kind_checks` `1cb4b41a`. Tool cache read offline: the default `~/.galaxy/tool_info_cache` (765 tools) unless noted.

## Real egapx repro (Foundry `egapx` worktree, `casts/claude/_emulated-runs/ncbi-egapx/`)

Unmodified `galaxy-workflow.gxwf-tests.yml`:
- main: `valid: true`.
- branch: `galaxy-workflow.gxwf-tests.yml: 1 validation error(s)` / `/0/outputs/star_bam: Output 'star_bam' is a 'list' collection but is asserted as a dataset; use class: Collection. [workflow_output_kind]`. This is the real defect from foundry#731 §2.

The issue's cases mutated in. Test 0 keeps the job inputs and changes outputs/filetype; test 1 binds `genome` as a Collection, since a map-over test skips output checks:

| Case | main | branch |
|---|---|---|
| dataset-form `star_bam` on a `list` output | pass | error `workflow_output_kind` |
| `filetype: bam` on `proteins` (`format: fasta`) | pass | warning `workflow_input_format` |
| `class: Collection` on data input `genome` | pass | warning `workflow_input_collection_map_over` |
| `collection_type: list:paired` on `stats` (`list`) | pass | pass: `stats` unresolved |
| `ftype: bam` on a fasta output | pass | pass (deferred, Phase C) |

Only 2 of 17 egapx outputs resolve (`mask_stats`, `star_bam`), even with all 12 workflow tools cached (`galaxy-tool-cache populate-workflow --cache-dir`). The first unresolved edge is the `target_proteins` subworkflow's `pick_value` step: connection validation skips its repeat inputs (`style_cond|type_cond|pick_from_N|value`), so everything downstream stays unknown. That's a connection-validation gap, not this branch's; it's a follow-up.

## Corpus sweeps (`validate-tests-tree --auto-workflow --json`, main vs branch)

- Galaxy `origin/dev` `a9a68082414` `lib/galaxy_test/workflow/` (53 pairs): 0 new errors, 24 map-over warnings. Only **3 outputs resolve**: its framework test tools aren't in the tool cache. So this corpus exercises the input checks, not the output checks. The first cut had 9 `workflow_input_kind` errors there, because Galaxy's own passing tests bind `class: Collection` to `data` inputs. That case is now a map-over warning, and the test's output checks are skipped.
- IWC `291268305` (127 tests files, 115 paired, **612 outputs resolved**): 0 new errors. The first cut had 24 `workflow_output_kind` errors: IWC asserts collections with `element_tests` and no `class: Collection`, which planemo accepts and Galaxy's schema rejects (these files already fail on main). `element_tests`/`elements` now count as collection form.
  - Warnings:
    - 2× `Post_Curation` `format: ["agp", " tabular"]` (leading space in the workflow's own tool_state, a real defect);
    - 1× QIIME2 `tsv` input given `tabular`;
    - 1× velocyto `list:list` into `list` (map-over).
- Summary counts are identical main vs branch on both corpora.

## Reference runner caveat

Galaxy's workflow test runner checks `ftype` and `collection_type` (`attributes.type`) exactly. Planemo (`planemo/test/_check_output.py`) never checks a dataset `ftype`, and reads only `attributes` (not top-level `collection_type`) for collections. So `workflow_output_collection_type` can flag a test that `planemo test` passes but Galaxy's runner fails. No IWC test hit this.
