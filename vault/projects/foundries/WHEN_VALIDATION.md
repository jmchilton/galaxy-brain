# `when` Expression Validation

Follow-up to mvdbeek's review question on #23409: *"What happens when you upload a
workflow like that, is the error message readable?"*

Revised after an independent audit against the branches. Five claims in the first
draft did not survive; the corrections are inline and marked **Audit:**.

## Decision summary

| Question | Answer |
| --- | --- |
| Branch point | **`when_expression_analysis`** (PR 2), server-side only. PR 3 rebases on top. |
| Where validation runs | Workflow **import**, in `WorkflowContentsManager`, raising like its neighbours. |
| What it flags | On **tool steps only**: a static `inputs` path whose root segment contains `\|`. |
| Dynamic accesses | Judged **per path**, not per expression. A resolved path stays actionable. |
| Editor lint | **Already done** in PR 3 (`getDanglingGates`). Do not rebuild it. |
| Blocking or warning | **Blocking** at import. |
| API testable | **Yes**, but the import half needs a direct POST, not `_run_workflow`. |

## Why PR 2 and not PR 3

The validator needs one question answered: *which `inputs` paths does this
expression read, and did anything fail to resolve statically?* That is exactly
`analyzeInputReferences` returning `ReferenceAnalysis { staticPaths,
hasDynamicInputsAccess }`, complete as of PR 2.

Diffing the module's exported surface, PR 3 adds only presence-gate semantics:

```
NullBehavior, classifyWhenInputIsNull, expressionGuardsInputPresence,
inputsAccessPath, presenceGateExpression, BOOLEAN_GATE_INPUT_NAME,
BOOLEAN_GATE_EXPRESSION
```

Those *generate and interpret* gates. None is needed to decide whether a reference
resolves. The reference check also subsumes the silent `!== null` case below with
no null-semantics reasoning: if `inputs["cond|param"]` does not name a real input,
the comparison operator wrapped around it is irrelevant.

**Audit: "nothing needs to move" was wrong.** The first draft also proposed adding
an editor lint on the new branch. PR 3 already has it — `linting.ts:69`
`getDanglingGates` runs `analyzeInputReferences`, compares static paths against
real connection paths, and reports the mismatch; `["cond|input1"]` does not match
`["cond","input1"]`, so the editor flags it today. PR 2 has none of that wiring.
Building it again on a branch off PR 2 collides with PR 3 on rebase.

So the new PR is **server-side only** — Python analyzer, shared spec, import check,
API tests — and PR 3 rebases onto it unchanged.

## What actually happens today (measured, not inferred)

**Upload: nothing.** `lib/galaxy/managers/workflows.py:2092` is the entire handling:

```python
if "when" in step_dict:
    step.when_expression = step_dict["when"]
```

No parse, no reference check. The workflow imports clean.

**Run time: three behaviours, one of which errors.** Evaluated through the real
node engine (`galaxy.tools.expressions.do_eval`) against a state where the value
genuinely exists at `inputs.cond.param`:

| expression | result | user-visible |
| --- | --- | --- |
| `$(inputs["cond\|param"])` | raises | `expression_evaluation_failed` |
| `$(inputs["cond\|param"] !== null)` | `True` | **nothing** — step always runs |
| `$(inputs["cond\|param"] != null)` | `False` | **nothing** — step always skipped |
| `$(inputs["cond\|param"] === null)` | `False` | **nothing** — step always skipped |
| `$(inputs.cond.param !== null)` *(control)* | `True` | correct |

`undefined !== null` is `true` in JS, so the presence-gate idiom this whole series
exists to support degrades to "always run" with no diagnostic anywhere. That is the
case worth blocking; it is not reachable by improving any message.

**The one message that does exist is not readable.**
`InvocationMessage.vue:180` renders `expression_evaluation_failed` as *"…contains
an expression that could not be evaluated"* with no reference named.
`GenericInvocationFailureExpressionEvaluationFailed` does have a `details` field,
`modules.py` never populates it (deliberately — the exception text embeds the
interpolated `var inputs = {...}` and could carry secrets), and that UI branch
would not render it even if populated.

## Options for where validation lives

### IMPORT_TIME_RAISE — recommended

Validate in `WorkflowContentsManager.__module_from_dict` (lines 2012–2096), beside
the existing step-level checks. The duplicate- and empty-workflow-output checks at
2061 and 2065 raise `ObjectAttributeInvalidException` about thirty lines above the
`when` assignment, and `__load_subworkflow_from_step_dict` raises
`RequestParameterInvalidException` just below. A raise here needs no new concept
and lands the error at the moment mvdbeek asked about.

`module.save_to_step(step)` runs early in the function, so `step.type` is available
by the time `when` is assigned — which the tool-step scoping below depends on.

