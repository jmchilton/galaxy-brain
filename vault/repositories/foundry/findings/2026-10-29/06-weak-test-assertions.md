# Green workflow tests are never tightened against real outputs: trimmed-read and MultiQC assertions stay pre-run guesses

- Target: galaxyproject/foundry (pipeline phase order plus the test-plan and implement-test Molds). Galaxy's assertion vocabulary already covers every stronger check needed, so nothing goes upstream. Foundry tracking needed: yes (this is the Foundry issue).
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-demo-v1-2026-10-29, phases 7 (test plan), 8 (implement test) and 10/11 (run green, debug no-op), 2026-10-29; Foundry worktree `pipeline-run-demo-v1` @ 8758f9ee.
- Existing issues/PRs: no duplicate. Related: galaxyproject/foundry#662 (a green run whose assertions were never evaluated has no debug path). This finding is the opposite case: the assertions were evaluated and passed, but nothing tightens them. Also related: the run's own feedback-ledger entry saying debug-galaxy-workflow-output is undefined on a pass (it suggests "flag trivially weak assertions").

## Symptom
`galaxy-workflow.gxwf-tests.yml` passed 1/1 (planemo 0.75.47, Galaxy 26.1.3.dev0), but some of its checks barely constrain the output:
- **trimmed_reads**: this is the step under test, yet no assertion checks that trimming happened. `has_n_lines` equals input reads x4 (110884 = 27721x4) and only proves reads were kept. `has_line` checks a read header, which trimming never changes. The only trimming check is `has_size: max: 18329193`, which is the decompressed input size minus 1, so it rejects nothing but a byte-identical pass-through. SAMPLE2 elements have line counts only.
- **multiqc_plot_data**: no `element_count`, although the run produced 9 elements (`__new_primary_file_plots|…` in tool_test_output.json). It has one `has_text` for a sample name and no values.
- **multiqc_report**: three `has_text` tokens (`FastQC` plus two sample names). For HTML with timestamps this is acceptable, since multiqc_data carries the values.
- **multiqc_data is mostly fine**, which corrects the problem as reported: it asserts 7 lines and one row per read file with total sequences. Minor issue: `.*27721(\.0)?.*` also matches 127721. Anchor it with `\t27721(\.0)?\t`.

## Root cause
Every concrete assertion value is fixed before any invocation exists, and no phase revisits the assertions after a green run.
1. The pipeline runs test-plan (P7) and implement-test (P8) before run-workflow-test (P10) (`content/pipelines/workflow-brief-to-galaxy/index.md:47-51`). The implement Mold says to bootstrap from an invocation and to "treat low-`confidence` synthesized intent as a starting point to tighten against the real invocation" (`content/molds/implement-galaxy-workflow-test/index.md` Sequence steps 1, 3). In the pipeline, P8 has no invocation (the test header says "Hand-authored (no invocation available…)"), and step 5 "Run green" was handed to P10.
2. run-workflow-test "does not repair anything", and debug-galaxy-workflow-output acts only on failure. On a pass, the low-confidence intents (plot count, size bound) are never tightened. The planemo-managed Galaxy is deleted at exit (`workflow-test-result.json` `ids.note`: "unusable after exit"), and no output bytes are kept, so even a later tightening pass would have nothing to measure.
3. The test-plan Mold (`content/molds/workflow-brief-to-galaxy-test-plan/index.md:148-150`) asks for "a defensible tolerance" but gives no rule for a value that only a run can measure. The planner therefore chose an upper bound of input size minus 1 (plan l.274-287). That ignores planemo-asserts-idioms §3, which says to measure observed ranges and reject the named failure (here "no trimming"). The plan also dropped the `element_count` intent (expected 11, confidence low) instead of marking it measure-after-run.
4. The nf-test snapshot would not have helped much, contrary to the problem as reported. Its trimmed-read md5s cover gzip bytes (`gzip --no-name`, while Galaxy uses pigz). Its MultiQC table md5s embed nf-core sample names (`SAMPLE1_PE_1` vs `SAMPLE1_PE_run1_forward`). The plan recorded both under `omissions[]` correctly. The snapshot only supplies the inventory (11 plot `.txt` files). The real outputs were the source of stronger values, and they were thrown away.

