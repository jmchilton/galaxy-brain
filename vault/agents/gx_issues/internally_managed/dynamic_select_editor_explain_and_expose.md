# Workflow editor silently turns dynamic selects into unexplained text boxes

In the workflow editor, any select whose options come from a connected dataset (e.g. Cut's "Column", `from_dataset` selects) is rendered as a bare text field — no hint what to type, no indication options will exist at run time, no pointer to the pattern that actually works.

Before / after for a "Column" parameter on a step wired to an upstream tool:

| Today | Proposed |
| --- | --- |
| Empty text box. For `multiple="true"`, a textarea expecting `1\n2\n3`. | Text field plus: *"Options for this parameter come from the dataset connected to Input 1, which only exists when the workflow runs. Enter a column number, set it at run time, or expose it as a workflow parameter."* and an **Expose as workflow parameter** button. |

The working pattern — connect an integer/text workflow parameter to the select — already exists (`terminals.ts` lets a select accept a text parameter and a `data_column` an integer). Nothing tells authors about it, so they leave the value blank or set-at-runtime and runners hit the run-form dead end in `dynamic_select_run_form_dead_end.md`.

Also proposed: a Best Practices lint section listing every dynamic select that can't resolve in the editor and is neither set, set at runtime, nor connected, with a per-item and "fix all" action.

<details><summary>Why it's a text box (code read, unverified)</summary>

- `ToolModule.get_config_form` calls `add_dummy_datasets`, setting every connected data input to `ConnectedValue()`, so every `data_ref`-driven select has empty options in the editor by construction.
- `FormTool.vue` sets `input.is_workflow` when options are empty; `FormElement.vue` then renders `FormText` (or `FormOptionalText`) with no help.

</details>

## Context

Related to 🎯 #21099 and 🔀 #23802 (integer workflow parameters feeding `data_column`), 🎯 #14304 (list inputs unclear in the editor). Server-side reason field shared with `dynamic_select_run_form_dead_end.md`.

## Proposed Approach

A small `FormRuntimeSelect` element in the editor driven by the server's `options_unavailable` reason, and an `extract_input` refactor action extended to parameter inputs so "Expose" inserts a correctly typed, labelled parameter node (integer for `data_column`, text for other selects) and connects it. The lint section emits the same refactor actions. Multi-valued column parameters get the explanation but not the expose button, since a multi-valued column input can't connect yet.

<details><summary>extract_input today</summary>

`_apply_extract_input` raises on `type="parameter"` (via `_apply_add_input`). Mapping can reuse the table `_apply_extract_untyped_parameter` already uses (select/genomebuild → text, integer, float) plus `data_column` → integer. The refactor schema already carries input, label and position.

</details>

## Alternative Approaches

Reusing `extract_untyped_parameter` by writing `${name}` into tool state would work but leaves legacy syntax the linter itself flags. A combobox of guessed options has no data to guess from in the editor.
