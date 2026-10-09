# galaxy #23887 - [26.1] Validate workflow parameter inputs and support scalar batches

- PR: https://github.com/galaxyproject/galaxy/pull/23887 (mvdbeek, draft)
- Base: `release_26.1`
- Head reviewed: `6227f6f3601ff187c0a961bf45f22858aa340125`
- Worktree: `~/projects/worktrees/galaxy/pr/23887`
- Fixes #22817 (not auto-linked because base is a release branch)
- CI at head: all green except 4 `Integration` shards, every failure is `test_rucio_objectstore` docker-pull setup (infra, unrelated). API, framework, unit, client all pass.
- Local: `test/unit/workflows/test_run_parameters.py` + `meta.py` doctests pass (10 passed).

## Verdict

Approve with suggestions. Small, well-scoped release fix. It turns two 500s/late failures into 400s
and fixes a real `TypeError` in batch expansion. My main reservation is about scope: the PR title says
"validate workflow parameter inputs", but the new check only rejects one shape (dicts). Wrong-typed
scalars and lists still go through `ToolParameter.validate()`, which runs only validators and does no
type checking, so they are still accepted and persisted.

## What it does

1. `run_request.build_workflow_run_configs`: if a `parameter_input` value is a `dict`, raise
   `RequestParameterInvalidException`. Before this, `{"parameter_value": 100}` (the shape that
   `input_step_parameters` returns) was persisted and handed to tools.
2. `run_request._normalize_step_parameters`: legacy `parameters` for a `parameter_input` step must
   contain `input`. Before this, the later `value["input"]` lookup raised `KeyError` and returned a 500,
   so this only improves the error. It also applies recursively inside subworkflows.
3. `meta.expand_workflow_inputs`: `"hid" in value` is now guarded by `isinstance(value, dict)`.
   Before this, int/float/bool batch values raised `TypeError`. String values containing `"hid"`
   (e.g. `"hidden"`) also hit `TypeError` through `"hidden"["hid"]`. The PR doesn't mention that
   second bug, but it is fixed too.
4. Schema descriptions for `inputs` / legacy `parameters`, plus the regenerated `schema.ts`.
5. Integration fixture change in `test_workflow_scheduling_options.py`. See finding 2.

## Findings (by severity)

### 1. (Medium, scope/reuse) The dict guard is shape-specific; type validation still isn't done

On release_26.1, `input_param.validate(value)` for integer/float/boolean/text only runs `self.validators`.
I checked this at the PR head: `IntegerToolParameter.validate("abc")`, `.validate([1, 2])`, and the
float/boolean/text equivalents are all accepted. After this PR, `{"int_param": "abc"}` or
`{"int_param": [1, 2]}` (non-multiple) are still persisted as `WorkflowRequestInputStepParameter`
values and fail later, which is the same failure mode as #22817 in another shape.

The coercion logic already exists in `IntegerToolParameter.from_json` / `FloatToolParameter.from_json`,
which raise `ParameterValueError` on bad input. The `except ParameterValueError` → 400 wrapper right below
the new check already handles that error type. Calling `input_param.from_json(value, trans)` before
`validate()` would reuse that path. It does not cover text or boolean, though: text `from_json` passes
anything through, and boolean `string_as_bool(dict)` silently returns `False`. So a dict/non-scalar guard
is still needed for those two types, and the guard would be better written as "not a JSON scalar (or a
list of scalars when `multiple`)" than as "is a dict".

