Fix 🎯 #23762 and 🎯 #23885 - the workflow refactor API saves duplicate versions and rewrites the version it started from.

`PUT /api/workflows/{id}/refactor` has two bugs that damage a workflow's version history:

- **It saves no-op refactors (#23762).** With `dry_run: false` it always adds a version. An `upgrade_all_steps` on an already-current workflow, or an `update_name` to the current name, adds a copy of the previous version. `planemo autoupdate` runs `upgrade_all_steps` this way on every run, so routinely updated workflows fill up with duplicates.
- **It rewrites the source version (#23885).** The refactor executor edits the steps of the workflow it's given, and it was given the stored source version. After an `upgrade_tool` from 0.1 to 0.2, version 0's step *also* points at 0.2. A step position move shifts version 0's layout too. This happens through the API and through the editor's Upgrade and subworkflow upgrade buttons, whenever a newer tool or subworkflow exists.

***The two fixes share one mechanism: the unsaved build that detects a no-op is also what keeps the executor off the stored version.*** Each bug has a test that fails on `dev`.

This PR:

- **Skips the save when nothing changed.** ***A no-op refactor of the latest version now returns that version instead of a copy; refactoring an older version still saves, so reverts work as before.***
- **Reports the outcome.** `RefactorResponse` gains a `changed` field, for dry runs too. ***Request bodies and existing response fields are unchanged.*** The client schema is regenerated.
- **Gives the executor a detached build.** It runs against an unsaved dry-run build of the source, so the stored version is never touched.
- **Makes dry-run builds complete and detached.** Dry-run builds skipped post-job actions, so a workflow with hide, rename or datatype actions looked changed. They also put a subworkflow step into the session, along with its outputs, inputs and annotations, so the next commit failed with `SAWarning: Object of type <WorkflowStep> not in session` or saved orphaned annotation rows. Post-job actions are now built without being added to the session, and detached subworkflow steps stay out of it. Dry-run refactor requests on `dev` have the session bug. It goes unnoticed only because nothing commits after one.

***Only `PUT /api/workflows/{id}/refactor` changes. The editor's normal save, including choosing a step's tool version, doesn't go through it.***

<details><summary>How a no-op is detected</summary>

The source version and an unsaved build of the refactored description are both exported with `_workflow_to_dict_export(..., internal=True)`, and the two dicts are compared. Exporting both sides with the same function avoids false differences between the executor's edited dict and an export: `input_connections` lists vs dicts, raw vs encoded subworkflow ids, and doubly encoded re-injected tool state.

Three keys are left out of the comparison:

- **`tags`:** they belong to the stored workflow, which refactoring doesn't change.
- **`source_metadata`:** builds only get it when importing from a URL or TRS. Without this, no-op refactors of imported workflows still saved.
- **`uuid`:** every build gets a new one.

The source is exported *without* `allow_upgrade`, so a pending load-time tool substitution (a stored tool version that isn't installed) counts as a change and is saved.

The executor's input is a deep copy of the export, because the export shares each step's `position` JSON with the stored step.

A change to a field the export leaves out, or to one of the three dropped keys, would read as `changed: false` and not be saved. No current action edits such a field.

</details>

<details><summary>Cost: extra unsaved builds</summary>

Each build constructs every step's module and tool state. The no-op comparison also exports the source a second time, without `allow_upgrade`.

| Request | `dev` | This PR |
|---|---|---|
| Changed, not a dry run | 1 | 3 (executor scratch, comparison, save) |
| No-op on the latest version, not a dry run | 1 | 2 |
| No-op on an older version | 1 | 3 |
| Dry run | 1 | 2 |

The scratch and comparison builds can't be shared. The executor looks up model steps by their ids in the source description, while the comparison has to be built from the refactored description.

</details>

<details><summary>Behaviour to be aware of</summary>

A workflow uploaded as format2 YAML stores connected inputs as `RuntimeValue`. `upgrade_all_steps` re-injects every step, which rewrites them as `ConnectedValue`. So the first upgrade of such a workflow saves a version even if no tool changed. Later no-op upgrades don't save.

</details>

## Context

Supersedes #23790 and #23792 (both closed). 🎯 #23885 has the full reproduction and root cause of the source-version rewrite, and compares this fix with #23792's. Related to #22534: `changed` is what the editor's Upgrade button would need to say "already up to date".

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? The same build errors as before, raised earlier. A source description that can't be built now fails before the executor runs, where `dev` could still save a refactor that repaired it.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes - they check version counts, downloaded versions and database row ids.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None run differently. Refactor API callers (planemo, BioBlend, the editor's upgrade buttons) stop getting duplicate versions, and older versions are no longer rewritten.
- [x] Who hits this in practice and what is the evidence? `planemo autoupdate` users, per #23762. Anyone upgrading through the API or the editor's upgrade buttons has the pre-upgrade version rewritten, per #23885.
- [x] Were simpler or existing approaches considered? Yes - see details.

<details><summary>Alternatives considered</summary>

- **Decide from the action messages.** An empty message list can't decide it. A tool upgrade with no state change reports no messages (`test_tool_version_upgrade_no_state_change`), and neither do `update_name` or position moves.
- **Compare the executor's edited dict with the source export.** It missed position moves, because the dict shares `position` objects with the source, and reported false changes from format differences. An earlier version of #23790 did this.
- **Expire the source steps after the executor runs.** This was #23792's fix. It still let the executor write to persistent objects. The detached build reuses the comparison's build path, so nothing persistent is handed out.

</details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

API (`lib/galaxy_test/api/test_workflows.py`):

- `test_refactor_noop_does_not_create_version`: `upgrade_all_steps` and a same-name `update_name` report `changed: false` (dry run and real), and no version is added.
- `test_refactor_upgrade_reports_changed`, `test_refactor_annotation_reports_changed`: a real change reports `changed: true` and saves.
- `test_refactor_noop_of_previous_version_creates_version`: a no-op on `version=0` still saves and reports `changed: false`.
- `test_refactor_noop_with_connections_and_subworkflow`: no false changes from connections, subworkflows or post-job actions.
- `test_refactor_step_position_creates_version`: a position move saves, and version 0's layout is unchanged. On `dev`, version 0's layout moves.
- `test_refactor_noop_saves_pending_tool_substitution`: a pending substitution is saved.
- `test_refactor_upgrade_preserves_previous_version`: version 0 keeps tool version 0.1 after an upgrade.

Integration (`test/integration/test_workflow_refactoring.py`):

- `test_tool_version_upgrade_preserves_source_version`, `test_subworkflow_upgrade_preserves_source_version`: the source version keeps its tool version and subworkflow. Both fail on `dev`.
- `test_refactor_saves_only_the_new_version`: a subworkflow upgrade writes exactly one new `Workflow` and only its steps, outputs, connections, post-job actions and annotations.
- `test_refactor_of_annotated_subworkflow_step_saves_no_orphan_annotations`: dry and real refactors of a workflow with an annotated subworkflow step leave no annotation rows without a step.
- `test_subworkflow_upgrade_dry_run_writes_nothing`: the dry-run session leak. On `dev` this fails with the `SAWarning`.
- `test_refactor_noop_of_imported_workflow_does_not_create_version`: a no-op on a workflow with `source_metadata` doesn't save.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
