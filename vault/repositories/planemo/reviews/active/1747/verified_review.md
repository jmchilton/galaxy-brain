### P2 1: `updated_tools` misses an upgrade to a version another step already uses (implementation verified)

`updated_tools` compares the deduplicated tool ids per base id (`get_tool_ids_for_workflow` ends with `dict.fromkeys`). Suppose a workflow uses `X/1.0` in one step and `X/1.1` in another (or in an embedded subworkflow), and Galaxy upgrades the `1.0` step to `1.1`. The after-set `{X/1.1}` then holds no id that's missing from the before-set, so the update isn't reported. The CLI warns "could not be updated", prints "No tool was updated" and skips writing the file, so a real upgrade is thrown away. `outdated_tools` checks the first-seen id per base, so `X/1.0` is the one predicted as outdated, and this path is reachable.

<details><summary>Evidence</summary>

```python
X = "toolshed.g2.bx.psu.edu/repos/o/r/t"
wf = lambda *vs: {"steps": {str(i): {"type": "tool", "tool_id": f"{X}/{v}"} for i, v in enumerate(vs)}}
autoupdate.updated_tools(wf("1.0", "1.1"), wf("1.1", "1.1"))  # -> {}
```

</details>

Count tool ids per step instead. Walk `iter_workflow_steps` (already in `planemo/galaxy/workflows.py`, it handles native, gxformat2 and embedded subworkflows) into a `Counter` per base id. Report an update when some id's count grew: `updated` is the newest id whose count grew, and `current` is the newest id whose count shrank.

<details><summary>Details</summary>

`iter_workflow_steps` doesn't recurse into reference steps, so linked subworkflows stay excluded, as they are today. Add the duplicate-version case to the `updated_tools` tests, plus an unchanged two-version workflow that must report nothing.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the new `test_updated_tools_to_version_used_by_another_step` fails on the PR head and passes with the `Counter` fix.

</details>

### P2 2: Extract the revision selection so tests don't monkeypatch the ToolShed lookup (implementation verified)

`_outdated` monkeypatches `autoupdate.find_repos_from_tool_id` and passes `SimpleNamespace(log=print)` as ctx. It needs both only because the selection logic sits inside the `check_tool_step` closure, next to the `ToolShedInstance` call. The decision depends only on `(tool_id, repos)`.

Hoist it into a module-level `find_updated_tool_id(tool_id, repos) -> Optional[str]`. `check_tool_step` keeps the fetch and logging and calls it. The tests then call the function directly, with no monkeypatch and no ctx stand-in. Keep one end-to-end `outdated_tools` test, with the monkeypatch, so the `{base_id: {"current", "updated"}}` result stays covered. This continues the PR's own move of `base_tool_id` to module level.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: after the extraction, both rewritten tests pass without the monkeypatch, and a single monkeypatched `outdated_tools` test still pins the result dict.

</details>

### P2 3: No test covers the no-downgrade seed, the malicious filter, or numeric revision ordering (implementation verified)

The PR's tests pass under each of three mutations:

- Seeding `matching_tool_ids` with `[]` instead of `[tool_id]`. A workflow on `2.2.8.3` then gets "updated" to `2.2.8+galaxy1`, which is a downgrade. The PR description calls this seed out as deliberate.
- Dropping the `malicious` filter.
- Comparing `numeric_revision` as `str` instead of `int`, so `9` beats `10`. The fixtures list revisions in ascending order, so even "pick the last entry" would pass.

Add one case for each: the current version newer than the latest revision's, a malicious latest revision, and revisions `9` and `10` listed in descending order.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the three new tests pass at head, and each one fails under its matching mutation.

</details>

### P3 1: CLI locals shadow the module functions they come from (implementation verified)

In `cmd_autoupdate.cli`, the dict `outdated_tools` and the per-workflow `updated_tools` have the same names as `autoupdate.outdated_tools` and `autoupdate.updated_tools`. The code works, because the calls go through the module, but `updated_tools = autoupdate.updated_tools(...)` reads oddly.

Rename them to `predicted_updates` and `made_updates`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: `make lint` and mypy on the changed files are clean after the rename.

</details>

### P3 2: No test asserts the `->` changelog contract the bot parses

The IWC bot builds changelogs from the `->` output lines, which makes them the user-visible point of the PR, but no test checks them. The Galaxy-gated `test_autoupdate_multiple_workflows` already reaches the "updated" path.

Assert there that `"The following tools were updated:"` appears, that the `diff` tool's `<base>: <old> -> <new>` line follows it, and that the pre-check block before it shows `(newer version ...)` and no `->` line for that tool.

<details><summary>Details</summary>

The test was written but not run locally, because it needs a Galaxy with Tool Shed installs; CI runs it. Pulling the "predicted but not made" warning computation into a helper, so that branch could get a unit test, was left out at this PR size.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort.

</details>

### P3 3: `updated_tools` has no test with a gxformat2 original (implementation verified)

For `.gxwf.yml` workflows, production compares a gxformat2 original (list `steps`, untyped tool steps) to a native `.ga` export. The unit test uses native dicts on both sides, so only the Galaxy-gated `test_autoupdate_gxformat2_workflow` covers this path.

Add a case comparing a gxformat2 original with a native updated workflow.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: `test_updated_tools_from_gxformat2_original` passes on the PR head and with the P2 1 fix.

</details>
