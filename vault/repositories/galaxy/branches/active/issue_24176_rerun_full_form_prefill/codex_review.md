# Codex review

Codex (independent, read-only, `5cf81e75c12..bab10d268ef`) reported one finding. I confirmed it but didn't act: it's pre-existing behaviour of the shared rerun input lookup and only hits legacy workflows. No code changes came out of this review.

Not acted on:
- **Legacy unlabeled input steps aren't prefilled (P2, confirmed, pre-existing).**
  - `WorkflowInvocation.recover_inputs()` keys inputs by `WorkflowStep.effective_label`. That falls back to `tool_inputs["name"]` for input steps without a label (`lib/galaxy/model/__init__.py:9670`).
  - The run-style download sends only `step.label` as `step_label`, so `rerunInputValue` (`client/src/components/Workflow/Run/model.js`) looks the step up by `step_index` and misses.
  - The rule is the simple form's existing rerun lookup, unchanged. This branch only shares it with the expanded form, so the simple form on dev already has the gap.
  - Fixing it means sending `effective_label`, or a separate rerun key, in the run-style step model. That changes `step_label`, which the simple form uses for display and for landing request keys, or adds a new field. Better as its own follow-up than as part of this branch.
  - Impact: old workflows whose input steps have a `name` but no label. On rerun the expanded form leaves those inputs at their default selection, the same as dev.

<details><summary>Full Codex output</summary>

Coverage: it read all changed files plus `WorkflowRunInputStep.vue`, `WorkflowRunDefaultStep.vue`, `FormData.vue`, `constants.ts`, `services/invocations.py`, `workflow/modules.py`, `run_request.py`, and `tools/parameters/{__init__,basic}.py`. It did not run the full API or component suites. It reproduced the lookup failure directly with Node.

Finding (P2, correctness, certain): `client/src/components/Workflow/Run/model.js:251`, "Legacy input names are ignored when prefilling the expanded form".
- **Detail.** `WorkflowInvocation.recover_inputs()` keys inputs by `WorkflowStep.effective_label`, which falls back to `tool_inputs['name']` for older input steps without a label. The run export supplies `step.label` as `step_label`, so the helper searches by `step_index` instead and returns `undefined`. `WorkflowRunForm` then keeps the default selection rather than the original input.
- **Scenario.** An invocation of an older stored workflow has a data input at index 0 with `label=None` and `tool_inputs['name']='outer_input'`. Its request exports `inputs={'outer_input': {...}}`. The expanded rerun form doesn't select the original dataset. If another eligible dataset is the default selection, submitting reruns with that dataset.

Triage: CONFIRMED (`effective_label` at `model/__init__.py:9670`; `step_model["step_label"] = step.label` in `_workflow_to_dict_run`). The lookup rule predates this branch. It moved verbatim from `WorkflowRunFormSimple.vue` into `rerunInputValue`.

</details>
