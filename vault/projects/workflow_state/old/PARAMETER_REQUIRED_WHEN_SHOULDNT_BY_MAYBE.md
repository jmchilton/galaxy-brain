# Issue: format2 conversion validation requires a connected conditional param

Status: open / not started
Branch: Galaxy `wf_tool_state`
Found: while swapping legacy roundtrip fixtures (2026-06-06); surfaced by
`test/unit/workflows/test_roundtrip.py::TestRoundTripSweep::test_sweep_report`
on framework workflow `empty_collection_sort`.

> Filename note: `..._SHOULDNT_BY_MAYBE` looks like a typo — probably
> `..._SHOULDNT_BE_MAYBE` ("required when it shouldn't be") or
> `..._SHOULDNT_BUT_MAYBE`. Rename when convenient.

## TL;DR

Native→format2 conversion of a `__FILTER_FROM_FILE__` step **declines** (raises
`ConversionValidationFailure`) because the *post-conversion* format2 validation demands
`how.filter_source`, even though `filter_source` is **satisfied by a connection**
(`how|filter_source` → `filter_file`), not by state. The required conditional param is
flagged missing when it shouldn't be — it's connected. Production degrades gracefully
(gxformat2 keeps native state), so this is a conversion-fidelity gap, not a runtime break.

Same strictness family as the disconnected-optional `RuntimeValue` work (strict
`workflow_step` model vs. connection-aware reality), but a **distinct mechanism**: a
**nested conditional** whose required leaf is connected, with the conditional **selector
absent** from tool_state.

## Symptom

`test_sweep_report` (strict per-step sweep) fails:

```
format2/empty_collection_sort: step 2 (__FILTER_FROM_FILE__):
  Failed to validate resulting cleaned step - not going to convert to an unvalidated tool state
```

Underlying pydantic error from `_validate_converted_result`:

```
pydantic_core.ValidationError: 1 validation error for DynamicModelForTool
how.__absent__.filter_source
  Field required [type=missing, input_value={}, input_type=dict]
```

`test_full_roundtrip_sweep` does NOT fail on it — when conversion declines, gxformat2 keeps
native state and the native→format2→native' round-trip is an identity. Only the strict
per-step sweep (which counts decline-to-convert as failure) trips.

## Reproduction

Source workflow `lib/galaxy_test/workflow/empty_collection_sort.gxwf.yml`:

```yaml
steps:
  filter_collection:
    tool_id: __FILTER_FROM_FILE__
    in:
       input: input                  # collection input, connected
       how|filter_source: filter_file # data input, connected INTO the conditional
```

After `python_to_workflow`, native step 2 is:

```python
tool_id: __FILTER_FROM_FILE__
tool_state: {"__page__": 0}          # NO 'how' selector / __current_case__
input_connections: {
  'input':            [{'id': 0, 'output_name': 'output'}],
  'how|filter_source':[{'id': 1, 'output_name': 'output'}],   # filter_source IS connected
}
```

```python
from galaxy.tool_util.workflow_state.convert import convert_state_to_format2
from galaxy.workflow.gx_validator import GET_TOOL_INFO
convert_state_to_format2(step2, GET_TOOL_INFO)   # raises ConversionValidationFailure
```

## Tool shape (`__FILTER_FROM_FILE__`, filter_from_file_1.1.0.xml)

```
input         :: gx_data_collection  optional=False
how           :: gx_conditional      optional=False
  when[remove_if_absent]:  filter_source :: gx_data optional=False
  when[remove_if_present]: filter_source :: gx_data optional=False
```

`filter_source` is a required leaf inside *both* branches of the `how` conditional.

## Root cause (hypothesis)

1. tool_state carries **no `how` selector** (no `__current_case__`), so the converter/
   validator can't pick a `when` branch — pydantic reports the conditional as
   `how.__absent__`.
2. `filter_source` is satisfied via the **connection** `how|filter_source`, recorded in the
   format2 `in:` block — NOT in `state`.
3. `_validate_converted_result` → `validate_format2_state(inputs, state, in_dict)`
   (`convert.py:120-124`) is *passed* the `in_dict`, but the connection at the nested path
   `how|filter_source` is apparently **not recognized as satisfying** the nested-conditional
   required leaf. The strict `workflow_step` model demands `filter_source` in state.

So the validation models a connected conditional leaf as missing. The connection-aware path
(`workflow_step_linked`, which admits `ConnectedValue`) is either not used here or does not
descend into a conditional whose selector is absent.

This rhymes with the broader plan's finding: the strict `workflow_step` schema rejects shapes
that are legal once connections are considered. Here the twist is the **absent conditional
discriminator** — the branch is only knowable from the connection path `how|filter_source`.

## Impact / scope

- **Production: benign.** `make_convert_tool_state` catches `ConversionValidationFailure` and
  returns `None`; gxformat2 falls back to copying native tool_state. The workflow imports;
  it just doesn't get cleaned format2 state for this step. (Same "better ugly than corrupt"
  contract as elsewhere.)
- **Tests:** blocks the strict per-step sweep from going green. Currently the only
  non-legacy failure in `test_roundtrip.py` after the fixture swap.
- **Corpus:** unknown how many IWC/real workflows hit connected-into-conditional with an
  absent selector — worth a sweep count (the broader plan already greps IWC for related
  shapes).

## Proposed fix directions (pick during focused work)

- **OPTION_CONNECTION_AWARE_NESTED** — make the post-conversion validation recognize a
  connection at a nested conditional path (`how|filter_source`) as satisfying that leaf, and
  infer/relax the conditional branch when the discriminator is absent but a branch-specific
  leaf is connected. (Mirrors `workflow_step_linked` ConnectedValue admission, extended to
  conditionals.)
- **OPTION_VALIDATE_AGAINST_LINKED** — validate the cleaned state against the
  connection-aware (`workflow_step_linked`) model with the `in:` connections injected, rather
  than the strict `workflow_step` model, when connections are present (parallels the plan's
  `validate_format2_state` linked-validation idea).
- **OPTION_INFER_SELECTOR_FROM_CONNECTION** — when a conditional's discriminator is absent
  but a connection targets a path under exactly one branch, treat that branch as selected for
  validation purposes.

## Key files

- `lib/galaxy/tool_util/workflow_state/convert.py:110-124`
  (`_convert_valid_state_to_format2` → `_validate_converted_result` → `validate_format2_state`)
- `lib/galaxy/tool_util/workflow_state/validation_format2.py` (`validate_format2_state`)
- `lib/galaxy/tools/filter_from_file_1.1.0.xml` (the tool)
- `lib/galaxy_test/workflow/empty_collection_sort.gxwf.yml` (repro fixture)
- `test/unit/workflows/test_roundtrip.py` (`TestRoundTripSweep::test_sweep_report`)

## Open questions

1. Does `validate_format2_state` already attempt connection-aware (`workflow_step_linked`)
   validation, and if so why doesn't the nested `how|filter_source` connection register?
2. Is the absent `how` selector the actual blocker (no branch to validate), or is it purely
   the connection-not-recognized issue? (The `how.__absent__` in the error suggests the
   former contributes.)
3. Corpus frequency: how many real workflows connect into a conditional leaf with no stored
   selector? Drives priority.
4. Relationship to the disconnected-optional `RuntimeValue` plan — share the linked-model
   validation fix, or fix independently?
