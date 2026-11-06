# Initial review — galaxyproject/galaxy#24420 "Add exact to GET /api/tools/{tool_id}"

- Profile: `default`
- Model: claude-opus-5-5, effort: medium
- Reviewed commit: `8faff364290` (base `origin/dev`)
- Diff: `lib/galaxy/webapps/galaxy/api/tools.py` (+8), `lib/galaxy_test/api/test_tools.py` (+12)

## Verdict

Small, opt-in, default behavior unchanged — reasonable shape. One semantic problem worth fixing before merge: with `exact=true`, the short-id form from the linked issue (#24419, `GET /api/tools/kegalign?tool_version=...`) always 404s for Tool Shed tools, even when that version is installed. The test also skips the guid path the issue is about. Remaining points are placement and nits.

## Findings

### P2 1: `exact=true` with a short (old) tool id always 404s for Tool Shed tools

The check compares `tool.id != id`. For a shed tool, `toolbox.get_tool("kegalign", "0.3.4+galaxy2")` resolves through `_tools_by_old_id` (`lib/galaxy/tool_util/toolbox/base.py` ~L957) and returns a tool whose `id` is the full guid. So `exact=true` raises `ObjectNotFound` even when the requested version is installed, and the message reads "Tool 'kegalign' version 0.3.4+galaxy2 is not installed; the closest match is '<guid>' version 0.3.4+galaxy2", which contradicts itself. Issue #24419 gives this short-id form as one of its two example requests, so `exact` won't work as a deploy check for it.

A related edge case: for a guid, `get_tool` also tries the same repo path under every other configured tool shed (`tool_ids` loop, ~L927–937). A hit under an alias shed returns a different `tool.id`, and that also 404s.

Fix: pick the semantics and encode them. Either:
- (a) compare on version only, plus `tool.id == id or tool.old_id == id`. A short id can map to tools from several repos/owners via `_tools_by_old_id`, so (a) accepts whichever one `get_tool` picks. That may be acceptable as "this id at this version is runnable here".
- (b) keep the strict id check, but document that `exact` needs the full guid for shed tools, and say so in the 404 message.

Either way, add a test for the chosen behavior.

### P2 2: No test for the guid / id-mismatch branch, which is the issue's primary case

`test_show_exact_version` covers only `tool_version` on a built-in tool with no shed guid. The `tool.id != id` half of the condition, which covers the issue's first example (versioned guid in the path, other version returned), is never run. A broken id comparison would pass CI. Built-in test tools have no guids, so this probably needs a toolbox-level unit test with shed-style tools or lineage. `test/unit/app/tools/test_toolbox.py` already builds guid/lineage toolboxes; see `_setup_two_versions*` / `_init_tool` with `guid`. That's another reason to move the check into a testable layer (P3 1).

Also worth tightening in the existing test: assert the 404 body's `err_msg` (or at least that it names the closest version), and assert an `exact=true` request with no `tool_version` on a plain id returns 200. That covers the `tool_version` falsy branch.

### P3 1: The check lives in the legacy controller instead of `ToolsService._get_tool` / toolbox

`ToolBox.get_tool` already has an `exact` flag, but it applies to `tool_id` only. Its docstring says so, and an inline comment admits that `exact` still falls through to lineage for some paths. The PR adds a second, controller-only meaning of "exact" (id + version) after lookup and materialization. Any other endpoint that wants the same deploy check (`build`, `/download`, the `has_tool` callers, a future FastAPI port of `show`) would have to copy the condition. Moving it into `ToolsService._get_tool(..., exact=...)`, or a small toolbox helper such as `get_tool_exact(id, version)`, gives one reusable abstraction and makes P2 2 unit-testable without a server.

### P3 2: Fallback tool is materialized before rejecting it

`_get_materialized_tool` parses/materializes the fallback tool, then the exact check discards it with a 404. Call `self.service._get_tool(...)`, apply the check, then `toolbox.materialize_tool(...)`. That's cheap to do and avoids parsing on every failed deploy-check probe. It falls out naturally if P3 1 is done.

### P3 3: Nits

- `str(tool_version)` is redundant: `kwd` values are already strings, and `get_tool` does the same coercion.
- The nested f-string in the error message is hard to read. Build `requested = f"'{id}'" + (f" version {tool_version}" if tool_version else "")` first.
- With `exact` plus `tool_uuid`, `exact` is silently ignored. That's fine, but say so in the docstring line.
- If the closest match is `require_login` and the caller is anonymous, `allow_user_access` raises 403 before the exact check, so a "not installed" probe can return 403 rather than 404. Very minor; mention only if moving the check earlier (P3 1).

## Notes / non-findings

- The default path is unchanged; `util.string_as_bool` handles `exact=True`/`true`/`1` consistently with the sibling `io_details`/`link_details` params.
- The 404 message reveals the closest installed id/version. The non-exact call already returns that tool in full, so there's no new exposure.
- No security findings; no private report written.
