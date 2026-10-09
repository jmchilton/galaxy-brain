# Polish debrief: `issue_23521_conditional_case_resolution`

2026-10-02, done overnight while John was asleep, so every judgement call below is mine and flagged for review. Head moved from `c578e7c3a24` to `dba93a65d6c` (`929df4068f4` at fork handoff) (`jmchilton/issue_23521_conditional_case_resolution`, worktree `~/projects/worktrees/galaxy/branch/issue_23521_conditional_case_resolution`). Target `release_26.0`.

## Entry state

- In `branches_implemented`, blocked on "runtime reachability unproven". Fork CI at `c578e7c3a24` (10 days old) had five reds; all were unrelated:
  - API and Integration: `test_export_invocation_bco` and `test_export_bco_basic`, which are red on `release_26.0` itself.
  - Selenium and Playwright: browser flakes.
  - Test Galaxy packages: the `openapi/utils.py` mypy error, also red on `release_26.0` at `2225e5e5738` (upstream run `36397062766`).
- That counted as greenish, so polishing went ahead.

## Rebase

- Rebased onto `origin/release_26.0`, which was 27 commits ahead, and force-pushed (the branch is unopened).
- One conflict: mvdbeek's `a476f48e663` (🔀 #23649, fixes #22127 and #23551) added `case_populated` and `_runtime_values_to_json` to the same `populate_state` and `_populate_state_legacy` blocks that we restructure into `try/except ValueError/else`. I kept both: `case_populated = True` moved into our `else`, and upstream's fallback stays as it was.
- Slip: my first scripted resolution missed one block, so conflict markers were committed. I caught it right away and autosquashed the fix into the same commit. Nothing with markers was pushed.
- After the rebase:
  - Upstream's new `test_populate_state.py` passes.
  - 436 unit tests pass in `test/unit/app/tools` and `test/unit/workflows`.
  - mypy errors on the changed modules are identical to the base.

## Checklist (GENERAL + WORKFLOW_RELATED)

I evaluated the checklist myself, not with a subagent: the polish ran as a fork, and forks can't spawn subagents. It found:

- **Fixed (`48118b18456`), a user-visible regression introduced by the branch.** A test parameter connected to another step reached `no_case_error` as a `ConnectedValue`, and the message printed `value <galaxy.tools.parameters.workflow_utils.ConnectedValue object at 0x…>`. Runtime values now get "'batch_select' selects a case of 'batch_cond' and cannot be connected or set at runtime. Valid values are [...]". Red-to-green via the API test.
- **Fixed, a misdescribed test.** `test_run_workflow_unresolvable_conditional_case` claimed to test "a test value matching no `<when>`". In fact its 400 comes from the `ConnectedValue` at request time; the "Pooling" content never reaches validation. Renamed it to `test_run_workflow_connected_conditional_test_param` and fixed the docstring. Assertions: replaced `"No case matching"` with the more specific `"cannot be connected"`, and added `"object at 0x" not in`. Kept the vacuous `"hashable" not in` assertion rather than remove an assertion without asking.
- **Fixed, archeology.** The `conditional_data_arity.xml` comment described pre-fix behaviour ("consumers … land on cases[-1]"). It now says why the fixture has this shape.
- **Passed:** diff hygiene, message quality and behaviour change. The narrowed `except` blocks can now let a genuine bug inside case recursion propagate (likely as a 500) instead of becoming a field error. That's intended, and it's recorded in the description.

## Strengthening round

- **Reachability proven (`929df4068f4`).** Passing `allow_tool_state_corrections: true` (which planemo always sends, `planemo/galaxy/activity.py:327`) for a *top-level* step whose test parameter is connected to `param_value_from_file` lets the request through. At scheduling, `Pooling` replaces the test parameter, `-1` is stored, and the step runs the last case.
  - On `release_26.0` it fails with `'RuntimeValue' object has no attribute 'find_conversion_destination'`. The last case's `reads` was never connected, which isn't the `hashable` crash, but it's the same wrong-case wrap.
  - On the branch the invocation fails with `Conditional parameter 'batch_cond': No case matching 'batch_select' value 'Pooling'. Valid values are ['no', 'yes'].`, and the step creates no job.
  - New test `test_run_workflow_corrected_state_unresolvable_conditional_case`: red on base source files and green on the branch. Both workflow API tests and both refactor golden-string tests pass locally.
- The investigation note's earlier attempts used subworkflows, where the `inject()` shadowing bug drops the flag, so they never got this far.
- Description: the opener stays "Toward 🎯 #23521", not "Fix". The route is demonstrated, but it isn't shown to be the reporter's.
- Description: removed the false claim that the error comes out as "Failed to create N job(s) for workflow step <n>". On the branch it doesn't have that prefix; the invocation message carries `workflow_step_id` instead.

## Left over

- Fork CI at `929df4068f4` was queued at handoff. The expected unrelated reds are the BCO export tests and the openapi mypy error, plus possible browser flakes.
- The new execution error loses the "Failed to create 1 job(s) for workflow step 4:" prefix the old crash had. It's raised outside the `tools/execute.py` collection; I didn't chase where.
- `23521_current_case_theory.md` now has a "Runtime route found" section (added after the fork finished).
- Scope questions for John:
  - With corrections on, a connected test parameter whose value *does* match a `<when>` presumably runs. Is that a supported feature, or should it be refused like it is without the flag? The new "cannot be connected" message says it isn't supported.
  - Fix the `WorkflowModuleInjector.inject()` shadowing of `allow_tool_state_corrections` for subworkflows, here or separately?
  - Ask bernt-matthias whether the #23521 run used planemo or the API with `allow_tool_state_corrections`? It would confirm the route. A comment would need your OK.
  - Is it worth restoring a unit test over `get_current_case_inputs`, now that an API test covers execution? I left it dropped, per your earlier call.

## Independent checklist pass (after the fork)

A fresh subagent re-ran both checklists against `929df4068f4` (read-only; it traced the `find_conversion_destination` red and judged it plausible). Acted on:

- **Defect, fixed (`dba93a65d6c`):** `_workflow_to_dict_preview` (`managers/workflows.py`) still indexed `input.cases[__current_case__]`, so a stored -1 showed the last case's inputs in the workflow preview. Now `get_current_case_inputs(..., strict=False)`. Unit suites (437) pass, `test_anon_can_see_workflow_preview` passes, ruff/black clean, mypy count unchanged (env-only stub errors). No test pins the -1 preview case.
- **Docstring:** trimmed `get_current_case_inputs` from 13 lines to 4.
- **Stale commit message:** `06ef9eb6124` (now `e01cd92e418`) said the runtime path was "not demonstrated reachable". Reworded to "the reporter's route to -1 is not confirmed". The tree is otherwise unchanged; force-pushed.
- **Description:**
  - #22401 no longer cited as the same crash: it was closed by 🔀 #22406 (HDCA into a single data parameter), a different cause, and that fix is already in the base. It's now noted in Context only.
  - "Five readers" became six, with the preview listed under form building.
  - The behaviour-change answer now says exceptions inside a case's own parameters propagate with their own type instead of becoming a 400 on the test parameter.
  - The unit-test answer is now N/A (no unit tests).

Not acted on: the duplicated `test_param.name if self.test_param else "unknown"` fallback (nit), and the vacuous `"hashable" not in` assertion (kept rather than remove an assertion without asking).
