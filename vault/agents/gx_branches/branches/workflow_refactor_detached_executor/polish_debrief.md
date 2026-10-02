# Polish debrief: `workflow_refactor_detached_executor` (#23799)

2026-10-02. This is a polish of a draft PR that was already open, run at John's request. Head moved from `140fe871f5e` to `75e33460a39` (`jmchilton/workflow_refactor_detached_executor`, worktree `~/projects/worktrees/galaxy/branch/workflow_refactor_detached_executor`). It targets `dev`.

## Entry state

- The PR was a draft titled "[WIP] Safer workflow refactor handling." with a bare template body.
- The index said "don't rebase (holds the forward merges); land after #23790 and #23792". But John closed both #23790 and #23792 on 2026-10-01 without merging them. So #23799 now carries all three changes, and the "don't rebase" reason no longer applies.
- Fork CI at `140fe871f5e`: 60 passed and 1 failed. The failure was `test_trs_import` (workflowhub, a selenium timeout), which is external.

## History cleanup (force-pushed)

- Rebased onto `origin/dev` (448 behind), which flattened the merge of `workflow_refactor_skip_noop_save`. The tree is identical to merging the old head into `dev`.
- Squashed "Merge forward #23792" (a single-parent commit, despite its name) into "Run refactor executor against a detached build". The first commit added `_steps_recursive` plus an expire, and the second removed both. The result is one commit, "Keep refactors from rewriting the source workflow version", with an unchanged tree.

## Checklist (GENERAL + WORKFLOW_RELATED, subagent)

The checklist found no must-fix code defects. Acted on:

- **Fixed, red-to-green (`10ac1c7129b`):** `source_metadata` was in the export, but builds only get it from import options. So every no-op refactor of a URL- or TRS-imported workflow still saved. It is now dropped from the comparison. New test `test_refactor_noop_of_imported_workflow_does_not_create_version` was red before the fix.
- **Added guard (`75e33460a39`):** `test_refactor_annotation_reports_changed` covers a no-op and a real `update_annotation`. This is the silent-drop direction for a stored-workflow attribute. It passed first time.
- Reworded the three "upgrade used to also rewrite…" test comments to the present tense.
- `==` became `is` for the latest-version check.

Not acted on:

- **Reusing `_model_last_id` in `test_refactor_saves_only_the_new_version`:** tried and reverted. That helper fails on `Workflow`/`StoredWorkflow` (joined eager loads need `.unique()`), which is why the test uses `func.max`.
- **Dropping the duplicate API vs integration "upgrade preserves previous version" test:** that removes a test, so it's left for John.
- Counting connections, inputs and PJAs in `test_refactor_saves_only_the_new_version`.
- Lazy scratch builds, and dropping the possibly defensive deep copies in `_build_detached` and `_refactor_comparison_dict`.

## Red on `dev` (verified by swapping in `dev`'s `managers/workflows.py`)

- `test_tool_version_upgrade_preserves_source_version`: version 0 reads `0.2`.
- `test_subworkflow_upgrade_preserves_source_version`: fails.
- `test_subworkflow_upgrade_dry_run_writes_nothing`, with its `changed` check removed: `SAWarning: Object of type <WorkflowStep> not in session`.
- `test_refactor_step_position_creates_version`, with its `changed` check removed: version 0's layout moved (7 vs 10).

## Strengthening round (subagent)

Corrections to the description:

- **#22534:** the old description said upgrade actions report `tool_version_change` when they change something, and cited #22534. That's false: #22534 is an open feature request, and a 0.1 → 0.2 upgrade reports no messages. Issue #23762's body repeats this claim.
- **Editor scope:** "Anyone upgrading through the API or editor" was too broad. Only the editor's Upgrade activity and subworkflow upgrade button go through refactor; the per-step tool version dropdown doesn't.
- **"No new errors":** this was overstated. The scratch build is made from the source description, so a source that won't build now fails earlier. A change to a field the export leaves out would read as unchanged, and no current action edits one.
- **Build table:** it lacked the no-op-on-older-version row (3 builds) and the extra source export.
- **Position move:** added as a symptom of the source-version bug on `dev`.

Other changes:

- **Opener:** narrowed to #23762. The source-version bug has no issue.
- **Context:** now uses "Supersedes" and adds #22534 as related.
- **Highlighted misreadings:** the editor's normal save is untouched; `changed` is additive; the two fixes share one mechanism; reverting an older version still saves.

## Tests at head

- `test/integration/test_workflow_refactoring.py`: 31 passed.
- `test_workflows.py -k refactor`: 15 passed.
- ruff, isort and black are clean, and mypy reports no errors in `managers/workflows.py`.

## Left over

- Fork CI at `75e33460a39` was queued at handoff (28 queued, 2 done).
- The PR's GitHub title and body still need replacing from `pr_description.md` and `pr_titles.md`. That's John's job.
- Scope questions for John:
  - ~~File an issue for the source-version bug?~~ Queued as `gx_issues/to_file/refactor_rewrites_source_workflow_version.md` (John, 2026-10-02); once filed, change the opener to `Fix 🎯 #23762 and 🎯 #NNNN`.
  - Have the editor's Upgrade say "already up to date" from `changed` (#22534)?
  - Normalise the first-upgrade `RuntimeValue` → `ConnectedValue` save of format2 uploads?
  - Correct #23762's `tool_version_change` claim with a comment?
  - Abandon #23790 and #23792, or still want #23792 on `release_26.1`?
