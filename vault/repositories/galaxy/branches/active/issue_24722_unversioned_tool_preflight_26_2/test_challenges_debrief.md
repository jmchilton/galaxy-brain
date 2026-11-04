Run via Claude Opus 5.5 at high effort.

# Test challenges debrief (re-hardening after scope expansion)

The branch head after this pass is `4b37d661932`. The commits are:

1. `99f05078e1b` Baseline tests (still first)
2. `cd0474251e7` Fix
3. `4b37d661932` Installed versions in the exact-version 400

I made one change, a helper refactor. `test_workflow_invocation.py` now has `_assert_missing_tools(workflow_id, history_id, expected_tools, *, require_exact_tool_versions)`. It invokes the workflow, asserts a 400, and compares `err_msg` against the fixed "Workflow was not invoked; the following required tools are not installed: ..." prefix. Before this, the same invoke/400/err_msg block appeared three times (twice in `test_run_workflow_with_missing_tool`, once in `..._wrong_version`), and the scope expansion had to edit both message sites. The helper and its call sites live in the baseline commit. Commit 3 now changes only the expected tool-description strings. I did the rebase non-interactively (`edit` on the baseline commit via `GIT_SEQUENCE_EDITOR=sed`), then resolved the two follow-on conflicts by hand. The `lib/` diff is unchanged.

Nothing was dropped.

## Per-test verdicts

### Unit (`test/unit/app/tools/test_toolbox.py`)

- `test_exact_lookup_matches_tool_id_not_version` (baseline): **kept**. It uses the real two-version shed toolbox fixture with no mocks. It pins the existing rule that `exact` means exact tool id, which the fix relies on. It passes on upstream `lib`.
- `test_get_tool_at_version` (fix): **kept, with the AttributeError caveat**. It also uses the real fixture with no mocks. It covers cases that would cost too much as integration tests: a versioned guid asked for a sibling version, the short id, an uninstalled version (no fallback to the newest), and an unknown id. Without the fix it fails with `AttributeError`. A unit test of a new public method can't avoid that. The behavior itself is pinned by integration tests that fail at their own assertions (see below). It is not covered elsewhere at unit granularity, so it isn't redundant.
- I added no unit test for `_describe_tool_references` / `_installed_tool_versions`. Their output is asserted exactly by three integration tests on both toolboxes, so a unit test would duplicate them.

### Integration (`test_workflow_invocation.py`, which `TestCachedWorkflowInvocation` inherits; `test_tool_source_storage.py`)

- `..._unversioned_shed_tool_id` (non-exact, baseline): kept.
- `..._wrong_version` (baseline, message updated in commit 3): kept. This is the regression guard for "no fallback to another version".
- `test_run_workflow_with_missing_tool` (upstream test, message updated in commit 3): kept. It now uses the helper.
- `..._exact_version` (fix): kept. It covers both the unversioned guid and the short id, and asserts that the job ran `.../0.1.0`.
- `test_update_workflow_with_unversioned_shed_tool_id` (fix): kept. It covers the `ToolModule.__init__` site and checks that the id is stored as given.
- `test_tool_source_storage.py::test_exact_workflow_invocation_reports_missing_tool_version` (commit 3 message): kept. It covers the multi-version cached case (`installed: 0.1, 0.1+galaxy6, 0.2`).
- Every request goes through existing populators. `install_repository(...)  # 0.1.0` repeats, but it is already a helper call and matches the file's style.

## Fail-without-change verification (run fresh)

- **Baseline tree** (`lib` at upstream, tests at `99f05078e1b`): unit 57 passed, 2 xpassed. Integration `-k "missing_tool or unversioned"`: 6 passed on both toolboxes.
- **HEAD tests, upstream `lib`**: 8 failed, 2 passed (the non-exact baseline test). Each failure is at its own assertion:
  - `exact_version` gets a "not installed" 400 where it expects 200.
  - `update` gets "This workflow contains missing tools" where it expects 200.
  - `missing_tool` and `wrong_version` fail on the missing `, installed: 0.1.0`.
- **HEAD tests, `lib` at the fix commit**: only the five commit-3 message assertions fail (`missing_tool` and `wrong_version` on both toolboxes, plus the tool_source_storage test), each at its message assertion.

## E2E

None added. `WorkflowRunForm.vue` and `WorkflowRunFormSimple.vue` hard-code `require_exact_tool_versions: false`, so the pre-flight bug only shows up through the API. The editor-save path is covered by the update API test. A Selenium test would also need a Tool Shed install, which the selenium suites don't do.

## Not covered

- The `allow_user_access` filter in `_installed_tool_versions`. A test would need an access-restricted installed tool, which these fixtures don't have. Its effect is limited to hiding version strings from the error message.
- The two-repository short-id ambiguity is still a known limitation. The eager fixture has only one repository.

## Results at HEAD

- `test/unit/app/tools/test_toolbox.py`: 58 passed, 2 xpassed.
- `test/integration/test_workflow_invocation.py` + `test/integration/test_tool_source_storage.py`: 46 passed.
- ruff and black are clean on the changed test files.
