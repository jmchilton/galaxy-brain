# Scope evaluation (re-harden)

**Recommendation: keep as implemented (no further scope change).** The branch already took the first evaluation's modest expansion (the `subworkflow_progress` pre-read). What it fixes is complete for this symptom: the `str(HDA)` line is the only `${}` consumer of a parameter value backed by expression.json, and the pre-read covers the reporter's zero-input `__BUILD_LIST__` shape under shared-filesystem lag. None of the remaining candidates is a modest expansion in the touched code. The mapped HDCA case needs new per-job plumbing. Validation is a behavior change. The `PickValueModule` replacement-parameter gap is a separate bug, in a different file, with a different symptom. The purge tradeoff is narrower than recorded, because base already fails there for inner tool steps that consume the value. Contracting back to the alt would reopen a real production edge in order to remove 5 lines. The closest call is the `PickValueModule` gap: a small 26.1 bug in the same feature family, which I'd rather see as its own small 26.1 PR than ride here.

## Possible Decompositions

About 300 lines added. Source is `run.py` +6/-1. Tests: 127 lines of API tests, a 78-line framework workflow plus its test file, 65 lines of unit tests, and a 15-line helper move.

- **Single PR (as is).** The 3 commits in order: helper move, storage-line fix with framework/API tests, pre-read with unit tests.
- **Two PRs, stacked.**
  1. `ef6b194298e` + `6995d1f0c6f`: the helper move and the one-line fix, with the framework test and both API tests. This equals the alt `_alt_original_scope` plus the helper move.
  2. `5ce3acf579c`: the FS-lag pre-read with its 2 unit tests. It depends on 1 only for the helper.
- **Three PRs.** As in two PRs, but the mapped-subworkflow API test (`test_run_mapped_subworkflow_expression_replacement_parameter`) is split out as extra coverage of `_handle_mapped_over_post_job_actions`. Only worth it if reviewers push back on test volume.

## Scopes considered

### 1. As implemented (recommended)

