The workflow editor warns that a rename's `${name}` is an untyped parameter even when a parameter input with that label already fills it, and its one-click fix can only fail.

```yaml
class: GalaxyWorkflow
inputs:
  sample_name: string      # parameter input labelled sample_name
  reads: data
outputs:
  renamed:
    outputSource: cat/out_file1
steps:
  cat:
    tool_id: cat1
    in:
      input1: reads
    out:
      out_file1:
        rename: "${sample_name} reads"   # filled from sample_name at run time
```

| Where `${sample_name}` appears | Filled from the `sample_name` input at run time? | Editor lint today |
|---|---|---|
| Rename (`newname`) | ✅ yes | ❌ warns "untyped parameter" (false positive) |
| Other post-job action args (tags…) | ❌ never substituted | ⚠️ warns, but the fix fails if this is the only use |
| Tool state value | ❌ no (the API never fills it) | ✅ warns (correct) |

✅/❌ in the lint column mean right/wrong; ⚠️ means it flags a `${...}` that is never substituted, but calls it an untyped parameter and offers a fix that can't succeed.

What happens in the editor:

- With the workflow above, the lint flags `${sample_name}`. "Extract untyped parameter" tries to add a second input labelled `sample_name`, and Galaxy rejects it: `Duplicated step label 'sample_name' in request.`
- Starting instead from a rename `${p} …` with no input `p`, the fix adds a text parameter input `p` and leaves the rename as `${p} …`, the intended fixed form. The lint re-runs and flags `${p}` again, and the warning never clears: applying the fix again hits the duplicate-label error above.

The run form already gets this right: it doesn't prompt for a post-job action parameter whose name matches a parameter input label.

<details><summary>Code pointers (dev)</summary>

- Editor detection: `getUntypedWorkflowParameters` in `client/src/components/Workflow/Editor/modules/parameters.ts` regex-matches every `${...}` in tool-form values and in every post-job action argument. It never looks at step labels.
- Run time: `WorkflowProgress.effective_replacement_dict()` (`lib/galaxy/workflow/run.py`) adds each labelled `parameter_input` step's value to the replacement dict. Only `RenameDatasetAction` (`lib/galaxy/job_execution/actions/post.py`) uses it.
- Run form precedent: `client/src/components/Workflow/Run/model.js` skips step `replacement_parameters` found in `parameterInputLabels`, while tool-form `${...}` values always get a prompt. `replacement_parameters` (`get_informal_replacement_parameters`, `lib/galaxy/workflow/modules.py`) scans every post-job action argument, so the run form also prompts for tag `${X}` values that `TagDatasetAction` then ignores.
- Fix action: `_apply_extract_untyped_parameter` (`lib/galaxy/workflow/refactor/execute.py`) keeps `${name}` in renames unless a different label is chosen (`test_refactoring_legacy_parameters_without_tool_state*` in `test/integration/test_workflow_refactoring.py`). It only looks at rename actions and tool-state values equal to `${X}`, so a `${X}` used only in a tag action fails with "Failed to find ${X} in the tool state or any workflow steps."
- Duplicate label: the refactor rebuilds the workflow through `_workflow_from_raw_description` (`lib/galaxy/managers/workflows.py`), which raises `DuplicatedIdentifierException` on a repeated step label.

</details>

## Context

Found while working on 🔀 galaxyproject/gxformat2#271 and 🔀 jmchilton/galaxy-tool-util-ts#195, which make the format2 best-practice lint skip renames that reference a declared parameter input label. The gxformat2 PR's IWC sweep found two such renames in MGnify workflows. Related to 🎯 #10989, the lint-panel polish tracker.

## Proposed Approach

In `getUntypedWorkflowParameters`, collect the labels of `parameter_input` steps and skip rename references whose name is one of them, matching the run form. Only scan rename `newname` arguments in post-job actions, since nothing else is substituted. Keep flagging tool-state `${...}`.

## Alternative Approaches

We could keep flagging declared-label renames and make the fix rewrite them instead, or leave non-rename post-job actions in the lint. Exempting matches the run form and run-time behavior and needs no backend change.

<details><summary>Alternatives In Detail</summary>

### Alternative: Make the fix rewrite the rename

<details><summary>Description</summary>

#### Details

Have `extract_untyped_parameter` replace `${p}` with some other syntax so the lint stops matching.

#### Why the proposed approach is preferred

`${name}` is the only rename placeholder that takes a parameter value (`#{input}` takes a dataset name), so there is nothing to rewrite it to.

</details>

### Alternative: Keep scanning all post-job action arguments

<details><summary>Description</summary>

#### Details

Leave non-rename actions in the lint.

#### Why the proposed approach is preferred

Those `${...}` are never substituted, and the offered fix fails on them, so the warning points to a fix that can't succeed. A separate "never substituted" warning would be more accurate if one is wanted.

</details>

</details>
