Title: Collection map-over warnings, datatypes snapshot, per-output resolution for #224

Base: `denzasikora-lab:fix/validate-workflow-test-metadata` (#224's branch, at `e82bc455`). Head: `jmchilton:pr_224_kind_checks`.

---

This builds on #224's commit rather than replacing it: the five checks, the output `ftype` check, comma-split formats, the `multiple` skip and the two `connection-validation` fixes all stay. Each commit below is one change and can be reviewed, or dropped, on its own.

We had been working on #210 on a separate branch and ran the same corpora against both. On Galaxy's own `lib/galaxy_test/workflow` tests, which all pass in Galaxy, `e82bc455` reports 25 errors; on IWC it reports 3, or 4 with `--datatypes`. With these commits, both corpora report 0 new errors. The details are in the commits:

1. **`workflow-graph`: committed Galaxy datatypes snapshot.** usegalaxy.org's `types_and_mapping` response and `snapshotDatatypesMapper()`, refreshed with `make sync-datatypes`. Most of this PR's line count is this generated file.
2. **English comments.** Rewrites the four Russian comment lines.
3. **Input type aliases from the schema.** Format2 inputs typed `data_input`, `data_collection` or `data_collection_input` were skipped by the `data`/`File`/`collection` comparisons.
4. **Map-over is a warning.** Galaxy maps a workflow over a collection bound to a dataset input, or over a deeper collection (`list:list` into `list`, `list` into `paired_or_unpaired`). That accounts for 24 of the 25 Galaxy errors (9 `workflow_input_kind`, 15 `workflow_input_collection_type`). These are now `workflow_input_collection_map_over` warnings. A test that maps over an input skips its output checks, since resolved output shapes assume the declared inputs. Collection types are compared with `CollectionTypeDescription`, the editor's rules. Diagnostics gain an optional `severity`, and both reports gain `warnings[]`; warnings don't fail a file.
5. **`element_tests` without `class`.** planemo treats `element_tests` or `elements` without `class` as a collection assertion, and IWC writes tests that way (`fastp_html_report` in the sars-cov-2 workflows).
6. **`resolveWorkflowOutputs` in `connection-validation`, resolved per output.** Output shape and format resolution moves out of the CLI so the editor and gxwf-web can reuse it. An invalid connection now unsets only the outputs downstream of it, not every output in the workflow. Outputs of a step that can be skipped (`when`, or downstream of a `when` step) get no fixed format: Galaxy writes a skipped output as `expression.json`, and Galaxy's own `pick_value_skip_pja` test asserts exactly that.
7. **Filetypes checked against the snapshot by default.** Without `--datatypes`, the filetype check never ran. The snapshot is now the default, and `--datatypes` replaces it. A filetype outside the declared formats becomes a warning, because Galaxy can still run such a test (IWC's QIIME2 workflow gives `tabular` to a `tsv` input). A filetype Galaxy doesn't know is also a warning.
8. **Tests** for the above, ported from our branch.
9. **Shared `asRecord`/`asString`** for the cross-check modules.
10. **Docs and changeset.** Documents the checks, `--cache-dir` and `--datatypes`; regenerates the `gxwf-cli` skill; merges our changeset into yours, bumped to minor for the new report fields and `resolveWorkflowOutputs`.

Severities after this PR: errors are what Galaxy's test runner fails on (`workflow_input_kind`, `workflow_input_collection_type`, `workflow_output_kind`, `workflow_output_collection_type`, `workflow_output_datatype`). Map-over and filetype cases are warnings. planemo checks neither a dataset's `ftype` nor top-level `collection_type`, so those two output errors can flag a test that `planemo test` passes but Galaxy's runner fails.

Refs #210

🤖 Generated with [Claude Code](https://claude.com/claude-code)
