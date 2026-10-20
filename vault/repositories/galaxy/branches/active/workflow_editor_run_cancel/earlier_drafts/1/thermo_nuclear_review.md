# Thermo-nuclear review — workflow_editor_run_cancel

Reviewed `65132d40dac..7f0c9e91e5c` (4 commits, about 60 lines) against `thermo-nuclear-code-quality-review.md`, scaled to a small bug-fix and missing-test branch. No structural regressions. I acted on one finding: the test's API check now waits on the cancellation directly, so it no longer relies on an indirect synchronization chain. The fix is folded into the test commit, `7f0c9e91e5c` -> `2645a2f7476`. The three helper/selector commits are unchanged (`6b639d732b9`, `7078f4c023a`, `831de3dd1a8`), and the base is still `65132d40dac`.

## Changed

- **Direct cancellation barrier in `test_run_from_editor_and_cancel`.**
  - *Before:* the test called `wait_for_history_workflows(..., assert_ok=False, expected_invocation_count=1)`, then `history_invocations()[0]`, then `get_invocation`, then `assert state == "cancelled"`.
  - *Why it was fragile:* the Cancel click sends its DELETE asynchronously, so the invocation wait can return on `scheduled` before the cancel lands. The assert held only because the 300s job kept `wait_for_history_jobs` blocked until the scheduler cancelled the invocation and deleted the job. It took a paragraph in `test_challenges_debrief.md` to justify that chain.
  - *Now:* `[invocation_summary] = history_invocations(...)` checks there is exactly one invocation. Then `self._wait_on(cancelled_invocation, "invocation to be cancelled")` polls `get_invocation` until the state is `cancelled` and returns that invocation, which carries the inputs assertion.
  - The `cancelled` check still runs, inside the wait condition, and fails with a timeout. `_wait_on` uses the standard `JOB_COMPLETION` budget. The UI retry assertion keeps its existing 50 x 0.2s budget, because the backend is already cancelled by the time it runs.

## Not acted on

- **Reordering, with the UI note as the barrier and the API check after.** Considered and rejected. The note renders only when the state is `cancelled` (`WorkflowInvocationState.vue:356`), so it would be a valid barrier. But the UI retry budget would then have to cover the whole time from click to cancelled, and there is no principled timeout for it. A `_wait_on` over the UI text could raise `StaleElement` under Selenium while the ProgressBar is re-rendering. A pure-API barrier avoids both problems.
- **`workflow_run_ensure_expanded` and `workflow_run_specify_inputs` repeat the same check** ("wait for `run_workflow` visible, then branch on `expanded_form.is_absent`"). A small helper could remove the repetition, but sibling branches edit `navigates_galaxy.py`, and the common rules ask to keep this branch independently mergeable.
- **Two selectors in `specify_inputs`.** This is justified. The expanded form's tool step `input1` parameter also carries `data-label="input1"`, so one data-label selector would be ambiguous. Only `step-label` names input steps in the expanded form, and the simplified form has no `step-label`. The inline comment says this.
- **File size.** `test_workflow_run.py` was already about 1136 lines before the branch (now about 1187). `navigates_galaxy.py` is 3360. The branch pushes neither file past 1k for the first time.
- **`client/src/utils/navigation/schema.ts` not updated** for `tool_bar.run` / `invocations.cancel_button`. It already lacks `tool_bar` and `workflow_rerun_button`, so it isn't kept in step with `navigation.yml`. This matches that convention.
- **The test's own `run_workflow.wait_for_visible()`** is not redundant even though the helper now waits too. It has to run before `assert expanded_form.is_absent`, or that premise is trivially true on an unloaded page.
- **`value.pop("hid")` mutates the caller's dict.** This predates the branch and is outside the diff.

## Run

- Pre-commit (black, ruff, flake8) passed.
- Playwright, headless, against this worktree's Galaxy (8080) through Vite 5173: **1 passed** (37s). The first attempt errored in setup because the selenium login user didn't exist in this worktree's fresh DB. I registered the user and reran.
- Selenium not run: no helpers or selectors changed.

<details>
<summary>Full review</summary>

**Scope:** `navigation.yml` (+2 selectors), `navigates_galaxy.py` (`workflow_editor_click_run` now uses the Run activity component, and `workflow_run_specify_inputs` dispatches between simplified and expanded selectors), `test_workflow_run.py` (+1 E2E test).

**1. Structural regressions:** none. Selectors live in `navigation.yml`, reusable steps in `NavigatesGalaxy`, and the test only orchestrates.

**2. Code judo:**
- *`workflow_editor_click_run`:* already the minimal change, from a raw CSS selector to a named component.
- *`specify_inputs`:* the dispatch is the smallest correct change, since a unified selector is ambiguous (see above).
- *Test cancellation check:* this is where the real simplification was. It relied on job blocking to serialize the cancel instead of waiting on the state it asserts. Fixed with a direct `_wait_on` barrier.

**3. Spaghetti / branching:** one conditional added to `specify_inputs`, commented, at the natural decision point. It repeats the form-mode check in `ensure_expanded`, and a shared "form mode" helper could collect both. That is deferred for sibling-branch independence.

**4. Boundary / type:** no casts and no new optionality. `inputs: dict[str, Any]` predates the branch.

**5. File size:** no threshold crossing caused by this branch.

**6. Modularity:** fine. The test's UI retry assertion is used once and not extracted, which is consistent with `test_workflow_invocation_details.py`.

**7. Legibility:** docstrings are concise, and comments explain the non-obvious points: the newest-dataset preselection trap, the step-label vs data-label distinction, and the 3s poll.

**Verdict:** approve after the cancellation-barrier fix. Remaining items are deferred deliberately or justified.

</details>
