# Initial implementation debrief

```
created .../differential-review/snapshots/20261101T144300Z-implementation-c3bf15ffc76f.json
  implementation @ c3bf15ffc76f vs origin/release_26.1 (merge-base 32f18adbdd1c)
  first snapshot: 3 commits, 4 files, 13 hunks
```

## Fix

The fix keeps the editor's single `value:label,...` field and makes its encoding lossless. This is the issue's "escape `,` and `:`" alternative, not the structured editor.

- **Helpers.** `parameter_options_to_form_str` and `form_str_to_parameter_options` live in `lib/galaxy/workflow/workflow_parameter_input_definitions.py`, next to `validators_to_form`/`validators_from_form`. They replace `InputParameterModule._parameter_option_def_to_tool_form_str` and the `_string_to_parameter_def_option` closure in `modules.py`.
- **Escapes.** In the field, `\,`, `\:` and `\\` stand for a literal comma, colon and backslash, and `\<whitespace>` keeps edge whitespace. A backslash before any other character is kept as typed, so existing strings like `C\data` don't change. The encoder only doubles a backslash where the parser would otherwise read an escape.
- **Empty entries.** A stray, doubled or trailing comma no longer adds a `""` option. A lone `:` is the empty value, so intentional `""` options round-trip, as in IWC's `["", "--cis-only", "--trans-only"]`.
- **Whitespace.** Unescaped whitespace is trimmed around each value and label, not just around each entry.
- **Normalization.** A label-less dict loads as a plain value; `_parameter_def_list_to_options` already treats both the same. Non-text entries load as text and `None` as `""`. Previously all of these raised, so no stored workflow depends on them.
- **Help text.** The editor help for both fields describes the syntax.

## Tests

- **Baseline commit (`af039d3bfee`).** It pins the cases that already worked: plain values, `value:label`, the editor string, and tool-form parsing for both restrictions and suggestions.
- **Unit tests.** They cover the round trips of every lossy case in the issue, normalization, direct parser cases, an exhaustive round trip over short strings of `a\,: `, and the exact editor string. Without the fix, 22 of them failed.
- **API test.** `test_text_input_static_restrictions_survive_download` uploads gxformat2 restrictions containing `:`, `,` and `""`, downloads, re-imports and downloads again. It fails on base with the exact splitting the issue describes, and passes with the fix.
- **Results.** `test/unit/workflows`: 252 passed. mypy and ruff are clean.

## Base and parent

Base is `release_26.1`, with no `parent_branch`; see `index.md`. #24140 touches disjoint functions (`restrict_options`, `_is_default_option`, run-form option building), so the two merge forward without conflict.

## Out of scope / follow-ups

- **Restrictions and suggestions together.** `step_state_to_tool_state` reads a state that has both keys as suggestions.
- **Dict without `value`.** A dict with no `value` key still raises `KeyError` on load. This is pre-existing.
- **Sample-sheet columns.** `FormColumnDefinition.vue` edits sample-sheet column restrictions as an unescaped comma string. It's lossy only when edited, on the client.
- **Structured editor.** A structured value/label editor, the issue's preferred fix, would be dev work because repeats don't work in this form.
- **Non-text entries at save time.** Rejecting them at save or import would match 26.2's strict typing.

## Incident

A concurrent `git stash pop` race briefly pulled another agent's stash into this worktree. Their work remained intact in the owning worktree, and a backup is in the scratchpad. I cleaned it up and restored my stash by SHA. I no longer use `git stash`.
