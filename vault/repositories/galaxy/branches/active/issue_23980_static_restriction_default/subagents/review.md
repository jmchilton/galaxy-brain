# Normal review: issue_23980_static_restriction_default

A review subagent reviewed the first commit `b7e68efcde9` (read-only), given `_shared/REVIEW_FOCUS.md` plus the 21015 overlap. Nothing serious, no security findings. Acted on: findings 1 and 4. Commit `55b74d41f40` added the `restrictOnConnections` list-default API test (copied from 21015's `4736fd1d066`) and hoisted `_parameter_def_list_to_options` to module level, returning `list[OptionDict]` with `selected` set, which removed the loop that edited options afterwards. Finding 5 (unit test) was settled by the test challenge: the unit test was dropped and its dict case moved into the API test (`d200b2992ce`). Recovered from the session transcript on 2026-10-08, after the branch predated the current process.

Not acted on:
- **Falsy scalar default (`""`) never preselects** while a list containing `""` does. Kept the old truthiness guard for parity with existing behavior and with 21015; obscure.
- **List default on a `multiple: false` input marks several options selected.** Not a regression; 21015 adds save-time validation.
- **Rename `_is_default_option` → `_option_selected_by_default`.** Reviewer said the current name is acceptable.
- **`_parameter_option_def_to_tool_form_str` crashes on non-string or label-less dict restrictions.** Exists on dev, out of scope; possible separate issue.

<details>
<summary>Full review</summary>

## Review: issue_23980_static_restriction_default (b7e68efcde9)

I found nothing serious. The fix is correct and minimal. The unit suite passes (90 tests), the probe cases behave as expected, and mypy reports nothing in `lib/galaxy/workflow/modules.py`. No security concerns.

### Questions you asked
- **Is removing the top-level `selected` kwarg safe?** Yes. `YamlInputSource` (`lib/galaxy/tool_util/parser/yaml.py:621-629`) reads `selected` only per option, in `parse_static_options`. Nothing in `tool_util/parser` or `tools/parameters` reads a top-level `selected`, so the kwarg was dead.
- **Does preselection affect execution?** No. `execute` and `get_input_value` (`modules.py:1785-1835`) use `step.get_input_default_value` when nothing is supplied, and `get_initial_value` never runs. `compute_runtime_state` only substitutes stored defaults or `step_updates`. The change only touches the run form's `to_dict` value (`managers/workflows.py:1337-1340`). That aligns the form with what a run with no value supplied already did; before, they disagreed.
- **Edge-case probe** (script in scratchpad):

| Case | Result |
|---|---|
| Optional, no default | `None`, nothing selected |
| Optional, default `b` | `'b'` |
| Default not among the restrictions | `'a'` (falls back to the first option, same as before) |
| `multiple` with a scalar default | `['b']` |
| Dict restrictions `{value, label}` | Work |
| `suggestions` | Stays a `TextToolParameter` with `value='b'` and no `selected` (correct) |

- **Subworkflow path:** `restrict_options` now gets static options with `selected=True` from an inner input's default. Harmless: the single-connection path recomputes `selected` from the outer default, and the intersection path keys on value.

### Findings, by severity
1. **Low, test gap: the `restrictOnConnections` change is untested here.** `modules.py:1662` and `1676` change behaviour for list defaults: a `[b, c]` default used to select nothing and now selects both. The branch has no test for that path.
   - **Fix:** add an API test for it. The ready-made one is `test_value_restriction_selects_multiple_text_list_default` on the `issue_21015_multiple_text_param` branch (commit 4736fd1d066).

2. **Low, falsy scalar default never matches.** In `_is_default_option` (`modules.py:1340-1344`), the `bool(default_value and ...)` guard (kept from the old `restrict_options`) means a `""` default with `restrictions: ["b", ""]` preselects `b`. A list default containing `""` does match, so the two shapes disagree.
   - **Fix:** use `default_value is not None and value == default_value`, or only pass a default when `default_value_set` is true. This is an obscure edge case, so it's optional.

3. **Low, list default on a single-select input.** A list default with `multiple: false` marks several options selected (probe: `[b, c]` gives `init='b'`). The form shows the first match silently; integer inputs raise in the same situation (see `test_parameter_input_list_default_after_disabling_multiple`). This isn't a regression, and the 21015 branch adds save-time validation for it. Just noting it.

4. **Nit, reuse and abstraction.**
   - `OptionDict(label, value, selected)` already exists at `modules.py:198`. Rather than a separate helper plus a loop that edits the options afterwards (`modules.py:1732-1735`), consider hoisting the `_parameter_def_list_to_options` closure (`modules.py:1713`) to module level. It would take an optional `default_value`, set `selected`, and return `list[OptionDict]`.
   - That builds both option sources the same way and drops the mutation loop. `suggestions` would get `selected` set to False, which a `TextToolParameter` ignores.
   - Keeping `_is_default_option` as the matcher is fine. The name is acceptable; `_option_selected_by_default` reads slightly clearer.

5. **Nit, test quality.**
   - The unit test (`test/unit/workflows/test_modules.py:325-350`) recomputes the expected flags with its own matching logic (`option["value"] in expected_values if isinstance(option, dict) else ...`). Hard-coding the expected `selected` list per parametrize case would read more simply and avoid repeating the logic under test.
   - The unit test overlaps the API test for the two string cases; only the dict case is unique to it. Either keep the unit test (it's cheap) or fold the dict case into the API test.
   - Imports are fine: nothing new and nothing inside functions.

6. **Out of scope, but seen while probing.** On dev, `step_state_to_tool_state` → `_parameter_option_def_to_tool_form_str` (`modules.py:1906`) crashes on non-string restrictions (`[0, 1]` raises `TypeError`) and on dict restrictions without a `label` (`KeyError`). Not caused by this branch; possibly worth a separate issue.

### Overlap with `issue_21015_multiple_text_param`
- **Same meaning.** 21015's `default_values` (the list, or `[default] if default else []`, then membership) behaves exactly like `_is_default_option`, truthiness guard included. 23980 fully covers 21015's change to `restrict_options` in commit 4736fd1d066.
- **Conflict shape.** Both branches edit the same two `"selected":` lines in `restrict_options` (around lines 1655-1677), and 21015 also adds the `default_values` block just above. That's a small textual conflict.
- **Resolution.** Whichever branch lands second keeps 23980's helper calls and drops 21015's `default_values` block. Keep 21015's API test, which also closes finding 1. 21015's separate `populate_state_from_tool_form` validation hunk at line 1354 doesn't conflict.

### Files
- `/Users/jxc755/projects/worktrees/galaxy/branch/issue_23980_static_restriction_default/lib/galaxy/workflow/modules.py`
- `/Users/jxc755/projects/worktrees/galaxy/branch/issue_23980_static_restriction_default/test/unit/workflows/test_modules.py`
- `/Users/jxc755/projects/worktrees/galaxy/branch/issue_23980_static_restriction_default/lib/galaxy_test/api/test_workflows.py`
- Probe script: session scratchpad `edge.py` (not kept)

</details>
