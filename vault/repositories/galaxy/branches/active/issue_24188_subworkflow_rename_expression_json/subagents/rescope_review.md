# Rescope review

No blockers. I acted on these:
- moved the duplicated `expression_json_hda` unit-test helper into `workflow_support.py`, used by `test_modules.py` and `test_workflow_progress.py`
- the delay test now asserts the "could not be read" reason and uses dev-style `pytest.raises(modules.DelayedWorkflowEvaluation)`
- the pre-read comment now says the value is discarded

Not acted on:
- Re-reading on recovery can fail an invocation if the expression dataset is purged while its subworkflow is still scheduling. Base doesn't read the file then. Accepted as a tradeoff, recorded in index.md. The automatic path is safe: `DeleteIntermediatesAction` skips active invocations and only deletes, never purges. Only a manual purge mid-scheduling hits this.
- The scope evaluation's suggested refresh of the `InputParameterModule.execute` TODO comment. Dropped to keep `modules.py` untouched; that TODO is about validation, not this fix.
- `test_subworkflow_expression_json_parameter_replacement` is kept, though it overlaps integration tests. It's the only direct test of the `set_outputs_for_input` line.

<details><summary>Full review</summary>

1. Medium-low: there's a new failure mode on recovery vs base. `set_outputs_for_input` (via `recover_mapping`) and the pre-read re-read the expression.json every iteration while a subworkflow still has unscheduled steps. A purged dataset or missing file then fails the invocation. The thermo-nuclear review and scope evaluation compared against the prior head, not base.
2. Low: the promised TODO comment refresh is missing.
3. Low: `_expression_json_hda` is duplicated from `test_modules.py`.
4. Low: the unit tests have uneven value. The delay test is real red-to-green; the replacement test overlaps integration tests. Suggested asserting "could not be read".
5. Low: the comment could say the result is discarded.
6. Low: the forward merge to dev conflicts only on test-file imports (dev added `pytest` and the `modules` import).

Checked fine:
- `subworkflow_progress` is called only from `SubWorkflowModule.execute`.
- Earlier `compute_collection_info` → `replacement_for_input` already delays on pending datasets and fails on not-ok ones, including nested subworkflows.
- An HDCA (mapped) is a no-op. Non-expression HDAs and NO_REPLACEMENT pass through. Unconnected and default inputs aren't read. A when-skipped subworkflow reads a `null` value fine.
- Read-and-discard in `subworkflow_progress` is the right placement.
- JSON value stringification matches how top-level values are stringified. Imports are at module top. No security concerns.
</details>
