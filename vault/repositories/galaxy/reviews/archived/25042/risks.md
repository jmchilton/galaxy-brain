Mostly a two-way door, but it changes what saving from the editor writes into stored workflows: the editor-style workflow API now returns a step `in` block, and a tool form value that differs from a step input default now drops that default and keeps the value in `tool_state` instead.

<details><summary>Risk Details</summary>

- The editor-style workflow download (`style="editor"`) now includes `in` on steps that have defaults. Clients that PUT that dict back now send `in`, so it is a small API shape change on a release branch.
- On save from the editor (`from_tool_form`), a default whose shown form value was changed is silently dropped from `in` and the form value is written to `tool_state`. Saved workflow versions created this way carry that choice; older versions remain, but there is no automatic undo.
- The editor tool form now shows step input defaults in place of the stored tool state. If a default cannot be converted, is connected, is a data input, sets `refresh_on_change` (conditional tests), or is a runtime value, it is not shown and is kept as is. Users may see form values that differ from `tool_state` for other parameters and not understand why.
- "Changed" is decided by comparing the form value against the default after `to_python`, with `None` and `""` treated as equal. Parameters whose `to_python` round trip isn't stable (floats, multi-selects, lists, text with whitespace) could count as changed even when the user didn't touch them, which drops the default on an unrelated save.
- The old API test `test_defaults_editor` is removed. The new tests cover the same round trip more strictly.

</details>

<details><summary>Risk Review Advice</summary>

Focus on `step_input_defaults_changed_in_form` and `same_form_value`. Check that an untouched form round trip keeps every default type (select, multiple select, float, boolean, text, values nested in sections and repeats). If not, an unrelated editor save silently loses a default. Also check that the drop-on-change rule is the behavior wanted on 25.1, rather than keeping both values or warning the user.

Confirm that adding `in` to the editor payload doesn't break other editor-style consumers, such as workflow import from the editor, the run form and subworkflow steps. Also confirm the client store type change (`in` on `NewStep`) matches what the client sends back on save.

</details>
