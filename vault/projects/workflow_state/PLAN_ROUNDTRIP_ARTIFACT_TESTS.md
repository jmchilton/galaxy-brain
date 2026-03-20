# Plan: API Tests for Roundtrip Representation Artifacts

**Status: IMPLEMENTED** — commit `0406f008e1`

## Goal

Verify that Galaxy correctly executes workflows whose native tool_state contains representation artifacts from schema-unaware format2 round-trip conversion.

## The Artifacts

Four representation changes from schema-unaware gxformat2 conversion:

### 1. Multiple select: comma-delimited string → JSON list
- Native: `"comment_char": "35"` (comma-delimited string)
- After conversion: `"comment_char": ["35"]` (JSON list)
- Galaxy's `multiple_select_value_split()` accepts both `str` and `List[str]`

### 2. Sections with all-None values dropped
- Native: `"global_trimming_options": {"trim_front1": null, "trim_tail1": null}`
- After conversion: key absent entirely
- gxformat2 omits state keys whose values are None/null

### 3. Empty repeat lists dropped
- Native: `"queries": []`, `"sql_stmts": []`
- After conversion: key absent entirely
- gxformat2 omits empty lists

### 4. Boolean string case normalization
- Native: `"shorten_values": "False"` (capitalized string)
- After conversion: `"shorten_values": false` (JSON boolean)
- IWC workflows (cutandrun, atacseq, VGP) have capitalized string booleans

## Implementation

### Test Data

```
lib/galaxy_test/base/data/wf_conversion/
├── README.md
├── format2/                        # Source of truth — human-authored
│   ├── multiple_select.gxwf.yml    # gx_select_multiple tool, single + multi value
│   ├── allnone_section.gxwf.yml    # gx_section_boolean tool, no state set
│   ├── empty_repeat.gxwf.yml       # simple_constructs tool, no repeat instances
│   └── boolean_case.gxwf.yml       # gx_boolean tool, true + false steps
├── multiple_select.ga              # ["--ex1"] list-form in tool_state
├── allnone_section.ga              # section key absent entirely
├── empty_repeat.ga                 # repeat key absent entirely
└── boolean_case.ga                 # true/false JSON booleans
```

All format2 workflows use test tools from `test/functional/tools/parameters/` — no ToolShed dependencies.

### API Tests

`lib/galaxy_test/api/test_wf_conversion_artifacts.py` — 6 workflow tests:

| Test | Artifact | `allow_tool_state_corrections` |
|---|---|---|
| `test_multiple_select_list_form` | List-form multiple select | Yes |
| `test_absent_allnone_section` | Absent section | Yes |
| `test_absent_empty_repeat_without_corrections` | Absent repeat (simple_constructs) | No |
| `test_absent_empty_repeat_with_corrections` | Absent repeat (simple_constructs) | Yes |
| `test_absent_empty_repeat_safe_template` | Absent repeat (gx_repeat_optional) | Yes |
| `test_boolean_case_normalization` | Lowercase JSON booleans | Yes |

`lib/galaxy_test/api/test_tool_execute.py` — 5 direct API tests (x3 input formats = 15):

| Test                                     | What it proves                                                  |
| ---------------------------------------- | --------------------------------------------------------------- |
| `test_empty_repeat_explicit`             | Explicit `[]` works via API                                     |
| `test_absent_repeat`                     | Absent repeat key works via API (populate_state fills defaults) |
| `test_repeat_with_instances`             | Repeat with data works normally                                 |
| `test_multiple_select_list_form`         | `["--ex1", "ex2"]` list form works                              |
| `test_multiple_select_single_value_list` | `["--ex1"]` single-value list works                             |
|                                          |                                                                 |

## Findings

| Artifact | Galaxy Handles It? | Details |
|---|---|---|
| Multiple select list form | **YES** | `multiple_select_value_split()` accepts both `str` and `List[str]` — both single `["--ex1"]` and multi `["--ex1", "ex2"]` work |
| Absent all-None section | **YES** (with corrections) | Requires `allow_tool_state_corrections=True` — Galaxy's upgrade checker flags the missing section but defaults are applied correctly |
| Absent empty repeat | **YES** (mostly) | `visit_input_values` silently defaults missing repeats to `[]`. Tools with well-written templates (using `len()` and `#for`) work fine. Tools with direct indexing (`$files[0]`) or dangling `&&` error. |
| Boolean case normalization | **YES** | `BooleanToolParameter` handles `true`/`false` (JSON), `"True"`/`"False"` (string), and Python `bool` equivalently |

### Key Finding: Absent Repeats Are Mostly Safe

Initial testing with `simple_constructs` showed absent repeats causing job errors. Follow-up with `gx_repeat_optional` revealed this was a **tool template bug** (dangling `&&` when repeat is empty), not a fundamental absent-repeat problem.

`visit_input_values` (line 236: `input_values.get(input.name, [])`) silently defaults missing repeats to `[]` in the in-memory state. This is sufficient for tools that use `len()` and `#for` (which handle empty lists). It fails only for tools that:
- Directly index into the repeat (`$files[0]`) when empty
- Have template syntax errors exposed by empty repeats (dangling `&&`)

**Two different state initialization paths exist but both handle absent repeats:**

| Path | Function | Missing repeat behavior |
|---|---|---|
| **Direct API execution** | `populate_state()` (`parameters/__init__.py:458`) | Initializes ALL params with `get_initial_value()`. Missing repeat → `[]` |
| **Workflow execution** | `params_from_strings()` → `visit_input_values()` | `params_from_strings` skips absent keys, but `visit_input_values` (called during `check_and_update_param_values`) backfills `[]` into the in-memory state |

The workflow path's backfill is sufficient for execution when the template handles empty repeats gracefully. Schema-aware conversion preserving `[]` would still be cleaner but is not strictly required for correctness.

### Absent Section Requires UI Follow-up

The `allow_tool_state_corrections` flag is needed because Galaxy's workflow upgrade checker flags the missing section as needing correction. TODO: add a UI/selenium test to verify these workflows can be opened in the editor and the upgrade banner is handled correctly.

## Resolved Questions

- **Which stock tools exercise each artifact type?** `gx_select_multiple` (multiple select), `gx_section_boolean` (section), `simple_constructs` + `gx_repeat_optional` (repeat), `gx_boolean` (boolean) — all in `test/functional/tools/parameters/`
- **Absent section vs section-with-all-None?** Galaxy treats them equivalently with `allow_tool_state_corrections`, but flags the absent section as an upgrade message.
- **Absent repeat vs empty repeat?** `visit_input_values` defaults absent repeats to `[]` in memory. Tools with good templates work fine. The `simple_constructs` failure was a template bug (dangling `&&`), not a parameter handling issue.
- **Does `allow_tool_state_corrections` matter for absent repeats?** No — Galaxy doesn't generate an upgrade message for absent repeats. `visit_input_values` silently backfills `[]` regardless of the flag.
- **Is this a workflow-specific problem?** The code paths differ (populate_state vs params_from_strings), but both ultimately handle absent repeats. Direct API execution is cleaner (initializes defaults upfront); workflow execution relies on the backfill in `visit_input_values`. Both work.
- **Boolean case?** Galaxy handles all forms (`true`, `"true"`, `"True"`, `True`) equivalently.
- **Multi-value multiple selects?** Tested — `["--ex1", "ex2"]` works correctly.
