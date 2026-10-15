# Scope evaluation — invocation_graph_e2e

**Recommendation: keep the scope as implemented. No scope change.** The branch covers every ✗ row of the issue draft's table except Steps-tab search, with 6 browser tests, 15 selectors, 3 attribute-only Vue hooks and the `invocation_open_latest` move the draft asked for. Each of the 6 tests was mutation-checked red. The two expansions the reviews raised belong elsewhere. The live-update test is parked on purpose: it fails 1 in 6 runs on dev until #24138's fix lands. A Steps-tab search test is a small optional follow-up. The contractions (fold the failure check into an existing test, drop the helper move, shared state) each save little and give up something the draft or the reviews chose to keep.

Reviewed at `f3abbbfa287` on dev `c63ffc2ccae`: 8 files, +222/−61. That's 3 Vue files (+10/−1), one new test file (166 lines), `navigation.yml` +15, `navigates_galaxy.py` +30/−8, and the deletion of two duplicate copies of the helper.

## Scopes

### 1. As implemented (recommended)

There's a new `test_workflow_invocation_graph.py` with six tests: failed step, step card navigation (with the icon check from #20334), isolate, Show Connections, read-only Step Config, and search. The four-node `header-ok` wait in setup covers "reaches terminal state". `invocation_open_latest` moves to `NavigatesGalaxy` and shares a new `_ensure_panel_open` with `open_toolbox`. The duplicates in `test_workflow_invocation_details.py` and `test_workflow_rerun.py` are deleted.

| Pros | Cons |
| --- | --- |
| <ul><li>Matches the draft's proposed tests and selectors almost one to one, including reuse of `workflow_editor.node`</li><li>All 6 tests are red under a targeted client mutation (10 mutations)</li><li>Settles the helper's TODO with less code than the TODO assumed: the thermo-nuclear pass made the `retry_assertion_during_transitions` move unnecessary, so `framework.py` is out of the diff</li><li>The only client changes are attributes, so there's no behaviour risk</li><li>Green on both backends locally</li></ul> | <ul><li>Adds about 2.5 min to the Selenium and Playwright suites (5 workflow runs at about 25 s each)</li><li>Doesn't cover the live-update path, which is the one place it found a real bug</li><li>Steps-tab search isn't covered, although the draft's table lists it</li><li>Merging forward from #24138 (`release_26.2`) will conflict in `test_workflow_invocation_details.py` and `navigation.yml` (see details)</li></ul> |

### 2. Expand: include the live-update test now

Add `test_graph_updates_to_terminal_state` (`wait=False`) from [live_update_test_for_24138](live_update_test_for_24138.md) to this branch.

| Pros | Cons |
| --- | --- |
| <ul><li>Covers the draft's "variant while jobs are still running" and the real polling path</li><li>It's the test that found the dev bug</li></ul> | <ul><li>Red 1 in 6 on dev until the #24138 fix (on `release_26.2`) merges forward, so the branch would be flaky in CI</li><li>A single green run proves little, so it needs about 10 runs on the fix</li><li>Parking it is the right call: it lands with or after #24138</li></ul> |

### 3. Expand: Steps-tab search test

Add one test that searches from the Steps tab and checks the matching step is selected or expanded. The draft's table lists "Search on Overview and Steps", but its proposed test list names only the graph.

| Pros | Cons |
| --- | --- |
| <ul><li>Closes the last ✗ cell in the draft's own table</li><li>Can reuse `graph_search_*` selectors if the markup is shared</li></ul> | <ul><li>Another workflow run, plus probably a new selector or hook</li><li>Was flagged only as possible follow-up (test challenges), not a gap any reviewer asked to fill</li><li>Reopens a branch that every review has passed</li></ul> |

### 4. Contract: fold the failed-step check into `test_invocation_step_jobs_with_failed_jobs`

Move `test_failed_step_is_marked`'s two `graph_node_state` assertions into the existing test, which already runs `WORKFLOW_KEEP_SUCCESSFUL_DATASETS` and lands on Overview.

| Pros | Cons |
| --- | --- |
| <ul><li>Saves one workflow run in CI</li><li>The draft names this as the best candidate to fold in "if run time matters"</li></ul> | <ul><li>A graph failure would be reported under a Steps/Debug test</li><li>Splits graph coverage across two files</li><li>That test is also the one #24138's branch is editing, so folding in adds to the merge-forward overlap</li></ul> |

