### P1 1: `exact=true` with a short id or versionless guid always 404s for Tool Shed tools (implementation verified)

The check compares the resolved tool's `id` to the requested id literally. A short id such as `kegalign` (issue #24419's second example) or a versionless guid resolves through `_tools_by_old_id`/lineage to a tool whose `id` is the full guid. So `exact=true` 404s even when the requested version is installed, and the message contradicts itself ("Tool 'kegalign' version X is not installed; the closest match is '<guid>' version X"). The id half of the check also had no test: `multiple_versions` isn't a shed tool, so a broken id comparison would pass CI. `exact` is new public API, so these semantics are what clients would lock in.

<details><summary>Evidence</summary>

A new parametrized `test_is_exact_tool` in `test/unit/app/tools/test_toolbox.py` uses the `_setup_two_versions` guid fixture. Under the PR's literal-id predicate, `("test_tool", "0.1")`, `("test_tool", None)` and `("github.com/galaxyproject/example/test_tool", "0.2")` fail with `assert False is True`, even though `get_tool` returned the matching installed version. Six other cases pass (guid hit, guid + version hit, guid 0.3 miss, guid + 0.3 miss, short id + 0.3 miss, versionless + 0.3 miss).

</details>

Treat the request as exact when the requested id is the tool's guid, versionless guid, or old (short) id, and the version matches when one is given. Implemented as `AbstractToolBox.is_exact_tool(tool, tool_id, tool_version)`. All nine unit cases pass.

<details><summary>Details</summary>

```python
def is_exact_tool(self, tool: ToolLike, tool_id: str, tool_version: str | None = None) -> bool:
    tool_ids = (tool.id, tool.old_id, tool.id and remove_version_from_guid(tool.id))
    return tool_id in tool_ids and (not tool_version or tool.version == tool_version)
```

Still strict: a guid that `get_tool` resolves under a different (alias) tool shed host 404s. A short id shared by several repos accepts whichever tool `get_tool` picks at that version.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P2 1: API test doesn't check the 404 message or `exact` without a version, and repeats an existing test (implementation verified)

`test_show_exact_version` checks only the 404 status, though the PR says the message names the closest match. It never runs `exact=true` without `tool_version`, so the no-version branch is untested. Its first block (non-exact fallback) re-tests `test_show_with_wrong_tool_version_in_tool_id`, which asserts the fallback more strictly (`== "0.2"`). It also repeats the raw `self._get("tools/multiple_versions", ...)` call three times.

Assert the full `err_msg`, add `exact=true` without a version (200), drop the redundant block, and add a `_show_tool(tool_id, **params)` helper that `_show_valid_tool` also uses.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort and by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: Exact check lives in the legacy controller and runs after materializing the fallback (implementation verified)

`ToolBox.get_tool` already has an `exact` flag (tool id only). The PR adds a second, controller-only meaning of "exact" (id + version), so other endpoints (`build`, a FastAPI port of `show`) would have to copy the condition. The check also runs after `_get_materialized_tool`, so a rejected fallback tool is parsed before being thrown away.

Move the id/version predicate to the toolbox (`is_exact_tool`) and enforce it in `ToolsService._get_tool(..., exact=)`. Run it after the access check, so anonymous probes of login-only tools still get 403 and not a 404 naming the closest tool, and before materialization. `_get_materialized_tool` takes a keyword-only `exact`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: Nits (implementation verified)

- `str(tool_version)` is redundant: `kwd` values are already strings, and `get_tool` does the same coercion.
- The nested f-string in the 404 message is hard to read. Build the `requested` part first.
- `exact` is silently ignored with `tool_uuid`. Say so in the docstring, along with the id forms `exact` accepts.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
