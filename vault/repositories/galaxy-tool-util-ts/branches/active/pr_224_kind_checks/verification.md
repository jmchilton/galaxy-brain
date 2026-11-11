# Verification — #224 vs ours (2026-11-11)

Step 0 of [plan_pr_224.md](../../../issues/wip/210/plan_pr_224.md): measure #224's head before building on it.

Builds: main = `origin/main` `68451c8e` (#224's base); ours = `issue_210_test_kind_checks` `1cb4b41a`; #224 = `e82bc455`, run with and without `--datatypes` (the snapshot's `types_and_mapping`, exported to JSON). Command: `gxwf validate-tests-tree <dir> --auto-workflow --json`, default tool cache. Corpora: Galaxy `dev` `65e6daff233` `lib/galaxy_test/workflow/` (53 pairs) and IWC `d160c51f` `workflows/` (128 tests files, 117 paired). Both corpora moved since the 2026-10-27 sweeps in [our verification](../issue_210_test_kind_checks/verification.md), so all three builds were rerun here.

"New" means an error not present on main.

| | Galaxy new errors | IWC new errors | Warnings |
|---|---|---|---|
| ours | 0 | 0 | Galaxy: 24 map-over. IWC: 3 `workflow_input_format`, 1 map-over |
| #224 | 25 | 3 | none (no warning channel) |
| #224 `--datatypes` | 25 | 4 | none |

## #224's new errors

Galaxy (all from Galaxy's own passing workflow tests):
- 9× `workflow_input_kind`: `class: Collection` bound to a `data` input (`collection_semantics_cat*`, `rename_based_on_input_collection`). Galaxy maps the workflow over the collection.
- 15× `workflow_input_collection_type`: collections that map over the declared type (`list:list:list` into `list:list`, `list:paired` into `paired_or_unpaired`, and `list`/`sample_sheet` into `paired_or_unpaired`).
- 1× `workflow_output_datatype`: `pick_value_skip_pja` expects `ftype: expression.json` on a skipped output (`when: false`). Galaxy writes a skipped output as `expression.json`, whatever the tool XML says.

IWC:
- 2× `workflow_output_kind` on `fastp_html_report` (sars-cov-2 PE and SE): `element_tests` without `class: Collection`, which planemo treats as a collection.
- 1× `workflow_input_collection_type`: velocyto `list:list` into `list` (map-over).
- 1× `workflow_input_format` (with `--datatypes` only): QIIME2 `Metadata` expects `tsv`, the test gives `tabular`. Our branch reports this as a warning.

#224 hits only 2 `element_tests` cases on IWC where our first cut hit 24, probably because #224 drops output shapes for a workflow once any connection is invalid, so fewer outputs resolve. That's the per-output resolution item in the plan.

The `pick_value_skip_pja` case is new to the plan: the `ftype` check we keep from #224 has to skip outputs that can be skipped (steps with `when`), or downgrade them to a warning.

## Step 3: combined head `eb283dd8`

Same corpora, command and default tool cache as above; no `--datatypes`, so the bundled snapshot applies.

| | Galaxy new errors | IWC new errors | Warnings |
|---|---|---|---|
| `eb283dd8` | 0 | 0 | Galaxy: 24 map-over. IWC: 1 `workflow_input_format` (QIIME2 `tabular` into `tsv`), 1 map-over (velocyto) |

- All 25 Galaxy false errors and all 4 IWC ones from #224 are gone: the 24 map-over cases are warnings, `pick_value_skip_pja` resolves no fixed format, the 2 `fastp_html_report` `element_tests` cases count as collections, and QIIME2 is a warning.
- `pick_value_skip_pja` first survived the combined head: the graph builder drops pick_value's connections, so "downstream of a `when` step" now walks the workflow's own `input_connections`. Fixed inside the resolver commit, with a test.
- Our old branch had 3 IWC `workflow_input_format` warnings; 2 were `Post_Curation`'s `" tabular"` (a leading space in the workflow's format list). #224's extractor trims format entries, so that real workflow defect no longer shows. Kept #224's behavior.

### Output coverage (IWC, 1374 outputs in paired workflows)

Counted with each build's `loadWorkflowTestShape`. The local tool cache is much smaller than on 2026-10-27, so far fewer outputs resolve than the 612 in our old verification; the comparison between builds still holds.

| | outputs with a kind | with a collection type | with a fixed format |
|---|---|---|---|
| #224 `e82bc455` | 66 | 39 | 85 |
| `eb283dd8` | 71 | 39 | 49 |

The 36 formats lost are all VGP outputs (`Post_Curation`, `Scaffolding-HiC-VGP8`, `hi-c-map-for-assembly-manual-curation`, `Assembly-Hifi-HiC-phasing-VGP4`) downstream of `when` steps (5–39 per workflow). They're dropped on purpose: when a test turns the condition off, Galaxy writes those outputs as `expression.json`. A softer option is to keep their format and downgrade an `ftype` mismatch on a skippable output to a warning.

## Local gate

`pnpm build` and lint, format and typecheck pass. All package test suites pass except 3 `integration-tests` cases (`validate_legacy_encoding_skipped_2`, `validate_iwc_repeatmasking_stale_rejected`, disconnected-optional RuntimeValue), which fail the same way on `main` `68451c8e` here. `verify-test-format-schema`, `verify-user-tool-source-schema` and `check-sync-parsed-tools` fail on `main` too, because their inline `node -e` scripts trip over local Node 26.
