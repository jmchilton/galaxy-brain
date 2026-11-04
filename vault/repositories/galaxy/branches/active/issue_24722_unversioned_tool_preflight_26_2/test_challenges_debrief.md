Run via Claude Opus 5.5 at high effort.

# Test challenges debrief

Branch head after this pass is `ae1c7f50bc0`. The baseline commit `543bdd93c73` is unchanged and still first.

I made one change. `test_update_workflow_with_unversioned_shed_tool_id` now downloads the workflow again after the PUT. It asserts that the step keeps the unversioned guid and `tool_version` `0.1.0`, which pins the "tool_id stored as given" decision. I folded this into the fix commit with a fixup and an autosquash rebase. No tests were dropped or rewritten.

## Per-test verdicts

### Unit tests (`test/unit/app/tools/test_toolbox.py`)

- `test_exact_lookup_matches_tool_id_not_version` (baseline): kept. It uses the real two-version shed toolbox fixture with no mocks, and pins that `exact` means "exact tool id" at the layer where that rule lives. It passes on the upstream `base.py`.
- `test_get_tool_at_version` (fix): kept. It uses the same fixture with no mocks. It covers cases that would be costly as integration tests: a versioned guid asked for a sibling version, a version that is not installed (no fallback to the newest), and an unknown id. Without the fix it fails with `AttributeError`, because it tests a new public toolbox method. That failure can't be avoided for a unit test of a new method. The behavior itself is covered by integration tests that fail at their own assertions.

### Integration tests (`test/integration/test_workflow_invocation.py`; `TestCachedWorkflowInvocation` inherits them)

- `..._unversioned_shed_tool_id` and `..._wrong_version` (baseline): kept. Both pass with all three source files reverted to `upstream/release_26.2`, on both toolboxes.
- `..._exact_version` (fix): kept. Without the fix it fails at `_assert_status_code_is(..., 200)` with the "required tools are not installed" 400. It still fails when only `services/workflows.py` is reverted, so it covers the pre-flight site on its own.
- `test_update_workflow_with_unversioned_shed_tool_id` (fix): kept and extended as described above. Without the fix it fails at the PUT status assertion with "This workflow contains missing tools", so it covers the `ToolModule.__init__` site.
- Helpers: every request goes through existing populators (`upload_yaml_workflow`, `invoke_workflow`, `download_workflow`, `update_workflow`, `get_invocation_jobs`). The repeated `install_repository(...)  # 0.1.0` lines match the existing style in this file, so I didn't add a helper for them.

## E2E

None added. The UI run forms (`WorkflowRunForm.vue` and `WorkflowRunFormSimple.vue`) always send `require_exact_tool_versions: false`, so the bug only shows up through the API. A Selenium test would also need a Tool Shed install, which the selenium suites don't do.

## Not covered

- The two-repository short-id ambiguity (review item #1/#2). The eager unit fixture has only one repository. This is already recorded as a known limitation.

## Results

- `test/integration/test_workflow_invocation.py`: 22 passed (full file, before the extension). The 8 `unversioned` tests passed after the extension.
- `test/unit/app/tools/test_toolbox.py`: 58 passed, 2 xpassed.
- ruff and black are clean.
