# Validate `when` expression input references at workflow import

Follow-up to the review question on #23409: *"What happens when you upload a workflow
like that — is the error message readable?"*

The short answer is that nothing happens on upload, and at run time the failure is
either unreadable or completely silent. Now that #23409 has removed the pipe-prefixed
aliases, the silent case is reachable in `dev`, so it is worth closing.

## What happens today

**Upload: nothing.** `lib/galaxy/managers/workflows.py:2091` is the entire handling of
the field:

```python
if "when" in step_dict:
    step.when_expression = step_dict["when"]
```

No parse, no reference check. A workflow whose `when` reads a name that cannot resolve
imports clean.

**Run time: three behaviours, only one of which says anything.** Evaluated through the
real node engine (`galaxy.tools.expressions.do_eval`) against a state where the value
genuinely exists at `inputs.cond.param`:

| expression | result | user-visible |
| --- | --- | --- |
| `$(inputs["cond\|param"])` | raises | `expression_evaluation_failed` |
| `$(inputs["cond\|param"] !== null)` | `True` | **nothing** — step always runs |
| `$(inputs["cond\|param"] != null)` | `False` | **nothing** — step always skipped |
| `$(inputs["cond\|param"] === null)` | `False` | **nothing** — step always skipped |
| `$(inputs.cond.param !== null)` *(control)* | `True` | correct |

`undefined !== null` is `true` in JavaScript, so the presence-gate idiom degrades to
"always run" with no diagnostic anywhere. That case cannot be fixed by improving a
message, because no message is produced.

**The one message that does exist is not readable.**
`InvocationMessage.vue:180` renders `expression_evaluation_failed` as *"…contains an
expression that could not be evaluated"* and names no reference.
`GenericInvocationFailureExpressionEvaluationFailed` does carry a `details` field, but
`modules.py` never populates it — deliberately, since the exception text embeds the
interpolated `var inputs = {...}` and could carry secrets — and that UI branch would not
render it even if populated.

## What this builds on