## Evidence
- Test outputs block: `galaxy-workflow.gxwf-tests.yml` from l.90, trimmed_reads `has_size max` and multiqc_plot_data without a count.
- Plan: `galaxy-test-plan.yml` l.274-287 (has_size rationale), `unresolved[]` l.414-434 ("check against the first invocation"), never acted on after P10.
- `run-summary.md`: "P11 … N/A on all 5 properties (green)". No phase reconciled the plan's "check against first invocation" items.
- Snapshot: `workflow-fixtures/pipelines/nf-core__demo/tests/default.nf.test.snap` (gzip and name-bearing md5s only).
- Galaxy can already express the stronger checks: `has_size` `size`+`delta`, `element_count`, anchored `has_line_matching`, `checksum`, and `file`+`compare` with `decompress` (planemo-asserts-idioms §1-3). It is not a Galaxy, planemo or wrapper gap.

## Proposed fix
1. Pipeline: add a tightening step after a green P10. Either keep the Galaxy alive (`--no_cleanup`, or an external/`planemo serve` engine) and run `workflow_test_on_invocation`, or have run-workflow-test download every labeled output into the run dir when the run passes.
2. implement-galaxy-workflow-test (or a new tighten Mold): when the run passes, replace each low/medium-confidence intent with values measured from the real outputs. Size bounds become `size`+`delta` from the observed size, and collection counts become exact. For trimming, add a content check that would fail on untrimmed reads, such as a trimmed sequence line or a decompressed expected file. The eval should treat "a bound that admits a pass-through or an empty output" as failing.
3. workflow-brief-to-galaxy-test-plan: values that can only be measured after a run get an explicit `measure-after-run` marker (or `unresolved[]` kind) instead of a placeholder bound. Also reference [[nextflow-snapshot-to-galaxy-assertions]] so the snapshot inventory sets counts and the plan states which md5s cannot transfer.
4. debug-galaxy-workflow-output: add a pass-handoff branch that audits assertion strength (it overlaps the ledger feedback entry and #662).

## Draft issue
**Title:** Green Galaxy workflow tests are never tightened against real outputs; pre-run guesses like `has_size max: input-1` ship as final

The WORKFLOW BRIEF → GALAXY pipeline fixes test assertions in P7/P8, before any invocation exists. run-workflow-test (P10) only records the result, and debug-galaxy-workflow-output (P11) is a no-op when the test passes. Low-confidence intents that the plan itself says to "check against the first invocation" are therefore never revisited. The managed Galaxy is torn down at exit and no outputs are kept, so the evidence needed for tightening is lost.

Seen on nf-core/demo (prose-wb2g-demo-v1, 2026-10-29). The test passed, but:
- The trimmed reads have no check that trimming happened. Line counts match the input, the header line is unchanged by trimming, and `has_size: max` is the decompressed input size minus 1.
- `multiqc_plot_data` has no `element_count`, although the run produced 9 elements.
- The total-sequence regexes for `multiqc_data` are unanchored (`.*27721.*` matches 127721).

The nf-test snapshot cannot supply these values (gzip-byte md5s, nf-core sample names), so the real outputs are the only source. Galaxy already has the assertion types needed (`has_size size/delta`, `element_count`, `checksum`, `compare` + `decompress`).

Proposal:
1. After a green P10, keep outputs (download labeled outputs, or keep Galaxy and use `planemo workflow_test_on_invocation`).
2. Add a tightening step that turns low/medium-confidence intents into measured values, with an eval property that rejects bounds which admit pass-through or empty output.
3. Have workflow-brief-to-galaxy-test-plan mark measure-after-run values explicitly and consult `nextflow-snapshot-to-galaxy-assertions` for inventory counts.
4. Give debug-galaxy-workflow-output a pass branch that audits assertion strength.

Related: #662.
