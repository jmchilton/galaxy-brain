# Initial review: galaxyproject/planemo#1747

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `0fe5ce4b` (base `b1ac9ac5`; merges cleanly onto current `origin/master` `969e5cee`)
- PR: "Only report workflow autoupdates Galaxy actually made" by mvdbeek

## Verdict

Good change, approve after P2 1. Prediction now matches what ephemeris installs (latest installable revision, confirmed against the live Tool Shed metadata for `perssond/coreograph`: revision 1 carries `2.2.8.3`, revision 3 `2.2.8+galaxy1`), and the post-refactor check is the right safety net. The `tool: old -> new` output contract matches what the bot parses (`planemo-autoupdate/autoupdate` `pr_text_iwc.py` takes `words[1]` / `words[3]` of any line containing `" -> "`); the new pre-check and warning lines contain no `" -> "`, and warnings go to stderr, which the bot logs separately. One real bug in `updated_tools`. `tests/test_autoupdate.py` passes locally (6 tests).

## Findings

### P2 1: `updated_tools` misses an upgrade to a version already used elsewhere in the workflow

`updated_tools` compares the *deduplicated* set of tool ids per base id (`get_tool_ids_for_workflow` ends with `dict.fromkeys`). If a workflow uses the same tool at two versions (e.g. `X/1.0` in one step, `X/1.1` in another, or main vs. embedded subworkflow) and Galaxy upgrades the `1.0` step to `1.1`, the after-set `{X/1.1}` has no id missing from the before-set, so the update isn't reported. The CLI then warns "could not be updated", prints "No tool was updated", and skips writing the file, discarding a real upgrade. `outdated_tools` checks the first-seen id per base, so `X/1.0` is the one predicted as outdated, which makes this path reachable.

Reproduced:

```python
X = "toolshed.g2.bx.psu.edu/repos/o/r/t"
wf = lambda *vs: {"steps": {str(i): {"type": "tool", "tool_id": f"{X}/{v}"} for i, v in enumerate(vs)}}
autoupdate.updated_tools(wf("1.0", "1.1"), wf("1.1", "1.1"))  # -> {}
```

Fix: count tool ids per base id instead of deduplicating, e.g. walk `iter_workflow_steps` (already in `planemo/galaxy/workflows.py`, handles native + gxformat2 + embedded subworkflows) into a `Counter` per base id, and report an update when the multiset changed, with `updated` = newest id whose count grew. Add the duplicate-version case to `test_updated_tools`. Note `iter_workflow_steps` yields reference steps without recursing, so linked subworkflows stay excluded as they are today.

### P3 1: Local names shadow the module functions they come from

In `cmd_autoupdate.cli`, the dict `outdated_tools` and the per-workflow `updated_tools` share names with `autoupdate.outdated_tools` / `autoupdate.updated_tools`. Works (calls go through the module), but `updated_tools = autoupdate.updated_tools(...)` reads oddly. Suggest `predicted_updates` / `made_updates` or similar.

### P3 2: No CLI-level assertion of the bot's output contract

The `->` line format is now an explicit contract (the new comment says so), but nothing in `tests/test_cmd_autoupdate.py` asserts it. The existing Galaxy-backed workflow tests (`test_autoupdate_multiple_workflows`, `test_autoupdate_gxformat2_workflow`) already perform a real update; adding asserts for `"The following tools were updated:"` and a `" -> "` line there (and that the pre-check block has none) would guard the bot cheaply.

## Notes (not findings)

- Interaction with #1751 (numeric `+galaxyN` compare in `get_newest_tool_id`): no textual conflict (`git merge-tree` of both heads is clean). They compose: with #1751 the prediction will flag cases like decoupler_pseudobulk `+galaxy8` -> `+galaxy10` again, and on a Galaxy that still sorts `+galaxy10` lower this PR's post-check turns that into a warning and an untouched file rather than a phantom PR. The PR description's "makes planemo agree with Galaxy" for #1441 relies on the current string compare; after #1751 the agreement comes from the post-check, not the prediction. Worth a sentence in whichever lands second.
- `upgrade_all_steps` also upgrades `--skiplist`ed tools (pre-existing). Previously those upgrades were silent in the changelog; now `updated_tools` will list them. That's more accurate, but surfaces that the skiplist only suppresses triggering, not upgrading.
- `latest_installable_revision` mirrors ephemeris's `update_repositories` (last of `get_ordered_installable_revisions`); the `downloadable` / `malicious` / `numeric_revision` fields exist on the `/metadata` endpoint.
