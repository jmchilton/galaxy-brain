

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [generic_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

The only one-way-ish risk is the changed stdout contract: the autoupdate bot (and any other scraper) parses `tool: old -> new` lines, and pre-check lines now read `tool: old (newer version new)`, so downstream consumers silently see fewer lines; otherwise this is a two-way door (no file writes are added, and skipping unchanged workflows is easy to revert).

<details><summary>Risk Details</summary>

- Output format change: `->` lines now appear only after a successful refactor; dry-run mode never prints them, so any consumer relying on `--dry_run` output for `->` lines breaks.
- Prediction narrowed to the max-`numeric_revision` installable revision; repos where the newest revision drops a tool (e.g. md_converter case) now report "no update" instead of a phantom one, which may hide genuinely available tools in older revisions.
- `latest_installable_revision` assumes every revision dict has `numeric_revision`; a Tool Shed response missing it raises `KeyError`/`ValueError` where the old code did not.
- Workflows where Galaxy made no tool change are no longer rewritten or release-bumped, and are dropped from the `--test` run set; non-tool edits `fix_workflow` used to apply alongside are skipped too.
- `updated_tools` ignores base ids absent from the original workflow and compares id sets, so a refactor that downgrades or swaps one of several same-base steps is reported as an update.

</details>

<details><summary>Risk Review Advice</summary>

Confirm with the IWC autoupdate bot owners that only post-refactor `->` lines are consumed and that dry-run output is not parsed. Reviewers should also sanity-check that trusting only the newest installable revision matches what `shed_install` actually installs (latest downloadable, non-malicious), since that equivalence is the whole premise of the fix.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/planemo/tree/pr_1747_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Review branch [`pr_1747_review_0`](https://github.com/jmchilton/planemo/tree/pr_1747_review_0) is cut from the reviewed commit `0fe5ce4b`. Its main fix is to `updated_tools`, which now counts tool ids per step instead of comparing deduplicated sets. An upgrade to a version that another step already uses is now reported, where before the CLI threw it away. The branch also moves the latest-revision selection into a pure `find_updated_tool_id(tool_id, repos)`, so its tests no longer monkeypatch the Tool Shed lookup; one end-to-end `outdated_tools` test keeps that monkeypatch to cover the result dict. It adds mutation-checked cases for the no-downgrade seed, the malicious filter and numeric revision ordering, plus a gxformat2-original case for `updated_tools`. It renames the CLI locals that shadowed the module functions, and asserts the `->` changelog lines in the Galaxy-gated workflow test, which was not run locally.

- [`3bcde178`](https://github.com/jmchilton/planemo/commit/3bcde178) Count tool ids per step in updated_tools: uses `iter_workflow_steps` and a `Counter` per base id, with a regression test that fails on the PR head.
- [`9c40a9f9`](https://github.com/jmchilton/planemo/commit/9c40a9f9) Extract find_updated_tool_id from outdated_tools: rewrites both revision tests against the pure function and drops the monkeypatch and `SimpleNamespace`.
- [`2742a0f5`](https://github.com/jmchilton/planemo/commit/2742a0f5) Test no-downgrade, malicious and numeric revision ordering: adds three cases, each of which fails under its matching mutation.
- [`9b83e1d1`](https://github.com/jmchilton/planemo/commit/9b83e1d1) Test updated_tools against a gxformat2 original: covers the `.gxwf.yml` vs native-export comparison without Galaxy.
- [`db407ef7`](https://github.com/jmchilton/planemo/commit/db407ef7) Rename autoupdate locals shadowing module functions: renames them to `predicted_updates` and `made_updates` in `cmd_autoupdate.cli`.
- [`0016729d`](https://github.com/jmchilton/planemo/commit/0016729d) Assert autoupdate "->" changelog lines in workflow test: checks that `test_autoupdate_multiple_workflows` prints the `->` line only after "The following tools were updated:" (Galaxy-gated, not run locally).
- [`77c62321`](https://github.com/jmchilton/planemo/commit/77c62321) Test outdated_tools end to end with a faked ToolShed lookup: keeps a unit assertion on the `{base_id: {current, updated}}` result that `check_tool_step` builds, using the PR's original monkeypatch.

</details>

</details>

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

Fixed in [`3bcde178`](https://github.com/jmchilton/planemo/commit/3bcde178).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the new `test_updated_tools_to_version_used_by_another_step` fails on the PR head and passes with the `Counter` fix.

</details>

### P2 2: Extract the revision selection so tests don't monkeypatch the ToolShed lookup (implementation verified)

`_outdated` monkeypatches `autoupdate.find_repos_from_tool_id` and passes `SimpleNamespace(log=print)` as ctx. It needs both only because the selection logic sits inside the `check_tool_step` closure, next to the `ToolShedInstance` call. The decision depends only on `(tool_id, repos)`.

Hoist it into a module-level `find_updated_tool_id(tool_id, repos) -> Optional[str]`. `check_tool_step` keeps the fetch and logging and calls it. The tests then call the function directly, with no monkeypatch and no ctx stand-in. Keep one end-to-end `outdated_tools` test, with the monkeypatch, so the `{base_id: {"current", "updated"}}` result stays covered. This continues the PR's own move of `base_tool_id` to module level.

Fixed in [`9c40a9f9`](https://github.com/jmchilton/planemo/commit/9c40a9f9) and [`77c62321`](https://github.com/jmchilton/planemo/commit/77c62321).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: after the extraction, both rewritten tests pass without the monkeypatch, and a single monkeypatched `outdated_tools` test still pins the result dict.

</details>

### P2 3: No test covers the no-downgrade seed, the malicious filter, or numeric revision ordering (implementation verified)

The PR's tests pass under each of three mutations:

- Seeding `matching_tool_ids` with `[]` instead of `[tool_id]`. A workflow on `2.2.8.3` then gets "updated" to `2.2.8+galaxy1`, which is a downgrade. The PR description calls this seed out as deliberate.
- Dropping the `malicious` filter.
- Comparing `numeric_revision` as `str` instead of `int`, so `9` beats `10`. The fixtures list revisions in ascending order, so even "pick the last entry" would pass.

Add one case for each: the current version newer than the latest revision's, a malicious latest revision, and revisions `9` and `10` listed in descending order.

Fixed in [`2742a0f5`](https://github.com/jmchilton/planemo/commit/2742a0f5).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the three new tests pass at head, and each one fails under its matching mutation.

</details>

### P3 1: CLI locals shadow the module functions they come from (implementation verified)

In `cmd_autoupdate.cli`, the dict `outdated_tools` and the per-workflow `updated_tools` have the same names as `autoupdate.outdated_tools` and `autoupdate.updated_tools`. The code works, because the calls go through the module, but `updated_tools = autoupdate.updated_tools(...)` reads oddly.

Rename them to `predicted_updates` and `made_updates`.

Fixed in [`db407ef7`](https://github.com/jmchilton/planemo/commit/db407ef7).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: `make lint` and mypy on the changed files are clean after the rename.

</details>

### P3 2: No test asserts the `->` changelog contract the bot parses

The IWC bot builds changelogs from the `->` output lines, which makes them the user-visible point of the PR, but no test checks them. The Galaxy-gated `test_autoupdate_multiple_workflows` already reaches the "updated" path.

Assert there that `"The following tools were updated:"` appears, that the `diff` tool's `<base>: <old> -> <new>` line follows it, and that the pre-check block before it shows `(newer version ...)` and no `->` line for that tool.

<details><summary>Details</summary>

The test was written but not run locally, because it needs a Galaxy with Tool Shed installs; CI runs it. Pulling the "predicted but not made" warning computation into a helper, so that branch could get a unit test, was left out at this PR size.

</details>

Fixed in [`0016729d`](https://github.com/jmchilton/planemo/commit/0016729d).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort.

</details>

### P3 3: `updated_tools` has no test with a gxformat2 original (implementation verified)

For `.gxwf.yml` workflows, production compares a gxformat2 original (list `steps`, untyped tool steps) to a native `.ga` export. The unit test uses native dicts on both sides, so only the Galaxy-gated `test_autoupdate_gxformat2_workflow` covers this path.

Add a case comparing a gxformat2 original with a native updated workflow.

Fixed in [`9b83e1d1`](https://github.com/jmchilton/planemo/commit/9b83e1d1).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: `test_updated_tools_from_gxformat2_original` passes on the PR head and with the P2 1 fix.

</details>
