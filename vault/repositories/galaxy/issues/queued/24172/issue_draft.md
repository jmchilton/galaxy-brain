# Dynamic select in the workflow run form shows "No options available" and blocks the run

When a tool step's select (or `data_column`) gets its options from a dataset, the workflow run form can render an empty dropdown that the user can't fill and can't get past.

| Select's `data_ref` is connected to... | Run form today |
| --- | --- |
| A workflow data input, dataset `ok` | Empty until the input is picked, then populates. Works. |
| A workflow data input, dataset queued / uploading / needs implicit conversion | **"No options available."** Required param → "Please provide a value for this option." → Run blocked. |
| An upstream tool step's output | Bare text box, no explanation; value typed blind. |

A related symptom: with empty options, a value saved in the editor is kept in state but not displayed, which reads as "my selection disappeared".

The server already knows the options can't be resolved — `SelectToolParameter.to_dict` emits `textable` for exactly this case — but nothing in the client reads it. `populate_model.py` sets `textable = True` with the comment "This hack leads client to display a text field." It doesn't: the only client reference copies the flag into the model after a refetch and nothing consumes it.

<details><summary>Code read (unverified, line refs omitted)</summary>

- `_workflow_to_dict_run` injects modules with `add_dummy_datasets(...)` in `USE_HISTORY` mode: inputs connected to other steps become `ConnectedValue`, so their `data_ref` selects have empty options.
- `is_runtime_context` is true when in workflow building mode, any context value is a runtime placeholder, or any referenced HDA isn't `ok`.
- `model.js` decides `is_workflow` from `options.length === 0 && !dataResolved` heuristics, which miss the "dataset not ready yet" case, so `FormSelection` renders with `options: []`.
- `onHistoryChange` refetch is guarded on `Galaxy.currHistoryPanel` (already removed on dev?).

</details>

## Context

Related to 🎯 #21099 / 🔀 #23802 (`data_column` workflow inputs). Companion drafts: `dynamic_select_editor_explain_and_expose.md` (editor side) and `step_parameter_invalid_failure.md` (what happens when the typed value turns out wrong).

## Proposed Approach

Have the server say *why* options are unavailable instead of the client guessing. When a dynamic select's options are empty, `to_dict` adds `options_unavailable: {reason, data_ref}` with reasons such as `data_ref_runtime`, `data_ref_not_ready`, `data_ref_missing`, `no_options`. The run form renders an explained text control for those ("Options will be read from *X* once it's ready; enter a value or wait and reselect") instead of an empty dropdown, and refetches when the referenced dataset turns `ok`. Additive to the tool form JSON.

## Alternative Approaches

Computing the reason client-side from `is_dynamic`, `textable` and step connections is what `model.js` already tries, and it gets the not-ready case wrong. Simply consuming `textable` as originally intended would remove the dead end but gives the user no reason or guidance.
