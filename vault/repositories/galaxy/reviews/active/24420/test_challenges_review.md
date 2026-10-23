# Test challenges review — PR #24420

Profile `gx_test_challenger` · claude-opus-5-5 · medium effort · reviewed commit `8faff364290`. Detailed plan: [test_challenges_debrief.md](test_challenges_debrief.md).

The API test is a real red-to-green test at the right layer. It only covers the version half of the check, using a non-shed tool. The shed-tool id paths from issue #24419 go untested, and that gap hides a likely bug.

### P1 1: shed-tool id paths untested; short id + `tool_version` + `exact` likely 404s for installed versions

`multiple_versions` is not a shed tool, so the `tool.id != id` half of the check is never exercised. For a shed tool, `ToolBox.get_tool("<short id>", tool_version=...)` returns a tool whose `.id` is the full guid (see `test/unit/app/tools/test_toolbox.py::test_get_tool` and `get_tool("test_tool", tool_version="0.1").guid` near line 664). So with `exact=true`, issue example 2 (`kegalign?tool_version=X`) would 404 even when X is installed.

Fix: move the predicate into a toolbox- or service-level helper matching `id in (tool.id, tool.old_id)` plus the version, and unit-test it in `test_toolbox.py` against the `_setup_two_versions` guid fixture. Four cases: guid 0.1 hit; short id + 0.1 hit; guid 0.3 miss; short id + 0.3 miss. API tests have no shed tools, so the unit layer is the only place to cover these paths.

### P2 1: 404 response's message not asserted

The PR says the message names the closest match, but the test only checks the status. Assert that `err_msg` contains `'multiple_versions' version 0.2`.

### P3 1: fallback block duplicates an existing, stronger test

The first block (`tool_version=0.3` without `exact` → `!= "0.3"`) re-tests `test_show_with_wrong_tool_version_in_tool_id`, which asserts `== "0.2"`. Drop it.

### P3 2: repeated raw `self._get("tools/multiple_versions", ...)`

The same GET runs three times. Add a `_show_tool(tool_id, **params)` helper that returns the response, and rebuild the existing `_show_valid_tool` on it.

### P3 3: no case for `exact=true` without `tool_version`

Add `exact=true` on `multiple_versions` with no version → 200. This covers the guard's no-version branch.

E2E: none needed. The change is API-only with no client consumer.