For a release branch I'd accept the narrow guard as is, and ask for either (a) a title/description that
says "reject wrapped dict values" instead of "validate", or (b) a dev follow-up that does type-aware
validation using the parameter classes. On dev (#23802), multiple integers already do this:
`IntegerToolParameter.validate` with `multiple` parses and rejects `"1\ntwo"`, dicts, and nested lists
(I checked this on the followups branch). Single-valued integer and float on dev still don't.

### 2. (Low-Medium, back-compat) Some previously succeeding invocations now get a 400

The integration fixture change is the evidence here. `text_input: foo` in populator `test_data` uploads
`foo` as a dataset and sends `{"src": "hda", "id": ...}` to a **text** parameter. Before this PR the
invocation was accepted, scheduled, and the test passed. Now it returns 400. Changing the fixture to
`type: raw` is the right fix. It is not test-data weakening, because the old fixture was passing a
dataset reference to a text parameter.

Any external client that does the same thing will break on a point release. That includes clients that
re-submit an old invocation's `/request` after a malformed value was persisted. Other cases I checked:
- `galaxy.tool_util.cwl.util.galactic_job_json` in `tool_or_workflow="workflow"` mode uploads every scalar
  as a dataset. `galaxy_test.base.populators.stage_inputs` defaults to that mode.
- Planemo uses `"tool"` mode for non-CWL workflows, so `planemo test` jobs with scalar params are unaffected.
- Both client run forms (simple and expanded) send raw values for parameter steps, so the UI is unaffected.

I think this is acceptable: those invocations were feeding garbage to tools. It should still be called
out in the PR description / release notes as an intentional rejection of previously accepted requests.

### 3. (Low) Multiple-valued (list) parameters: no regression, small gap

- release_26.1 has no multiple integer/float (#23802 targeted `dev`). Text `multiple` produces lists,
  and lists aren't dicts, so they pass through as before.
- Batches of lists (`{"batch": true, "values": [[1, 2], [3]]}`) expand into one list per invocation.
  On dev, the #23802 `IntegerToolParameter.validate` handles each list correctly. Batching a scalar into a
  `multiple` param is also fine, because validate wraps the scalar.
- Gap: for non-multiple params a list value is still accepted (finding 1). No test covers batch-of-lists
  for a multiple param. That belongs on dev / the followups branch, not here.

### 4. (Nit) Duplicated step-name formatting

`f"{step.label or step.order_index + 1}: ..."` now appears 3 times in `run_request.py`. A
`_step_reference(step)` helper would be cleaner. The `+ 1` gives a 1-based index while `inputs_by=step_index`
requests are 0-based, so an unlabeled step `"0"` is reported as `1:`. The existing `ParameterValueError`
branch already does this, so the new code is consistent with its sibling. Pre-existing, but now more visible.

### 5. (Nit) Batch semantics carried over from data batches

- A linked-length mismatch for scalar batches still reports "Please select equal number of data files."
- Scalar batch values add nothing to `params_keys`, so with `new_history_name` every batched history gets
  the same name. Data batches append the hid to the name.

### 6. (Nit, tests)

- API tests are good. They're parametrized over all four scalar types, assert `type(actual) is type(value)`,
  assert no jobs are created on the 400, and cover both `parameters_normalized` paths.
- The unit test `test_expand_scalar_parameter_inputs` branches on its `legacy` parameter with if/else. It
  would read better as two small tests, or as a doctest in `meta.py`, which already runs under
  `--doctest-modules`. It's also mostly covered by `test_run_with_batched_parameter_input`. Optional.
- Imports are at module top. No obvious comments.

## Overlap with `workflow_multiple_parameter_followups`

- No source-file overlap. The PR touches `run_request.py`, `meta.py`, and `schema/workflows.py`. The
  followups branch touches `modules.py`, `basic.py`, `managers/workflows.py`, `api/workflows.py`, and
  `workflow_parameter_input_definitions.py`.
- Cherry-picking the PR onto the followups branch, or onto `origin/dev`, gives a textual conflict only in
  `lib/galaxy_test/api/test_workflows.py`: both sides append tests in the same region. It already conflicts
  with plain `dev` (#23802 tests), so the merge-forward will have to resolve it anyway. Trivial (keep both).
- Semantic interaction: none harmful. The followups branch's `build_module` / run-form 400 for invalid
  saved defaults (`ParameterValueError` → `RequestParameterInvalidException` in
  `managers/workflows.py`) is the same "turn ParameterValueError into a 400" pattern used at invocation time
  here. A shared helper could cover both, but that isn't a reason to block either.
- If finding 1 is done as a dev follow-up, the followups branch is the natural home. It already deals with
  `IntegerToolParameter` multiple/list coercion.

## Risks

Low one-way risk: this rejects, with a 400, invocation API requests that 26.0 accepted (dict values for
workflow parameter inputs), and it documents the wire format in the API schema.

<details><summary>Risk Details</summary>

- An API behavior change on a release branch: `inputs` dict values for `parameter_input` steps (e.g.
  `{"parameter_value": x}` or `{"src": "hda", "id": ...}`) used to be accepted and now return 400. The
  in-tree integration fixture had to change because of this.
- Re-running an older invocation whose stored `parameter_value` is a dict (via `/invocations/{id}/request`
  → POST) now fails up front instead of scheduling.
- Clients that stage workflow scalars as datasets (`galactic_job_json` in "workflow" mode, populator
  `stage_inputs` default) now get a 400 for Galaxy-native parameter inputs.
- Legacy `parameters` for a parameter step without `input` change from 500 to 400. Strictly better.
- Scalar batches (`{"batch": true, "values": [...]}`) for parameter inputs are now officially supported,
  which is a new API behavior that will be hard to remove later. Previously only string batches worked,
  and only by accident.
- Validation is still incomplete: wrong-typed scalars and lists are accepted, so the "validated" contract
  is weaker than the title suggests.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether rejecting dict-valued parameter inputs is acceptable on `release_26.1`, or
should be dev-only with a deprecation warning on the release branch. The integration-fixture change shows
that these requests used to succeed. I lean toward accepting it, because the values were already corrupting
downstream tool inputs, but it should be stated in the release notes.

Reviewers should also confirm that scalar batch support is intended as a supported API feature, since
it adds API surface on a release branch, and decide whether type-aware validation (finding 1) is
expected here or as a dev follow-up.

</details>

## Draft review comment

> _Posted by Claude (AI assistant) on behalf of jmchilton._
>
> Nice, tight fix. The `isinstance(value, dict)` guard in `expand_workflow_inputs` also fixes text batch values that happen to contain `"hid"` (e.g. `"hidden"` → `"hidden"["hid"]` raised `TypeError`), which is worth a line in the description.
>
> A few comments, none blocking for a draft:
>
> 1. **Scope of "validate".** On release_26.1 `input_param.validate()` only runs validators. It does no type checking, so `{"int_param": "abc"}` and `{"int_param": [1, 2]}` (non-multiple) are still accepted and persisted. I checked this with `IntegerToolParameter`/`FloatToolParameter`/`BooleanToolParameter`/`TextToolParameter.validate` at this head. `from_json` for integer/float already raises `ParameterValueError`, and the existing `except ParameterValueError` → 400 path right below would pick that up. Text and boolean would still need a non-scalar guard, though (`string_as_bool(dict)` returns `False`). For a release branch the narrow dict guard seems fine to me. Maybe retitle it as rejecting wrapped/dict parameter values, and do type-aware validation on dev (where multiple integers already validate list contents after #23802)?
> 2. **Behavior change.** The `test_workflow_scheduling_options` fixture change shows that a request like `{"text_input": {"src": "hda", "id": ...}}` used to schedule successfully and now returns 400. I agree it should be rejected, but since this is a point release it would be good to say so explicitly in the description/release notes.
> 3. Nits: `f"{step.label or step.order_index + 1}: ..."` now appears three times in `run_request.py`, so a small helper might be worth it (the `+ 1` also makes unlabeled step `"0"` show up as `1:`, though that matches the existing branch). Scalar batches reuse the "Please select equal number of data files." mismatch message. The `legacy`-parametrized unit test with an if/else body might read better as two tests or a doctest in `meta.py`.
>
> CI failures at this head all look like the rucio docker setup issue, so they're unrelated.
