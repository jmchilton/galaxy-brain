Title: Workflow connections into nested repeats crash import; connections into repeats inside sections or conditionals are silently dropped

_Posted by an AI assistant (Claude) on jmchilton's behalf — not personally authored._

**When a workflow is imported with `fill_defaults=true`** (as WES and Galaxy's YAML test workflows do) and a step connects an input to a repeat that isn't at the top level of the tool, Galaxy either fails the import with a 500 or imports the connection and then runs the job without it.

```yaml
steps:
  the_step:
    tool_id: nr_section_repeat     # <section name="adv"><repeat name="outer"><param name="x" type="data"/>
    in:
      adv|outer_0|x: i1
      adv|outer_1|x: i2
```

| Connection target (no `state` unless noted)                                                     | Import                                           | Job                                                    | Output                           |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------ | -------------------------------- |
| `queries_0\|input2`: top-level repeat (baseline, `test_inputs_to_steps`)                        | ✅                                                | ✅ input connected                                      | ✅                                |
| `outer_0\|inner_1\|x`: repeat nested in a repeat                                                | ❌ `POST /api/workflows` 500, `KeyError: 'inner'` | —                                                      | —                                |
| `adv\|outer_0\|x`: repeat inside a section                                                      | ✅ connections stored                             | ⚠️ runs `ok` with `adv.outer = []`, **no inputs**      | ❌ `end` instead of both datasets |
| `cond\|outer_0\|x`: repeat inside the active conditional case (`state` sets only `cond.sel: a`) | ✅                                                | ⚠️ runs `ok` with `cond.outer = []`, **no inputs**     | ❌ same                           |
| `outer_0\|inner_0\|x` with `state: {outer: [{}]}` (outer instance present, inner missing)       | ✅                                                | ⚠️ runs `ok` with `outer[0].inner = []`, **no inputs** | ❌ same                           |
| Any of the above with matching repeat instances spelled out in `state`                          | ✅                                                | ✅ inputs connected                                     | ✅                                |

The silent cases are the worst ones. The workflow imports and the stored step keeps `input_connections` for `adv|outer_0|x` and `adv|outer_1|x` next to `tool_state` `{"adv": {"outer": []}}`. The invocation schedules, the job goes green, and the connected datasets are never used. Galaxy even notices: runtime replacement computes the unmatched connection keys, but only logs `Failed to use input connections for inputs [{'adv|outer_0|x', 'adv|outer_1|x'}]` server-side (`modules.py:3196`). Nothing in the editor, the invocation or the job tells the user.

Reproduced on `dev` (537915642fa) with Format2 workflows imported through the API with `fill_defaults=true`, then invoked.

<details><summary>Why: <code>augment_tool_state_for_input_connections</code> only understands top-level repeats</summary>

On import, `ToolModule.recover_state(fill_defaults=True)` calls `augment_tool_state_for_input_connections` (`lib/galaxy/workflow/modules.py:2936`). It creates the repeat instances that each connection key needs, because the runtime replacement code only visits instances that already exist in the state:

```python
prefix, rest = expected_replacement_key.split("|", 1)
if "_" not in prefix:
    return                                   # "adv", "cond": sections/conditionals stop here
repeat_name, index = prefix.rsplit("_", 1)
...
repeat = self.tool.inputs[repeat_name]       # always the TOP-LEVEL inputs: "inner" -> KeyError
...
while index >= len(repeat_values):
    repeat_instance_state = {"__index__": len(repeat_values)}
    repeat_values.append(repeat_instance_state)

if repeat_instance_state:
    # TODO: untest branch - no test case for nested repeats yet...
    augment(rest, repeat_instance_state)     # recurses only if a NEW outer instance was created
```

- **Nested repeat.** The recursion looks `inner` up in `self.tool.inputs` instead of the outer repeat's inputs, so it raises `KeyError`.
- **Section or conditional first.** The leading segment (`adv`, `cond`) has no `_<digit>` suffix, so the function returns without creating anything.
- **Outer instance already in `state`.** No new instance is created, so the recursion never runs and the inner repeat stays empty.

</details>

<details><summary>Reproduce</summary>

Three scratch tools, each echoing every connected `x`:

```xml
<tool id="nr_nested_repeat" name="nr_nested_repeat" version="0.1.0" profile="24.0">
  <command><![CDATA[
#for $oi, $o in enumerate($outer)
#for $ii, $i in enumerate($o.inner)
echo "outer_$oi|inner_$ii: \$(cat '$i.x')" >> '$out';
#end for
#end for
echo end >> '$out'
  ]]></command>
  <inputs>
    <repeat name="outer" title="Outer">
      <repeat name="inner" title="Inner">
        <param name="x" type="data" format="txt" />
      </repeat>
    </repeat>
  </inputs>
  <outputs>
    <data name="out" format="txt" />
  </outputs>
</tool>
```

`nr_section_repeat` wraps `<repeat name="outer">` in `<section name="adv">`. `nr_cond_repeat` puts it in `<when value="a">` of `<conditional name="cond">`.

```yaml
class: GalaxyWorkflow
inputs:
  i1: data
  i2: data
steps:
  the_step:
    tool_id: nr_nested_repeat
    in:
      outer_0|inner_0|x: i1
      outer_0|inner_1|x: i2
```

Run with `workflow_populator.run_workflow(wf, history_id=..., test_data={"i1": "one", "i2": "two"})`:

```
nested              -> AssertionError: {"err_msg": "Uncaught exception in exposed API method:", "err_code": 0}
                       ... modules.py:2933 recover_state -> :2996 augment_tool_state_for_input_connections
                       -> :2977 augment -> KeyError: 'inner'
section             -> job ok, inputs=[], params adv={"outer": []}, output 'end\n'
cond (state sel: a) -> job ok, inputs=[], params cond={"__current_case__": 0, "outer": [], "sel": "a"}, output 'end\n'
nested, state outer: [{}] -> job ok, inputs=[], params outer=[{"__index__": 0, "inner": []}], output 'end\n'
nested, state outer: [{inner: [{}, {}]}] -> job ok, inputs=['outer_0|inner_0|x', 'outer_0|inner_1|x'],
                       output 'outer_0|inner_0: one\nouter_0|inner_1: two\nend\n'
section, state adv: {outer: [{}, {}]}     -> job ok, inputs=['adv|outer_0|x', 'adv|outer_1|x'],
                       output 'adv|outer_0: one\nadv|outer_1: two\nend\n'
```

</details>

## Context

Found while documenting tool parameter references in 🔀 #23877. Its docs currently describe nested-repeat augmentation as "untested", and should say "broken" until this is fixed. Related to 🎯 #21971, the larger schema-aware workflow tool state effort. Its `workflow_step_linked` validation would flag connections that point at nonexistent state, but it doesn't change runtime augmentation. This issue is the focused runtime repair.

## Proposed Approach

Rewrite `augment_tool_state_for_input_connections` to walk the tool's declared inputs top-down, the way `_populate_state_legacy` (`lib/galaxy/tools/parameters/__init__.py`) already builds nested state from flat `a_0|b_1|x` keys, instead of parsing each key bottom-up. Descend sections and the active conditional case, and create missing repeat instances at every level, whether or not the parent instance already existed. Then reuse the unmatched-key check that runtime already does, so connections that still match no data parameter are reported, not just logged.

<details><summary>Proposed Approach In Detail</summary>

- **Reuse the declared-tree walk, not string parsing.** `_populate_state_legacy` iterates `Tool.inputs`, and for each `Repeat` it creates instance `i` while any flat key starts with `<prefix><name>_<i>`. It recurses into `Section.inputs` and into `Conditional.cases[get_current_case(value)].inputs`. Augmentation needs the same prefix-driven walk, except that it keeps existing state instead of rebuilding it: no initial values, no `del group_state[:]`. Extract that repeat/section/conditional descent into a shared helper rather than writing another variant. Walking declared names top-down also avoids misreading an input literally named `reads_1` as a repeat index, the same `_<digit>` ambiguity as 🎯 #23886. Don't build this on `nested_key_to_path` (`lib/galaxy/tools/parameters/wrapped.py`). It is pure string splitting and has the same blind spot.
- **Sections.** Descend into `state[section]`, creating `{}` if it's missing.
- **Conditionals.** Use the case that the state's test-parameter value selects (`Conditional.get_current_case`). Never create instances in an inactive case.
- **Repeats.** Pad to `index + 1` with `{"__index__": i}`, then descend into instance `index` whether it already existed or was just created. Respect `max`.
- **Defaults.** Leave filling to the `check_and_update_param_values` call that already follows in `recover_state`.
- **Report leftovers.** After augmentation, any connection key that `visit_input_values` still can't reach is the same `expected_replacement_keys - found_replacement_keys` set that runtime only logs today. Surface it at import as a step upgrade/validation message, and at runtime as an invocation warning instead of `log.warning`. A hard import failure would break existing workflows that carry stale connections, such as those into an inactive case or left over from a tool version change, so that should be a separate decision.
- **Tests.** API tests that import and invoke Format2 workflows with no `state` for: a nested repeat with a nonzero inner index, a repeat in a section, a repeat in the active conditional case, an existing outer instance with missing inner instances, and sparse indices (`outer_2` only). Assert both the output content and the job's input associations, and round-trip the workflow through export. Remove the `TODO: untest branch` comment.

No new profile gate is needed: valid connections that crashed or were silently dropped start working.

</details>

## Alternative Approaches

The alternatives either push the problem onto workflow authors, fix only the crash, or move to a parameter tree that the step code doesn't use yet. Walking `Tool.inputs` the way `populate_state` already does fixes all three failure modes in the one place that already owns this job.

<details><summary>Alternatives In Detail</summary>

### Alternative: Require explicit repeat instances in `state`

<details><summary>Description</summary>

#### Details

Document that connections into nested or grouped repeats need matching instances in `state`, which already works, and reject imports that don't have them.

#### Why the proposed approach is preferred

Top-level repeats don't need this, so the rule would be arbitrary. The instances carry no information beyond what the connection keys already say. Format2 authors and converters (gxformat2, the editor) would all have to emit redundant bookkeeping, which is the kind of state #21971 aims to remove.

</details>

### Alternative: Fix only the `KeyError`

<details><summary>Description</summary>

#### Details

Pass the current repeat's inputs into the recursion so nested repeats stop crashing.

#### Why the proposed approach is preferred

It leaves the silent drops in place: sections, conditionals, and existing outer instances. Those are worse than the crash, because a workflow that runs green with missing inputs gives wrong results without anyone noticing.

</details>

### Alternative: Walk the `tool_util` parameter models instead of `Tool.inputs`

<details><summary>Description</summary>

#### Details

Build augmentation on the Pydantic parameter models (`Tool.parameters`), reusing `_initialize_section_state`, `_initialize_repeat_state` and `_select_which_when` from `lib/galaxy/tool_util/parameters/convert.py`, which `_fill_defaults` already uses to create container state. This is where 🎯 #21971's `workflow_step_linked` validation lives.

#### Why the proposed approach is preferred

`Tool.parameters` can be `None` for tools whose inputs don't parse into models, and `recover_state` and runtime replacement both work on `Tool.inputs`. The fix belongs on the same tree the rest of the step code uses. Once #21971 merges connections into `workflow_step_linked` state, the model walk can replace this one.

</details>

### Alternative: Create instances at invocation time instead of import

<details><summary>Description</summary>

#### Details

Have runtime replacement create missing repeat instances when it visits connections, as the method's docstring suggests might eventually be needed.

#### Why the proposed approach is preferred

Import is where defaults get filled in (`check_and_update_param_values`) and where the stored state should already match the connections. Fixing only at runtime would leave stored workflows, exports and the editor showing empty repeats with dangling connections. A runtime fallback could still be added later for workflows imported before the tool was installed.

</details>

</details>
