(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via claude-opus-5-5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via claude-opus-5-5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile: gx_risk_assessment · Model: claude-opus-5-5 · Effort: low · Reviewed commit: 8faff364290

The one-way risk is small but real: this adds a new public query parameter (`exact`) to `GET /api/tools/{tool_id}`, and whatever "exact" means for ids at merge time (including how it treats lineage/short ids and versionless Tool Shed GUIDs) becomes a contract clients will depend on.

<details><summary>Risk Details</summary>

- New API surface: once clients (e.g. workflow tooling, BioBlend, planemo) send `exact=true`, removing or renaming it is a breaking change.
- `exact` compares `tool.id != id` literally. Requests by a versionless Tool Shed GUID, short id, or lineage alias that resolve today will 404 under `exact`, even when `tool_version` matches. That strict reading gets locked in.
- `exact` is silently ignored when `tool_uuid` is given. That exemption also becomes part of the behavior.
- Version comparison is a plain string match (`tool.version != str(tool_version)`), so `1.0` and `1.0.0` count as different versions.
- The parameter lives on the legacy controller's `kwd`, not a typed FastAPI query model, so it won't appear in the OpenAPI schema or generated client types. Discoverability depends on the docstring.
- The 404 message names the closest installed tool id and version. Tool existence and versions are already exposed by this endpoint, so this is not a new disclosure, but the message wording becomes something clients may parse.
- Default behavior is unchanged (opt-in), so existing callers face no regression risk.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide what "exact" should mean before it ships. Should it match on the resolved tool's id and version, or literally on the id string the caller sent? Should a versionless GUID plus `tool_version` count as exact? Should `tool_uuid` interact with it? Those semantics are the part that's hard to walk back.

Consider whether the parameter should be declared on a typed query model so it shows up in the OpenAPI schema and client types. Also consider whether sibling endpoints that do the same version fallback (e.g. tool build/run lookups) should get the same opt-in for consistency. Rolling back the code itself is trivial.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24420_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24420_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24420_review_0) is branched from the reviewed commit `8faff364290`. It moves the `exact` check out of the legacy controller. The id/version predicate is now `AbstractToolBox.is_exact_tool`, and `ToolsService._get_tool(..., exact=)` enforces it after the access check and before materialization. The predicate accepts a short (old) id or a versionless guid as well as the full guid, so `exact=true` no longer 404s for installed shed tools requested by short id. Toolbox unit tests on guid fixtures cover this. The API test now asserts the 404 message and the no-version path, and the duplicated fallback check is dropped.

- [`143e905b39d`](https://github.com/jmchilton/galaxy/commit/143e905b39d) Move exact tool check into ToolsService and toolbox: moves the check into the service and toolbox with the PR's literal-id behavior unchanged, flattens the error f-string, drops the redundant `str()`, and documents that `exact` is ignored with `tool_uuid`.
- [`74dd0baf008`](https://github.com/jmchilton/galaxy/commit/74dd0baf008) Accept short and versionless ids with exact tool lookup: `is_exact_tool` also matches `old_id` and the versionless guid. Adds the parametrized `test_is_exact_tool` (red on 3 of 9 cases before the change) and updates the endpoint docstring.
- [`0c10060d87f`](https://github.com/jmchilton/galaxy/commit/0c10060d87f) Tighten exact tool show API test: adds a `_show_tool` helper, asserts the full 404 `err_msg`, adds the `exact=true`-without-version 200 case, and drops the non-exact fallback block, which `test_show_with_wrong_tool_version_in_tool_id` already covers.

</details>

</details>

### P1 1: `exact=true` with a short id or versionless guid always 404s for Tool Shed tools (implementation verified)

The check compares the resolved tool's `id` to the requested id literally. A short id such as `kegalign` (issue #24419's second example) or a versionless guid resolves through `_tools_by_old_id`/lineage to a tool whose `id` is the full guid. So `exact=true` 404s even when the requested version is installed, and the message contradicts itself ("Tool 'kegalign' version X is not installed; the closest match is '<guid>' version X"). The id half of the check also had no test: `multiple_versions` isn't a shed tool, so a broken id comparison would pass CI. `exact` is new public API, so these semantics are what clients would lock in.

<details><summary>Evidence</summary>

A new parametrized `test_is_exact_tool` in `test/unit/app/tools/test_toolbox.py` uses the `_setup_two_versions` guid fixture. Under the PR's literal-id predicate, `("test_tool", "0.1")`, `("test_tool", None)` and `("github.com/galaxyproject/example/test_tool", "0.2")` fail with `assert False is True`, even though `get_tool` returned the matching installed version. Six other cases pass (guid hit, guid + version hit, guid 0.3 miss, guid + 0.3 miss, short id + 0.3 miss, versionless + 0.3 miss).

</details>

Treat the request as exact when the requested id is the tool's guid, versionless guid, or old (short) id, and the version matches when one is given. Implemented as `AbstractToolBox.is_exact_tool(tool, tool_id, tool_version)`. All nine unit cases pass.

Fixed in [`74dd0baf008`](https://github.com/jmchilton/galaxy/commit/74dd0baf008).

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

Fixed in [`0c10060d87f`](https://github.com/jmchilton/galaxy/commit/0c10060d87f).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort and by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: Exact check lives in the legacy controller and runs after materializing the fallback (implementation verified)

`ToolBox.get_tool` already has an `exact` flag (tool id only). The PR adds a second, controller-only meaning of "exact" (id + version), so other endpoints (`build`, a FastAPI port of `show`) would have to copy the condition. The check also runs after `_get_materialized_tool`, so a rejected fallback tool is parsed before being thrown away.

Move the id/version predicate to the toolbox (`is_exact_tool`) and enforce it in `ToolsService._get_tool(..., exact=)`. Run it after the access check, so anonymous probes of login-only tools still get 403 and not a 404 naming the closest tool, and before materialization. `_get_materialized_tool` takes a keyword-only `exact`.

Fixed in [`143e905b39d`](https://github.com/jmchilton/galaxy/commit/143e905b39d).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: Nits (implementation verified)

- `str(tool_version)` is redundant: `kwd` values are already strings, and `get_tool` does the same coercion.
- The nested f-string in the 404 message is hard to read. Build the `requested` part first.
- `exact` is silently ignored with `tool_uuid`. Say so in the docstring, along with the id forms `exact` accepts.

Fixed in [`143e905b39d`](https://github.com/jmchilton/galaxy/commit/143e905b39d) and [`74dd0baf008`](https://github.com/jmchilton/galaxy/commit/74dd0baf008).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