**Audit: the first draft cited "lines 1956–2065 of the same function."** The
UUID and duplicate-label raises at 1956–1984 are in `__walk_step_dicts`
(1930–1990), a different function. The exception types and the workflow-output
precedent are right; the range was not.

`__walk_step_dicts` is worth considering as the home instead: it is a pure step-dict
walk that runs before any `WorkflowStep` is constructed, so a raise there cannot
leave half-built ORM state behind. Against it: `step.type` is not resolved there, so
tool-step scoping would have to read `step_dict["type"]` directly.

Costs: a stored workflow that already uses the removed alias becomes
un-re-importable. That is arguably correct — after #23409 it *is* broken — but it is
a real behaviour change, and PR 3's lint already warns in the editor before save.

### RUNTIME_DETAILS — rejected as primary, worth doing anyway

Populate `details` on `InvocationFailureExpressionEvaluationFailed` and render it.
Rejected as the primary fix because it cannot reach the silent comparison cases at
all — they never raise. Still worth doing as a small independent improvement, and it
needs a safely constructed detail string rather than the raw exception text.

### UPGRADE_MESSAGES — rejected

Initially attractive, and wrong on inspection. `step.upgrade_messages` is transient
state produced by `check_and_update_state()` for tool-state migrations, and
`populate_module_and_state` *raises* on it at invocation unless
`allow_tool_state_corrections`. It is neither an import-time channel nor a soft
warning channel. Repurposing it would overload a mechanism that means something else.

### CLIENT_ONLY_LINT — rejected as the fix, already shipped as a complement

PR 3's `getDanglingGates` is exactly this and it is already written. But the question
is about upload, and agents generating workflows hit the API directly and never touch
the editor. Client lint is a complement, not the fix.

## Options for what gets flagged

### PIPE_SEGMENT_ON_TOOL_STEPS — recommended for the first pass

Flag a static path whose **root segment contains `|`**, on steps whose type is
`tool`. The flat pipe-joined name is precisely what #23409 removed from
`ToolModule`, and the spec already pins the analyzer behaviour this depends on:

```yaml
- doc: A literal pipe belongs to one property and does not name a nested connection
  expression: '$(inputs["cond|input1"] !== null)'
  input: cond|input1
  expect:
    static_paths: [["cond|input1"]]
    dynamic: false
    references_input: false
```

**Audit: "no false positives" was wrong without the tool-step scoping.**
`SubWorkflowModule.get_all_inputs` (`modules.py:785`) uses `name = step.label`
verbatim, and the subworkflow `when` path writes `step_input.name` straight into
`extra_step_state` (~line 921) with no pipe filter — #23409's skip is in `ToolModule`
only. A subworkflow input labeled `sample|reads` makes `inputs["sample|reads"]` a
real, working reference today. Scoping to tool steps removes the false positive and
matches what #23409 actually changed.

Residual caveat: inside `ToolModule`, the pipe skip only fires when the step input
is in `all_inputs_by_name`. A tool step input the tool does not expose still lands
in the context under its flat name via the `else` branch. That is a degenerate case
— a connection naming something the tool has no parameter for — but it means the
rule is "no false positives on well-formed tool steps," not unconditionally.

### PER_PATH_CERTAINTY — recommended, and it is a change

Judge each entry in `staticPaths` on its own. Do **not** skip the expression because
`hasDynamicInputsAccess` is set.

**Audit: the first draft said "skip entirely when `hasDynamicInputsAccess` — never
guess."** That over-skips. `analyzeInputReferences` (PR 2, line 203) sets the flag
globally but still pushes every fully-resolved path into `staticPaths`. For
`$(inputs["cond|input1"] !== null && inputs[k] !== null)` the pipe path is
statically certain and would be discarded anyway.

The flag is still load-bearing in one direction: when `tokenize` fails or the
expression is a template literal, `staticPaths` comes back empty, so there is
nothing to flag and the conservative outcome falls out for free.

Note this diverges from `getDanglingGates:80`, which returns early on the same flag.
See the open question below on whether to align PR 3.

### FULL_REFERENCE_RESOLUTION — client-side already, server-side follow-up

Flag any static path that matches no actual input. **This is what
`getDanglingGates` already does** — it resolves paths against the step's real
connection names. The client can do it because it has the loaded step in hand.

The importer cannot, cheaply: root segments may be tool conditional names, so
resolving them needs tool state, and the tool may not be loadable at import. It
would have to degrade the way `getDanglingGates` already degrades on a step whose
tool failed to load (`linting.ts:75`, skipped when `step.errors?.length`). Worth
doing, worth doing separately.

**Audit: the first draft framed this as "not now" without noticing the client
already ships it.** The asymmetry is availability of connection data, not appetite.

## Cross-language consistency

The declarative spec is language-neutral — `expression`, optional `input`, and an
`expect` map — and the TS suite consumes it directly. The Python side should consume
the *same file* rather than a copy.