`set_outputs_for_input` stores the resolved expression.json value. `subworkflow_progress` reads and discards it for `parameter_input` subworkflow inputs, so a lagging file delays the outer subworkflow step. Tests: a framework workflow (tool and native `pick_value` renames), 2 API tests (mapped implicit-collection name, the reporter's `__BUILD_LIST__`), and 2 unit tests.

| Pros | Cons |
|---|---|
| <ul><li>Exactly the issue's suggestion, plus the lag edge in the reporter's exact shape.</li><li>Uses only the canonical `replace_expression_json_dataset`, with no new abstraction. `modules.py` is untouched.</li><li>Merges cleanly onto the current `origin/release_26.1` (`d474cf95628`). In `run.py` the forward merge to dev is clean. The dev conflicts are in test files only (imports), as already recorded.</li><li>Every new test is red on base, and the delay test is also red on the alt.</li></ul> | <ul><li>The read-and-discard pre-read is a small smell. Thermo-nuclear checked 3 alternatives and found each worse.</li><li>A purge failure mode during scheduling (scope 7).</li><li>Mapped HDCA values are still a repr (scope 3).</li></ul> |

### 2. Contract to the alt original scope

Drop `5ce3acf579c` (the pre-read and its unit tests), keeping only the storage-line fix and its integration tests.

| Pros | Cons |
|---|---|
| <ul><li>A 1-line source diff, with no read-and-discard.</li><li>No new purge failure mode.</li><li>Already pushed as `_alt_original_scope`.</li></ul> | <ul><li>Reopens the lag edge in the reporter's shape. A zero-input inner step schedules while the input step is delayed, and that gives a permanent literal `${label}` name.</li><li>The grace period exists because this lag happens in production.</li><li>Saves only 5 lines.</li></ul> |

Not recommended. It remains available as a fallback if reviewers object to the pre-read.

### 3. Mapped expression HDCA into a subworkflow text input

A mapped expression tool feeding a subworkflow text param gives an HDCA. The helper ignores it, so `${label}` renders `<HistoryDatasetCollectionAssociation(...)>`. This is the Codex finding.

| Pros | Cons |
|---|---|
| <ul><li>Same symptom family.</li><li>Codex found it, so a reviewer may too.</li></ul> | <ul><li>Needs a per-job replacement dict. `job_callback` gets only `job`, so this is new plumbing through `ToolModule.execute` / `tools/execute.py`.</li><li>Undefined for the implicit-collection name and for zero-input steps (no single element).</li><li>Needs a design decision, and it is the same on base.</li></ul> |

Separate issue. The follow-up is already in index.md. It may be worth a sentence in the PR description, so reviewers see that it's known.

### 4. `PickValueModule` lacks `get_informal_replacement_parameters`

Only `ToolModule` scans PJAs for `${x}`. Native `pick_value` (new in 26.1, absent in 26.0) supports PJAs but inherits the base `[]`. So an informal `${x}` used only in a pick_value rename isn't listed in `replacement_parameters` (`managers/workflows.py:1224`, and the `SubWorkflowModule` aggregation), and the run form never prompts for it. dev has the same gap. A fix would hoist ToolModule's PJA scan to the `WorkflowModule` base: a small, roughly net-zero move, plus a run-form API test.

| Pros | Cons |
|---|---|
| <ul><li>A small real bug in the same `${}` feature.</li><li>The new framework test already exercises a pick_value rename.</li><li>A clean hoist that creates a reusable base behavior.</li></ul> | <ul><li>Affects informal parameters only. The issue's `${Inner title}` is a formal subworkflow input, so it isn't affected.</li><li>A different symptom (run-form prompt) and a different file. It would touch `modules.py`, which this branch deliberately keeps untouched.</li><li>Unrelated to expression.json.</li></ul> |

Recommended as its own small PR against `release_26.1`, not here. It's a good follow-up to add to index.md.

### 5. Validate expression-backed values in `InputParameterModule.execute`

The inner input step skips `input_param.validate` for HDA-backed values, on the premise that validating would require delaying. That premise is now partly obsolete, because the subworkflow step waits and the value is read at storage time.

| Pros | Cons |
|---|---|
| <ul><li>Same call chain. It would close a long-standing comment and TODO.</li></ul> | <ul><li>A behavior change: it can newly fail invocations that pass today (regex, min/max or options validators on values fed by an expression tool).</li><li>Type coercion questions, e.g. an int from pick_value into a text input.</li><li>Not a bug report.</li></ul> |

Candidate dev PR. Not here.

### 6. Refresh the stale `InputParameterModule.execute` TODO comment

A comment-only edit to the `# TODO: raise DelayedWorkflowEvaluation if replacement not ready` line and the "we'd have to delay scheduling" note. The first evaluation suggested it, and the branch dropped it.

| Pros | Cons |
|---|---|
| <ul><li>Zero risk.</li><li>Stops a future reader from re-deriving the readiness question.</li></ul> | <ul><li>It concerns validation, not this fix.</li><li>It touches `modules.py` only for a comment.</li></ul> |

Fine either way. Leaving it out is consistent with deferring scope 5, which owns that comment.

### 7. Close the recovery re-read / purge tradeoff

While a subworkflow is still scheduling, the value is re-read every iteration, through the pre-read and through `recover_mapping` → `set_outputs_for_input`. So a manual purge in that window fails the invocation, after the grace-period delay, since purge bumps `update_time`. A fix would need cached resolved values that survive across iterations (persisted state) or a fallback to `str()` on failure.

| Pros | Cons |
|---|---|
| <ul><li>Removes the only new failure mode relative to base.</li></ul> | <ul><li>Narrower than recorded: on base, any still-unscheduled inner tool step that consumes the param already reads the file (`ToolModule` → `replace_expression_json_dataset`) and fails the same way. The new exposure is limited to steps that only rename with it.</li><li>`DeleteIntermediatesAction` skips active invocations and never purges.</li><li>Caching needs new persisted state, and a fallback to `str()` brings the bug back.</li></ul> |

Accept, as recorded. Consider updating index.md's tradeoff wording to note that base already fails for consuming steps.

### 8. Older base (release_26.0 / release_25.1)

Both have the `str(output_value)` bug but lack `read_expression_json` / `replace_expression_json_dataset`, and 26.0 also lacks `PickValueModule`.

| Pros | Cons |
|---|---|
| <ul><li>Reaches more deployments.</li></ul> | <ul><li>Needs a reader backport or an inline `json.load` without the grace period.</li><li>A different patch per branch.</li><li>Low severity: rename cosmetics.</li></ul> |

Keep `release_26.1`.

<details><summary>Other things checked</summary>

- **Other `${}` / str(param) sites.** Re-checked the first evaluation's survey (post.py rename/tag actions, `run_request.py` top-level params, `when`, `to_cwl`). There is still no other consumer of an HDA backed by expression.json, so nothing to expand into.
- **Parent runtime replacements in children.** `subworkflow_progress` passes only the user `replacement_dict` to the child `WorkflowProgress`, not the parent's `runtime_replacements`. A parent input label used in an inner `${}` without wiring it in as a subworkflow input is surfaced as an informal parameter for the user to fill. That's by design, not this bug.
- **Upstream drift.** `origin/release_26.1` moved from `b2b1e1deeee` to `d474cf95628` (`run_request.py`, `test_workflows.py`). `git merge-tree` against it is clean. dev still has `str(output_value)` at `run.py:700`, and there is no competing PR for #24188.
</details>
