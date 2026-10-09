# #23521 — `__current_case__ == -1` theory

Written 2026-09-21. Supersedes the collection-reduction theory as the explanation for
[#23521](https://github.com/galaxyproject/galaxy/issues/23521); see
[[subworkflow_mapping_branch_review]] for what was eliminated first.

## The contradiction this resolves

`Expected [] to be hashable` needs a **non-multiple `data` param holding a list**. The earlier
theory said a collection was reduced into such a param by
`collect_input_dataset_collections`. That requires the step *not* to have mapped over the
collection — but `_find_collections_to_match` adds a non-multiple data param's collection
**unconditionally** (`modules.py:735-736`, identical on 26.0/26.1/dev), and both it and the
execute-time callback call the same `progress.replacement_for_input`. So no collection can be
invisible at match time and visible at execute time. The model was contradictory.

It is resolved by a param that is invisible to *both* workflow-side walks and still wrapped at
job-creation time.

## Mechanism (reproduced)

`visit_input_values` (`lib/galaxy/tools/parameters/__init__.py:257-276`):

```python
case_error = None if get_current_case(input, values) >= 0 else "The selected case is unavailable/invalid."
callback_helper(input.test_param, values, ..., error=case_error)
values["__current_case__"] = get_current_case(input, values)   # stores -1
if values["__current_case__"] >= 0:                            # guarded here ONLY
    visit_input_values(input.cases[values["__current_case__"]].inputs, ...)
```

`get_current_case` returns **-1** on `KeyError`/`ValueError` — i.e. whenever the test param is
missing from state or holds a value matching no `<when>`. Two things then happen:

1. **`-1` is written into the state** and the subtree is skipped. Nothing raises. `case_error` is
   handed to the callback as `error=`, and `modules.py`'s execute callback ignores it.
2. **Every other reader indexes with it.** `wrapped.py:114`, `evaluation.py:471`,
   `parameters/__init__.py:414`, `wrapped_json.py:102` and `workflow/extract.py:525` all do
   `current = values["__current_case__"]` then `input.cases[current]`. `cases[-1]` silently
   selects the **last** `<when>`.

So values shaped for one case get wrapped with another case's parameter objects. A
`multiple="true"` list — `[]` when nothing was connected — lands on a non-multiple `data` param
and `ElementIdentifierMapper.identifier` raises.

Reproduced at `scratchpad/repro_23521_current_case.py` (no DB needed): test param set to an
out-of-enum value → `__current_case__` stored as `-1`, callback sees only the test param with
`error="The selected case is unavailable/invalid."`, children never visited.

## Why this fits the evidence better

- **Both prior tracebacks are `wrapped.py`, not `evaluation.py`, and both recurse through nested
  conditionals** — [#19538](https://github.com/galaxyproject/galaxy/issues/19538) shows
  `wrap_values -> cases[current] -> wrap_values -> cases[current] -> identifier`, and
  [#22401](https://github.com/galaxyproject/galaxy/issues/22401) the same one level down, from
  `actions/__init__.py:553 params=wrapped_params.params`. That is **job-creation time**, which
  matches "workflow fails" rather than "job fails".
- 0 / 1 / 2 elements across #23521 / #19538 / #22401 are just how many datasets the *other*
  case's `multiple="true"` param happened to hold. No collection need be involved.
- It explains #22401's "Unclear how this happened, maybe invalid API request?" — an out-of-enum
  test-param value is exactly that.
- The crash needs the **same param name in two `<when>`s with different arity**. dada2 uses that
  pattern twice: `dada2_dada.xml` `batch_cond|derep` (`data` vs `data multiple="true"`) and
  `macros.xml` `paired_cond|reads` (`data_collection` vs `data multiple="@MULTIPLE@"`, expanded
  `multiple="True"` in `plotComplexity`/`plotQualityProfile`/`primercheck` and `"False"` in
  `filterAndTrim`). Without a name collision you get a `KeyError`, not this `TypeError`.
- John's own comment on #23521 flagged step 10 mapping from `"Pooling"` when step 0's
  restrictions are `["Independent", "Pooled", "Pseudo-Pooling"]`, and called it "probably
  tangential". Under this theory an unresolvable value reaching a conditional test param is the
  **trigger**, not a side note.

## What implementation testing established (2026-09-21)

Branch `issue_23521_conditional_case_resolution` off `release_26.0` (`fa8bc99df19`, pushed to
`jmchilton`, **no PR**). Building the repro changed the conclusions:

- **The `-1` mechanism is confirmed** in isolation — unit tests in
  `test/unit/app/tools/test_grouping.py` pin that `cases[-1]` was reachable and now raises.
- **The runtime path is NOT demonstrated reachable.** `populate_module_and_state`
  (`modules.py:2888-2910`) runs `check_and_update_state()` at invocation-request time and refuses
  the invocation with `"Workflow step has upgrade messages"`. It catches every form tried:
  a conditional test param connected to a workflow `text` input, connected to a
  `param_value_from_file` output, and the same **inside a subworkflow** — `SubWorkflowModule.
  check_and_update_state` recurses over `get_modules()` (`modules.py:793-796`). All returned 400
  before scheduling. So the theory below is a real defect surface but is **not proven** to be
  what bernt-matthias hit.
- **Separate bug found.** `WorkflowModuleInjector.inject()` takes
  `allow_tool_state_corrections=False` as a *parameter* (`modules.py:2827`) which shadows
  `self.allow_tool_state_corrections` set in `__init__`, and `inject_all` never passes it. So the
  subworkflow recursion at `modules.py:2860` always gets `False`: a request carrying
  `allow_tool_state_corrections: true` has it **silently dropped for subworkflow steps**.
  Verified by request payload (flag present) still producing the 400. Not fixed — the strict
  behaviour is arguably right and changing it would newly expose the `-1` runtime path.
- **Also noted, not fixed.** Three `except Exception:` blocks in the `populate_state` variants
  (`parameters/__init__.py:521`, `:644`, `:750`) replace *any* exception raised while recursing
  into the case with the generic "selected case is unavailable/invalid", discarding the cause.

## Consequences

- The guard on `issue_23521_empty_collection_single_data_param` does **not** fix #23521.
  `collect_input_dataset_collections` never sees a collection on this path. Its commit message
  ("Fixes #23521, #19538 and the post-validation half of #22401") needs rewording either way.
  The guard is still worth landing for the genuine reduction case.
- `subworkflow_mapping` is unrelated to #23521. No collection axis is involved.

## Fix as implemented

Three commits on `issue_23521_conditional_case_resolution` (`fa8bc99df19`, `50ba9020634`,
`b368b97aa3e`), off `origin/release_26.0`, pushed to `jmchilton`. No PR.

1. **One accessor, six call sites, split by consequence.**
   `Conditional.get_current_case_inputs(values, strict=True)` in `grouping.py` validates the
   index. Six raw indexings of a value that can legitimately be `-1` was the actual defect
   surface, but they do not all deserve the same answer:
   - **Execution** — `wrapped.py`, `evaluation.py`, `wrapped_json.py` — keeps the raise
     (`RequestParameterInvalidException`). A job must not run against a case its state was not
     shaped for.
   - **Form building and state scrubbing** — `params_to_incoming` (reached from
     `ToolModule.get_config_form`, the workflow run form in `managers/workflows.py:1067` and the
     rerun form in `tools/__init__.py:3049`) and `workflow/extract.py` — passes `strict=False`
     and gets `{}` plus a logged warning. These operate on *stored* state whose tool may have
     changed since, which is exactly where `-1` is most plausible in the wild; hard-failing
     there would lock the editor form needed to correct the very problem being reported.
2. **One message builder.** `Conditional.no_case_error(value)` produces
   `"No case matching '<param>' value <value!r>. Valid values are [...]."` Used by the accessor,
   by `visit_input_values`'s `case_error` (the message users actually see at invocation request
   time, and where a typo like `"Pooling"` shows up), and by all four `populate_state`-family
   sites, replacing `"The selected case is unavailable/invalid."` everywhere.
3. **Four `except Exception:` blocks narrowed to `except ValueError:`** — `populate_state`,
   `_populate_state_legacy`, `populate_state_async`, `fill_dynamic_defaults`. Each wrapped both
   `get_current_case()` *and* the recursive walk over the case's inputs, so a genuine bug inside
   the recursion was reported as a bad case and its cause discarded. Now only the
   `get_current_case()` call is guarded — `ValueError` is the only thing it raises for an
   unmatched value — and `fill_dynamic_defaults` chains the cause (`from exc`).
4. **Not done: persisting the sentinel.** `visit_input_values` still writes `-1` into state.
   Deliberate — it is used for tool-form building too, and the readers now refuse or ignore it,
   so the storage is inert.
5. **Not done: making `case_error` fatal in `modules.py`.** Unnecessary — with the execution
   readers raising, `tools/execute.py` collects the error and `modules.py` already wraps it as
   `"Failed to create N job(s) for workflow step <n>: ..."`, which names the step.

Adjacent: [#23424](https://github.com/galaxyproject/galaxy/issues/23424) (branch
`issue_23424_when_expression_validation`) validates `when` expression references at import; the
same class of "value that matches no case" would ideally be caught there too.

## The regression the first commit introduced (2026-09-21, found by CI)

Worth recording because it is a trap in this function. `visit_input_values` called
`get_current_case()` **twice** on the same conditional, and both calls are load-bearing:

```python
current_case = get_current_case(input, values)   # pre-callback: builds the error message
callback_helper(input.test_param, values, ..., error=case_error)   # MAY REPLACE values[test_param]
values["__current_case__"] = get_current_case(input, values)       # post-callback: picks the subtree
```

`callback_helper` writes `input_values[input.name] = new_value` when the callback returns a
replacement — e.g. `check_and_update_param_values` substituting a tool default for a missing
value. So the message must describe what was *submitted* while the traversal must follow what
the state *became*. `fa8bc99df19` collapsed the two calls as "cleanup" and froze the case at the
pre-callback value. `__RELABEL_FROM_FILE__` steps with no `how_select` in state then reported a
spurious `"No value found for 'Ensure strict mapping'"` and 400'd
(`test_relabel_from_file_rejects_non_utf8_labels`, `..._with_paused_labels_does_not_crash`).
Restored in `50ba9020634` with a comment saying why.

## Tests

- **New framework tool** `test/functional/tools/conditional_data_arity.xml` — mirrors dada2's
  `batch_cond`: same param name in both `<when>`s, `multiple="true"` first and the
  single-dataset case **last**, so `cases[-1]` is the dangerous one. Two tool tests, both green.
  (`identifier_in_conditional.xml` has the same arity split but a boolean test param, which
  cannot carry an out-of-enum value.)
- **Unit: dropped at John's request** (`c578e7c3a24`). `test_grouping.py` had gained 6 tests over
  `get_current_case_inputs` built against a hand-assembled `Conditional`; the framework tool and
  the API test cover the same behaviour through the real machinery. `test_grouping.py` is back to
  its `release_26.0` content.
- **API** `test_workflows.py::TestWorkflowsApi::test_run_workflow_unresolvable_conditional_case` —
  a minimal Format2 workflow, `param_value_from_file` feeding a conditional test param inside a
  subworkflow, asserting the 400 names `batch_cond|batch_select`, says "No case matching", lists
  `'no', 'yes'`, and does **not** say "hashable". Red before the message change, green after.
- **Golden strings updated, not weakened:** `test_refactor_tool_state_upgrade` and
  `test_refactor_subworkflow_tool_state_upgrade` pinned the old
  `"The selected case is unavailable/invalid. Using default: 'b'."`; they now pin
  `"No case matching 'bool_to_select' value False. Valid values are ['a', 'b']. Using default:
  'b'."` The assertion is the same shape, the message is strictly more informative.
- **Dropped:** a `conditional_case_unresolvable.gxwf.yml` pair. The framework-workflow runner
  only supports `expect_failure: true`, which cannot distinguish a request-time rejection from a
  runtime crash, and cannot pass `allow_tool_state_corrections`. It would have looked like
  coverage without being any.
- Green locally: the API test and the restored `test_grouping.py` after `c578e7c3a24`; before it, 29 API tests (`test_workflows.py` + `test_tools.py`,
  conditional/nested-state/expression selection), 43 framework tool tests matching `conditional`,
  443 unit in `test/unit/app/tools` + `test/unit/workflows` + doctests. `mypy` clean on the three
  changed modules; `ruff`/`black` clean; pre-commit passed on all three commits.

## What CI caught on `fa8bc99df19`

`release_26.0` itself is red on `test_export_invocation_bco`
(`requests.exceptions.JSONDecodeError`) — pre-existing, unrelated, verified on upstream run
`35619619623` for the identical base commit. Ours added:

| Job | Cause | Resolution |
| --- | --- | --- |
| Python linting, Test Galaxy packages | one mypy error: `ConditionalWhen.inputs` is `Any \| None` | guard with the `is None` / `raise` idiom `ConditionalWhen.to_dict` already uses |
| `test_refactor_{,subworkflow_}tool_state_upgrade` | pinned the old message text | expectations updated |
| `test_relabel_from_file_*` (x2) | the double-`get_current_case` regression above | restored |

## Still open

How the reported workflow got past `check_and_update_state` at all - that is now the
central question, and it is the same question as which step and parameter actually failed in
usegalaxy.eu invocation `679b8f790f03d7b8`. The
mechanism above is verified; its application to this specific workflow is not. Needed:
`GET /api/invocations/679b8f790f03d7b8?step_details=true` plus the failing job id.

## Runtime route found (2026-10-02, polish)

The `-1` path *is* reachable at runtime, with no subworkflow:

- Invoke with `allow_tool_state_corrections: true`, which planemo always sends (`planemo/galaxy/activity.py:327`), a workflow whose **top-level** step has its conditional test param connected to an upstream text output (`param_value_from_file`).
- The request-time 400 is skipped. At scheduling, the upstream value (`Pooling`) replaces the test param, `__current_case__` is stored as `-1`, and the step is wrapped with the last case.
- On `release_26.0` the step fails with `'RuntimeValue' object has no attribute 'find_conversion_destination'`: the last case's `reads` was never connected. That's not the `hashable` crash, but it's the same wrong-case wrap.
- On the branch it fails with `No case matching 'batch_select' value 'Pooling'. Valid values are ['no', 'yes'].`, and no job is created. Pinned by `test_run_workflow_corrected_state_unresolvable_conditional_case` (`929df4068f4`).

The earlier attempts above were inside subworkflows, where the `inject()` shadowing bug drops the flag, so they never got past the 400. Whether the reporter used planemo (or the flag) is still unconfirmed. See `polish_debrief.md`.
