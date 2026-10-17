# Codex review (round 2)

Codex reported one P2 finding. It's confirmed and fixed in `b5603b823cb`. Nothing went unacted. The review ran independently and read-only over `57bf3eebd77..b5c7505e1b3` (the head, on the final parent).

**Duplicate legacy input names: the export and the run model disagreed.** Confirmed.

- **The bug.**
  - Review round 1 made `step_effective_label` `null` for an effective label shared by several steps.
  - `WorkflowInvocation.recover_inputs()` still exported those steps under the shared label, so they collapsed to one key (last wins).
  - The client then looked those steps up by index, found nothing, and left them unfilled.
  - Calling `/request` directly had the same collision: resubmitting with `inputs_by=name` would feed one dataset to every step that shares the name.
  - Codex's point was that the two sides implemented conflicting reference policies.
- **The fix.**
  - `Workflow.request_input_labels()` in `lib/galaxy/model/__init__.py` is now the single policy. A step is referenced by its effective label, or by `None` (meaning its order index) when the label is missing or shared.
  - `recover_inputs()` and `_workflow_to_dict_run` both use it.
  - The manager-level `_request_input_labels` helper is gone.
  - `/request` now exports same-named legacy inputs by index under `inputs_by="name|step_index"`. That path already existed for unlabeled steps, and `_normalize_inputs` resolves it. Each step is now prefilled with, and resubmitted with, its own dataset.
- **Client surface unchanged.** `step_effective_label` keeps the same meaning, and `withRerunValues`, `rerunInputValue` and `mountRerun` are untouched.
- **Test.** The unit test `test_request_references_legacy_input_steps` replaces `test_request_input_labels`. It was red at the `recover_inputs` assertion first, since the shared name collapsed to one key. It pins both the labels and the `/request` keys. Legacy rows can't be created through the API.
- **Validation.**
  - Unit: 15 pass.
  - API, under the lock: 25 pass across run-form, request, step-param, rerun and recover tests.
  - black, isort and mypy (from `lib/`) are clean.

<details><summary>Codex output</summary>

Codex reviewed all the changed files plus `services/invocations.py`, `workflow/modules.py`, `run_request.py`, `tools/__init__.py`, `tools/parameters/__init__.py` and `workflow_support.py`. It didn't run the API or browser suites.

Finding P2, correctness, certain, at `lib/galaxy/managers/workflows.py:794`: "Duplicate legacy input names do not match exported request keys".
- **What it found.** `_request_input_labels` returns `None` for duplicated effective labels. `recover_inputs` still exports those inputs under their effective label, without checking uniqueness. So `rerunInputValue` searches step indices that aren't in the request, and the saved defaults stay. The export and the run model should share one input-reference policy.
- **Scenario.** An older workflow has two unlabeled data inputs, both with `tool_inputs.name = 'Input Dataset'`. The exported request contains `{'Input Dataset': A}`, while both run-model steps get `step_effective_label = null`. In the expanded rerun form, neither input is prefilled. Codex reproduced this with the real helper and `recover_inputs`.

</details>
