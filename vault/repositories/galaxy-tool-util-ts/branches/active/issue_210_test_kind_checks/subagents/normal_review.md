# Normal review debrief — `issue_210_test_kind_checks`

Reviewed `519e956e..8e4b0d7e` (now rebased: `a3494e70..46dba28f`). Fixed P1 1 (reproduced by reviewer): output shapes assume the declared input collection types, so an accepted-but-different job type (`sample_sheet` into `list`, anything into an untyped collection input, which the graph resolves as `list`) produced exact-match output errors on tests Galaxy passes. The map-over skip is now a "job collection differs from declared" skip, red→green. Also fixed: verbatim `format` match no longer warns when the snapshot lacks the datatype (shed types); `Object.hasOwn` for the known check; tree-command `warnings` test; `filetype: auto` and shed-type tests; docs say the default cache is read without `--cache-dir`. Re-ran egapx + Galaxy/IWC sweeps: unchanged (0 new errors, `star_bam` still caught).

Not acted on:
- P3 2 unlabeled native outputs never shape-checked (extractor name `output_name` vs `outputMap` key `stepId:output_name`) — missed check, not false positive; tests reference labels in practice.
- P3 3 make `WorkflowGraph.outputMap` required — kept optional so external graph literals don't break (published type); two `?? {}` call sites.
- P3 4 stale repo CLAUDE.md dependency-chain line — pre-existing; reviewer judged the `schema → workflow-graph` dep acceptable.
- P3 5 committed native `.ga` end-to-end test; `elements`-without-`class` test; CLI test reusing connection-validation's fixture — native extraction covered by a unit test; fixture reuse avoids a duplicate.
- P3 6 bare `catch` in `resolveOutputCollectionTypes` — deliberately fail-open so graph-builder gaps can't turn into hard errors; output checks just skip. Revisit if it hides real bugs.
- P3 8 `--cache-dir` without `--workflow` ignored — matches other read-only flags.
- Follow-up idea: resolve outputs per test case seeded with the job's input types (`validateConnectionGraph` seed) instead of skipping.

<details><summary>Full review</summary>

See [normal_review_raw.md](normal_review_raw.md).

</details>