### 5. Contract: tests only, with no helper refactor

Keep `invocation_open_latest` local to the new test file (or a third copy), and leave `open_toolbox`, `test_workflow_rerun.py` and `test_workflow_invocation_details.py` untouched.

| Pros | Cons |
| --- | --- |
| <ul><li>No changes to shared `NavigatesGalaxy`, so the diff is smaller</li><li>No merge-forward conflict with #24138's edits to `test_workflow_invocation_details.py`</li></ul> | <ul><li>Would make a third copy of the helper, the opposite of what the draft asks</li><li>Loses the ensure-open retry fix for a race seen under Selenium</li><li>`_ensure_panel_open` is now reused by two callers, and the polish and thermo-nuclear reviews both kept it</li></ul> |

### 6. Contract: run the workflow once per class

Use a `SharedStateSeleniumTestCase` (or a class-level setup) to run the two-branch workflow once for all five tests.

| Pros | Cons |
| --- | --- |
| <ul><li>Cuts about 100 s of CI time</li></ul> | <ul><li>The tests change graph UI state (active node, detailed view), so they'd be order-dependent or need a reset step</li><li>Test challenges weighed this and declined it</li><li>The suite's convention is one run per test</li></ul> |

### 7. Expand: minimap colours, zoom cap, no scroll

Browser checks for the draft's ➖ rows.

| Pros | Cons |
| --- | --- |
| <ul><li>Would complete the table</li></ul> | <ul><li>The draft excludes these explicitly: they're canvas or layout details that unit tests or manual checks suit better</li><li>Canvas pixels can't be asserted through the shared Selenium/Playwright element API</li></ul> |

<details><summary>Details</summary>

**What the reviews said about scope.**
- *Normal review 1:* turn the redundant terminal-state test into the live-update variant. Tried, it found a dev bug, and it's parked (scope 2). Flat selectors were left as a nit.
- *Test challenges:* Steps-tab search is possible follow-up (scope 3). They declined `managed_history` and shared setup (scope 6).
- *Polish:* added `_ensure_panel_open`, a mild expansion that's part of scope 1.
- *Codex:* no findings.
- *Thermo-nuclear:* contracted the diff by dropping the `retry_assertion_during_transitions` move. It declined to split `navigates_galaxy.py` (3346 lines) as out of scope.
- No reviewer argued for a wider or narrower PR overall.

**Note on stale debrief text.** `initial_implementation_debrief.md` commit 1 says `retry_assertion_during_transitions` moved to `navigates_galaxy.py`. That's no longer true: `b04051e5e2a` reverted it, and `framework.py` isn't in the diff. The PR description should describe the final state.

**Interaction with `issue_24138_invocation_graph_refresh`.**
- That branch is on `release_26.2` and adds `test_steps_follow_running_invocation` to `test_workflow_invocation_details.py`.
- It deliberately keeps that file's class-local `invocation_open_latest`, because this branch moves the helper.
- When #24138 merges forward to dev, the person resolving it should delete the class-local copy and let calls resolve to `NavigatesGalaxy.invocation_open_latest`. The new version also calls `home()` first and uses `wait_for_and_click` on the first row, and both work for that test.
- `navigation.yml` will need a trivial merge in the `invocations` block (`step_header_state` beside the `graph_*` entries).
- After the merge, this branch's `graph_node_state(..., "ok")` waits go through #24138's watcher instead of the deleted `pollInvocationGraph`. That's a free cross-check.
- The parked live-update test should land in this file once both are on dev, run about 10× under Selenium. #24138's screenshot debrief also floats an Overview capture in its E2E, which would want this branch's `graph_node_state`. Prefer the parked test here over duplicating it there.

**Branch target.** This branch is tests plus inert attributes, so dev is right. Backporting browser tests to `release_26.2` gains little, and dev is where #21989, #22075 and #22745 will change the view.

**Suggested PR framing.** Say it's browser coverage for the Overview graph, and that it moves `invocation_open_latest` into `NavigatesGalaxy` (resolving the TODO). Mention the found intermittent live-update bug and point to #24138 / #22745. There's no issue to close, because the draft wasn't filed. It could be referenced as related to #3241.

</details>

## Unresolved questions

- Steps-tab search: follow-up PR, or fold into this one?
- Live-update test: land it in this file after #24138 merges forward, or as part of the #24138 PR's merge-forward?
- Reference #3241 in the PR?
