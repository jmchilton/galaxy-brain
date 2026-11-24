# Thermo review — PR #25002

- Profile: thermo_review (`_shared/reviewers/thermo_review.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `8dd9549cab94b9b3568b098fcc02255faecfcead` (base merge-base `6864679ef0b0`, target `dev`)
- Scope: structure / reuse only; code not run.

## Verdict

Mid-sized feature, well tested, sensible layering (resolution in the scheduler, substitution in `RenameDatasetAction`, port synthesis next to `when` gate ports). No file crosses 1k (`modules.py` was already ~3.8k). Two structural issues worth fixing before merge: the PR adds a second, subtly different copy of "resolve the value of a step input" inside `ToolModule.execute`, and it carries resolved values to the rename through a hidden action-argument key on a fake ORM `PostJobAction`, which forces an optional mode onto `_effective_post_job_actions` and threads a new parameter through both handlers. Client side is mostly fine; small duplication and a type-lie on the synthesized port.

## Findings

### P2 1 — Second copy of step-input resolution in `ToolModule`; extract one helper

`lib/galaxy/workflow/modules.py` `_referenced_step_input_values` re-implements the dispatch the `when` loop in `ToolModule.execute` already does (~L3350–3372): "name is a tool input → `progress.replacement_for_input`; else extra step input → `replacement_for_connection(connections[0])`; else step default". The PR also edits that `when` loop (adds the `default_value_set` fallback), so the two copies now carry the same three-way branch but diverge in details a reader has to diff by hand:

- `when` loop: `is_data=True`, no `replace_expression_json_dataset`, honours `iteration_elements`, skips `|`-nested names.
- rename path: `is_data=False, optional=True`, applies `replace_expression_json_dataset`, short-circuits data inputs, no iteration elements.

`SubworkflowModule.execute` (~L1060) has a third, older copy. This is exactly the "copy-pasted logic instead of extracted helper" case: the next extra-input consumer will add a fourth.

Suggested move: extract one function, e.g. `_step_input_replacement(trans, progress, step, name, all_inputs_by_name, *, iteration_elements=None, is_data=True)`, returning the raw replacement (or `NO_REPLACEMENT`). The `when` loop and `_referenced_step_input_values` both call it; the rename path keeps only what is rename-specific (expression.json read, collection-of-values guard, `format_step_input_reference`). The divergences above become explicit arguments rather than incidental differences. Also move the inline "collection of values" predicate (`extension == "expression.json" and not is_skipped` over `dataset_instances`) into a named helper next to `replace_expression_json_dataset`; it is a data-shape rule, not rename logic.

### P2 2 — Values reach the rename via a hidden action-argument key on a fabricated `PostJobAction`

`STEP_INPUT_VALUES_ARGUMENT = "step_input_values"` is a magic key stuffed into `action_arguments` (the persisted shape of a PJA) on a freshly constructed ORM `PostJobAction(pja.action_type, None, pja.output_name, ...)`, with comments explaining it must never be stored. Consequences:

- An implicit contract between `modules.py` and `post.py` hidden in a dict that is otherwise user/stored data; any `action_arguments` with that key (API, import) would be honoured too.
- `_effective_post_job_actions` gains an optional `step_input_values` mode and is called twice per step (once raw to find references, once to rewrite), and `step_input_values` is threaded as a new positional param through both `_handle_post_job_actions` and `_handle_mapped_over_post_job_actions` (each re-deriving the effective list).
- Constructing a transient mapped ORM object is the kind of thing that later gets accidentally attached to a session (bug-hunter territory; not verified here).

Cleaner options, in increasing ambition:

1. Minimum: compute the effective (rewritten) PJA list once in `execute` and pass the list into both handlers; drop the optional mode from `_effective_post_job_actions`.
2. Better: pass the values as an explicit argument next to `replacement_dict` (`ActionBox.execute(..., replacement_dict, step_input_values=...)` → `RenameDatasetAction._gen_new_name`), the same way `replacement_dict` already avoids mutating the PJA ("Pass along replacement dict with the execution of the PJA so we don't have to modify the object", existing comment in `_handle_post_job_actions`). No fake PJA, no magic key, no transient-copy comments. The unit tests in `test_post_job_actions.py` then call `_gen_new_name` with the values directly.

### P3 1 — Client: duplicated "name already owned by step" predicate and a port whose `type` is ignored

`client/src/stores/workflowStepStore.ts`:

- `findStepExtraInputs` checks "is in `step.inputs` / already an extra input / is a `tool_state` key" inline; `unconnectedGateNames` has the same `step.inputs.some(...)` + `hasOwnProperty(step.tool_state, ...)` predicate. Extract one `stepOwnsInputName(step, name)` used by both.
- `renameReferencePort` declares `type: "text"`, but `InputRenameReferenceTerminal.attachable` overrides `InputParameterTerminal.attachable` wholesale and never consults `type`, `optional` or `acceptsMultipleValues`. The port claims to be a text parameter while accepting integers/floats/booleans. Since it inherits nothing behavioural from `InputParameterTerminal` except construction, either derive from `BaseInputTerminal` directly, or drop the flag and fold the behaviour into the type model (a dedicated parameter `type` the factory dispatches on) so `rename_reference?: boolean` doesn't become a second discriminator next to `input_type`/`type`. Optional; current code works.

### P3 2 — Playwright driver: duplicated `new_page` call

`lib/galaxy/selenium/driver_factory.py` `get_playwright_driver` duplicates the `new_page(viewport=...)` call across the `if video_dir` branches. Build the kwargs once and add `record_video_dir`/`record_video_size` when set. Nit.

## Notes (not findings)

- `$(inputs.name)` regex is duplicated in TS and Python; acceptable across languages and the TS side cross-references the Python constant.
- `map_over.py`: for a step that also has a `when` expression, a rename-reference input connected to a collection is now added to `collections_to_match` (all non-tool step inputs are), so the step maps over before `_referenced_step_input_values` fails it; without a `when` it fails unmapped. End result is the same failure, but the path differs — flagged for the bug-checking reviewer, not verified.
- Second commit (Playwright video/slow-mo) is cleanly separated and small.