There is an exact precedent: `lib/galaxy/navigation/navigation.yml` is a symlink
(git mode `120000`) to `../../../client/src/utils/navigation/navigation.yml`, read
via `resource_string` in `lib/galaxy/navigation/data.py`, and reached from
`packages/navigation/src/galaxy/navigation`, itself a symlink to `lib/galaxy/navigation`.
Building an sdist dereferences the symlink and includes the file as package data, so
the arrangement survives packaging.

**The Python suite must assert per key present, not per case.** PR 2's spec has 16
cases; PR 3 grows it to 52 by adding `null_behavior` and `guards_presence`
expectations, and those 36 new cases carry no `static_paths`. A Python runner that
asserts only the keys it implements — `static_paths`, `dynamic`, `references_input` —
covers exactly the analyzer cases and stays correct as PR 3 extends the file.

## Plan

1. **Port the tokenizer to Python.** New `lib/galaxy/workflow/when_expression.py`
   exposing the `analyze_input_references` equivalent of `ReferenceAnalysis`. Port
   from `whenExpression.ts` as of `when_expression_analysis`.
2. **Share the spec.** Symlink `when_expression_spec.yml` into the Python package
   the way `navigation.yml` is shared. Add a Python unit test that walks the file and
   asserts each `expect` key it implements, skipping keys it does not.
3. **Red first — with the right test.** The red test is the **API import test**, not
   a spec case. The pipe case already exists in PR 2's spec and goes green the moment
   step 1 lands, independent of any validator.
4. **Add the import check.** In `__module_from_dict`, beside the existing step
   validations, raise `RequestParameterInvalidException` naming the step, the
   offending reference, and the supported spelling. Gate on `step.type == "tool"`.
   Judge each static path on its own; do not skip on `hasDynamicInputsAccess`.
5. **API tests.** Direct POST for the import half; `_run_workflow` for runtime
   controls. See below.
6. **Release note.** #23409's note already says to migrate; extend it to say the old
   spelling is now rejected at import rather than silently misbehaving.
7. **Rebase PR 3** onto the new branch. No content change unless we decide to align
   `getDanglingGates` with PER_PATH_CERTAINTY.

**Audit: the first draft's step 6 (editor lint) is deleted** — PR 3 has it.

## Test plan

**Audit: the cited tests are runtime templates only.** `_run_workflow` →
`upload_yaml_workflow` → `WorkflowPopulator.import_workflow`, which asserts
`upload_response.status_code == 200` unconditionally (`populators.py:3360`).
`assert_ok=False` and `expected_response` apply to invocation, not upload. A test
built on either cited template raises inside the helper as soon as the expected 400
arrives, and never sees the response.

Two shapes, two precedents:

*Import rejection* — POST to `workflows` directly and assert the status, the way
`test_workflows.py:2175` and the other `_assert_status_code_is(response, 400)` sites
do.

- **Rejected.** A step with `when: $(inputs["cond|input1"] !== null)`; assert 400 and
  that the message names the step and the supported spelling. The direct answer to
  the review question.
- **Mixed static and dynamic still rejected.**
  `$(inputs["cond|input1"] !== null && inputs[k] !== null)` — the regression test for
  PER_PATH_CERTAINTY.
- **Fully dynamic still imports.** `$(inputs[someKey])` must not be rejected, or the
  conservative path rots into over-blocking.
- **Subworkflow pipe label still imports.** A subworkflow input labeled
  `sample|reads` with `when: $(inputs["sample|reads"] !== null)` — the regression
  test for the tool-step scoping.
- **Nested spellings still import.** `inputs.cond.input1` and
  `inputs["cond"]["input1"]`.

*Runtime* — `_run_workflow` with `assert_ok=False`, following
`test_workflows.py:3764` (`expression_evaluation_failed`) and `:3799`
(`when_not_boolean`, `details == "Type is: str"`). #23409's framework fixture already
covers the nested-spelling runtime half.

*Cross-language* — the shared spec suite is the real regression net; every analyzer
case runs in both languages.

A test asserting today's *runtime* behaviour for the silent cases would codify a bug
rather than a contract. Prefer blocking at import and asserting that.

## Unresolved questions

- Block at import, or warn and let it through? Blocking makes affected stored
  workflows un-re-importable.
- Align `getDanglingGates` with PER_PATH_CERTAINTY, or leave PR 3's whole-expression
  skip? Divergence means the editor stays quiet on a case the API rejects.
- `__module_from_dict` or `__walk_step_dicts`? The latter avoids half-built ORM state
  but has no resolved `step.type`.
- Same treatment for `value_from` expressions, or `when` only?
- Does the editor need to *repair* the old spelling, or only refuse to save it?
- Fourth PR based on PR 2, or fold into PR 2?
- Populate `details` on `expression_evaluation_failed` in the same PR, or split?
