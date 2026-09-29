Targets `dev`. This changes API behaviour: a non-dry-run refactor no longer
always adds a workflow version.

## What

Fixes #23762. `PUT /api/workflows/{id}/refactor` with `dry_run: false` saved a
new workflow version even when the actions changed nothing. An
`upgrade_all_steps` on an already-current workflow, or an `update_name` to the
current name, added a version identical to the previous one. Callers that
refactor routinely fill the history with duplicates. `planemo autoupdate` does
this on every run.

Now `do_refactor` works out whether the actions changed the workflow:

- **Unchanged, refactoring the latest version, not a dry run:** no save. The
  response returns the existing version.
- **Refactoring an older `version`:** always saves, as before. A no-op there
  makes an identical copy the new latest version, which acts as a revert.
- **Dry runs:** unchanged. The response now also reports whether the actions
  would change the workflow.

`RefactorResponse` gains a required `changed: bool` field. The client API schema
is regenerated. No client code reads the field yet.

## How the change is detected

The source version and the refactored result are exported by the same function,
`_workflow_to_dict_export(..., internal=True)`, and the two dicts are compared.
The refactored result is built through the existing dry-run path
(`update_workflow_from_raw_description` with `dry_run=True`) and not saved.

An earlier version of this branch compared the source export with the
executor's edited dict instead. That missed changes and reported false ones,
because the two dicts are built differently:

- **Missed changes:** the executor edits step `position` in place, and that
  dict object is shared with the source export. So `update_step_position`
  looked like a no-op and the move was lost.
- **False changes:** `upgrade_all_steps` rewrites every `input_connections`
  value as a list, while exports use single dicts. Subworkflow `content_id`s are
  raw integer ids in one dict and encoded ids in the other. Re-injected steps
  use the older tool-state encoding, where each value is JSON-encoded a second
  time.

Exporting both sides with the same function removes all of these. Only two keys
are left out of the comparison:

- **`tags`:** stored-workflow data that refactoring doesn't change, and a dry-run
  build doesn't export it.
- **`uuid`:** every build gets a new one.

The source is exported without `allow_upgrade`, so a pending load-time tool
substitution counts as a change and is saved. For example, a workflow stored
with a tool version that isn't installed gets the substituted version.

The executor now works on a deep copy of the export. Before, a position shift
also changed the source version's `WorkflowStep.position`, because both used the
same JSON object. Anything that later committed the session wrote the move into
the old version too.

## Dry-run builds leaked step children into the session

This is a separate bug, but this PR's comparison build hits it, so the fix is
here. `__module_from_dict` already expunges a dry-run step if it ended up in the
session. A subworkflow step does, via `ensure_object_added_to_session` in
`SubWorkflowModule.save_to_step`. But `WorkflowStep.workflow_outputs`, `inputs`
and `post_job_actions` use the default cascade, which doesn't include expunge.
Children created while the step was in the session stayed pending, so the next
commit failed:

```
SAWarning: Object of type <WorkflowStep> not in session, add operation along
'WorkflowOutput.workflow_step' won't proceed
```

Dry-run refactor requests have the same bug on `dev` today. It only goes
unnoticed because nothing commits after a dry run. The fix expunges those
children along with the step.

## Behaviour to be aware of

A workflow uploaded as format2 YAML stores connected inputs as `RuntimeValue`
in its tool state. `upgrade_all_steps` re-injects each step, and that rewrites
them as `ConnectedValue`. So the first upgrade of such a workflow saves a
version even if no tool version changed. Later no-op upgrades don't save.
`update_name` and similar actions don't re-inject steps, so they don't trigger
this.

A non-dry-run refactor now builds the workflow twice when something changed:
once without saving to compare, and once for real. A no-op costs one build, and
a dry run still costs one build.

## Testing

Each test below failed before the change it covers, except
`test_refactor_noop_of_previous_version_creates_version`. That one guards
existing behaviour.

API (`lib/galaxy_test/api/test_workflows.py`):

- **`test_refactor_noop_does_not_create_version`:** `upgrade_all_steps` and a
  same-name `update_name` on a current workflow report `changed: false` in both
  dry-run and real mode, and the version count stays the same.
- **`test_refactor_upgrade_reports_changed`:** a real tool upgrade reports
  `changed: true` and adds a version.
- **`test_refactor_noop_of_previous_version_creates_version`:** a no-op refactor
  of `version=0` still saves, and the latest version matches version 0.
- **`test_refactor_noop_with_connections_and_subworkflow`:** no-ops on
  `WORKFLOW_SIMPLE_CAT_TWICE` and `WORKFLOW_NESTED_SIMPLE`. This covers the
  false changes described above.
- **`test_refactor_step_position_creates_version`:** a position shift saves,
  and version 0's layout is unchanged. The test compares positions relative to
  each other, because saving shifts all positions so the top-left step sits at
  0,0.
- **`test_refactor_noop_saves_pending_tool_substitution`:** the pending
  substitution is saved. With the baseline exported using `allow_upgrade=True`
  the test fails, so it guards that choice.

Integration (`test/integration/test_workflow_refactoring.py`):

- **`test_refactor_saves_only_the_new_version`:** row counts after a
  subworkflow upgrade that drops an output. There's exactly one new `Workflow`,
  no stray `StoredWorkflow`, and only the new version's steps and outputs. The
  test fails without the expunge fix.
- **`test_subworkflow_upgrade_dry_run_writes_nothing`:** a dry-run subworkflow
  upgrade through the existing `_dry_run` helper, which checks nothing was
  written. This is the leak dry-run requests have on `dev`.

| Check | Result |
|---|---|
| `test/integration/test_workflow_refactoring.py` | 28 passed |
| `test_workflows.py -k refactor` (API) | 10 passed |
| mypy on `lib/galaxy/managers/workflows.py` | no new errors vs base |
| pre-commit (black, ruff, flake8, prettier, eslint) | clean |

## Not in this PR

- **The legacy `PUT /api/workflows/{id}` endpoint:** it saves a new version
  whenever `steps` or `comments` are sent, even if they're unchanged. The same
  comparison could apply there, but that's a separate change.
- **The workflow editor:** it already avoids executing a no-op upgrade on the
  client side. It could read `changed` from the dry-run response instead of
  counting messages, as a follow-up.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