The reference analyzer already exists on the pushed branch
[`jmchilton/when_expression_analysis`](https://github.com/jmchilton/galaxy/tree/when_expression_analysis),
which is a single commit on top of `dev`. It adds
`client/src/components/Workflow/Editor/modules/whenExpression.ts` with:

```ts
analyzeInputReferences(expression: string): ReferenceAnalysis
// ReferenceAnalysis { staticPaths: string[][]; hasDynamicInputsAccess: boolean }
```

plus a declarative, language-neutral test spec at
`client/src/components/Workflow/Editor/modules/when_expression_spec.yml`.

That is the whole dependency. A follow-on branch, `jmchilton/optional_input_gating`,
adds presence-gate generation and interpretation (`NullBehavior`,
`classifyWhenInputIsNull`, `expressionGuardsInputPresence`, `inputsAccessPath`,
`presenceGateExpression`, `BOOLEAN_GATE_INPUT_NAME`, `BOOLEAN_GATE_EXPRESSION`). None of
those is needed to decide whether a reference resolves, so this work should branch from
`when_expression_analysis`, not from the gating branch.

Neither branch has an open PR at the moment; both were closed when the stack they were
part of came apart, and neither was merged. They will be resubmitted.

`optional_input_gating` also already carries the **editor-side** version of this check —
`linting.ts:69` `getDanglingGates` runs `analyzeInputReferences`, compares static paths
against real connection paths, and reports the mismatch. `["cond|input1"]` does not match
`["cond", "input1"]`, so the editor flags it. That is a complement, not the fix: agents
generating workflows post to the API and never open the editor. It should not be rebuilt
here.

## Proposal

Validate at **import**, in `WorkflowContentsManager.__module_from_dict` (starts at line
2012), beside the step-level checks that are already there. The duplicate- and
empty-workflow-output checks raise `ObjectAttributeInvalidException` at lines 2061 and
2065, about twenty-five lines above the `when` assignment, and
`__load_subworkflow_from_step_dict` raises `RequestParameterInvalidException` just below.
A raise here needs no new concept and lands the error at the moment the reviewer asked
about. `module.save_to_step(step)` runs early in that function, so `step.type` is
available by the time `when` is assigned.

**What gets flagged, first pass:** a static path whose **root segment contains a pipe**,
on steps whose `type` is `tool`. That is exactly the spelling #23409 removed, and
the analyzer's behaviour on it is already pinned by the shared spec:

```yaml
- doc: A literal pipe belongs to one property and does not name a nested connection
  expression: '$(inputs["cond|input1"] !== null)'
  input: cond|input1
  expect:
    static_paths: [["cond|input1"]]
    dynamic: false
    references_input: false
```

**The tool-step scoping is load-bearing, not cosmetic.**
`SubWorkflowModule.get_all_inputs` (`modules.py:785`) uses `name = step.label` verbatim,
and the subworkflow `when` path writes `step_input.name` straight into `extra_step_state`
with no pipe filter — #23409's change is in `ToolModule` only. A subworkflow input
labeled `sample|reads` makes `inputs["sample|reads"]` a real, working reference today.
Without the scoping this rule produces false positives on valid workflows.

One residual caveat inside `ToolModule`: the pipe skip only fires when the step input is
in `all_inputs_by_name`. An input the tool does not expose still lands in the context
under its flat name via the `else` branch. Degenerate — a connection naming a parameter
the tool does not have — but it means the rule is "no false positives on well-formed tool
steps", not unconditionally.

**Judge each path on its own.** Do not skip the expression because
`hasDynamicInputsAccess` is set. `analyzeInputReferences` sets that flag globally
(`whenExpression.ts:203-208`) while still pushing every fully-resolved path into
`staticPaths`. For `$(inputs["cond|input1"] !== null && inputs[k] !== null)` the pipe
path is statically certain and would be discarded by a whole-expression skip. The flag
is still useful in one direction: when tokenizing fails, or the expression is a template
literal, `staticPaths` comes back empty and the conservative outcome falls out for free.

Note this diverges from `getDanglingGates:80`, which returns early on that same flag. See
the open questions.

## Cross-language consistency

The spec file is language-neutral — `expression`, an optional `input`, and an `expect`
map — and the TypeScript suite consumes it directly. The Python side should consume the
**same file** rather than a copy.

There is an exact precedent: `lib/galaxy/navigation/navigation.yml` is a git symlink
(mode `120000`) to `client/src/utils/navigation/navigation.yml`, read via
`resource_string` in `lib/galaxy/navigation/data.py`, and reached from
`packages/navigation/src/galaxy/navigation`, itself a symlink. Building an sdist
dereferences the symlink and includes the file as package data, so the arrangement
survives packaging.

**The Python suite should assert per key present, not per case.** On
`when_expression_analysis` the spec has 27 cases; `optional_input_gating` grows it to 52
by adding `null_behavior` and `guards_presence` expectations. Sixteen cases carry
`static_paths` in both. A Python runner that asserts only the keys it implements —
`static_paths`, `dynamic`, `references_input` — covers exactly those sixteen and stays
correct as the file grows.

## Plan

1. **Port the tokenizer to Python.** New `lib/galaxy/workflow/when_expression.py`
   exposing an `analyze_input_references` equivalent of `ReferenceAnalysis`, ported from
   `whenExpression.ts` as of `when_expression_analysis`.
2. **Share the spec.** Symlink `when_expression_spec.yml` into the Python package the way
   `navigation.yml` is shared. Add a unit test that walks the file and asserts each
   `expect` key it implements, skipping keys it does not.
3. **Red first, with the right test.** The red test is the **API import test**, not a
   spec case — the pipe case already exists in the spec and goes green the moment step 1
   lands, independent of any validator.
4. **Add the import check.** In `__module_from_dict`, raise
   `RequestParameterInvalidException` naming the step, the offending reference, and the
   supported spelling. Gate on `step.type == "tool"`. Judge each static path on its own.
5. **API tests** (below).
6. **Release note.** The 26.2 note added by #23409 already tells users to migrate to
   `inputs.cond.param`; extend it to say the old spelling is now rejected at import
   rather than silently misbehaving.

## Test plan

`_run_workflow` and `upload_yaml_workflow` both route through
`WorkflowPopulator.import_workflow`, which asserts `status_code == 200` unconditionally
(`populators.py:3360`). `assert_ok=False` and `expected_response` apply to the
*invocation*, not the upload — a test built on those helpers raises inside the helper as
soon as the expected 400 arrives and never sees the response. So the import half needs a
different shape.

**Import rejection** — follow `test_workflows.py:2174`, which calls
`self.__test_upload(workflow=workflow, assert_ok=False)` and then
`self._assert_status_code_is(create_response, 400)`.

- **Rejected.** A tool step with `when: $(inputs["cond|input1"] !== null)`; assert 400,
  and that the message names the step and the supported spelling. This is the direct
  answer to the review question.
- **Mixed static and dynamic still rejected.**
  `$(inputs["cond|input1"] !== null && inputs[k] !== null)` — regression test for
  per-path judgement.
- **Reading through the removed root still rejected.**
  `$(inputs["cond|input1"].ext !== null)` — regression test that validation checks the
  root rather than requiring the entire path to contain one segment.
- **Fully dynamic still imports.** `$(inputs[someKey])` must not be rejected, or the
  conservative path rots into over-blocking.
- **Subworkflow pipe label still imports.** A subworkflow input labeled `sample|reads`
  with `when: $(inputs["sample|reads"] !== null)` — regression test for the tool-step
  scoping.
- **Nested spellings still import.** `inputs.cond.input1` and `inputs["cond"]["input1"]`.

**Runtime** — `_run_workflow` with `assert_ok=False`, following `test_workflows.py:3764`
(`expression_evaluation_failed`) and `:3799` (`when_not_boolean`, with
`details == "Type is: str"`). #23409's framework fixture already covers the
nested-spelling runtime half.

**Cross-language** — the shared spec suite is the real regression net; every analyzer
case runs in both languages.

A test asserting today's *runtime* behaviour for the silent cases would codify a bug
rather than a contract. Better to block at import and assert that.

## Considered and rejected

- **Populate `details` on `expression_evaluation_failed` and render it.** Cannot reach
  the silent comparison cases at all — they never raise. Worth doing as an independent
  improvement, with a safely constructed detail string rather than the raw exception
  text, but not as the fix here.
- **`step.upgrade_messages`.** Transient state produced by `check_and_update_state()` for
  tool-state migrations; `populate_module_and_state` *raises* on it at invocation unless
  `allow_tool_state_corrections`. Neither an import-time channel nor a soft-warning
  channel.
- **Client lint alone.** Already shipped on `optional_input_gating`, and it does not
  cover API clients.
- **Full reference resolution at import** — flagging any static path that matches no real
  input. This is what `getDanglingGates` already does client-side, where the loaded step
  is in hand. The importer cannot do it cheaply: root segments may be tool conditional
  names, so resolving them needs tool state, and the tool may not be loadable at import.
  It would have to degrade the way `getDanglingGates` already degrades on a step whose
  tool failed to load (`linting.ts:75`). Worth doing, worth doing separately.

## Open questions

- Block at import, or warn and let it through? Blocking makes an already-broken stored
  workflow un-re-importable.
- Align `getDanglingGates` with per-path judgement, or leave its whole-expression skip?
  Divergence means the editor stays quiet on a case the API rejects.
- `__module_from_dict`, or `__walk_step_dicts` (line 1930)? The latter runs before any
  `WorkflowStep` is constructed, so a raise cannot leave half-built ORM state behind, but
  `step.type` is not resolved there and the scoping would have to read
  `step_dict["type"]` directly.
- Same treatment for `value_from` expressions, or `when` only?
- Should the editor *repair* the old spelling, or only refuse to save it?
- Populate `details` on `expression_evaluation_failed` in the same PR, or split?
