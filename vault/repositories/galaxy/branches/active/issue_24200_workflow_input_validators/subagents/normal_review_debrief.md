# Normal review debrief

Acted on: must-fix #1 (a `length` validator with min > max imported, then crashed at runtime). `_check_validators` now builds runtime validators via `to_validators`, so any construction failure becomes a 400 at save. #3: the form-shape predicates now use the validator models' field defaults, not hand-written key whitelists, so `implicit: false` and similar spelled-out defaults stay editable. #6: error message uses `(unlabeled)` when no label, drops pydantic's "Value error, " prefix, and has one formatter. Tests added for each.

Not acted on:
- #2 cross-group order. Within the shown and hidden groups, validator order is kept. Shown validators (range, then regex rows) come before hidden ones. Only the first failure message can change. Documented here rather than adding a position-tracking scheme to the hidden field.
- #4 validator/parameter-type compatibility. The tool linter map (`PARAMETER_VALIDATOR_TYPE_COMPATIBILITY`) has no entries for `directory_uri`, `color` or `boolean`. Importing linter tables into workflow modules is also the wrong coupling. Candidate follow-up: move the map into `tool_util_models` and share it.
- #5 hidden validators are not visible in the editor. Low risk for existing workflows, since stored ones only hold form-shaped validators. For the PR description and a later editor follow-up.

<details><summary>Full review</summary>

Reviewer approach was sound. On the client, `useFormState.buildFormData` indexes hidden inputs, so `extra_validators` reaches build_module and the saved tool_state. `save_to_step` has one caller, `__module_from_dict`, which covers import, update, refactor and subworkflow import. Copy and extract do not use it. The min<=max model check only moves an already-fatal tool error earlier.

1. Must-fix: `length` min > max crashes at runtime.
2. Order is rewritten (shown before hidden).
3. Predicates treat explicit defaults as extra keys.
4. No validator/parameter-type compatibility check.
5. Hidden validators cannot be edited; an invalid one blocks later saves.
6. Error message polish (None label, pydantic prefix, duplicate except branches).

</details>
