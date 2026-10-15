Fix workflow invocations treating `no_add_to_history: false` (the documented default) as `true`.

The invocation API declares `no_add_to_history` as `bool | None` with default `false`, but `build_workflow_run_configs` only checked whether the key was present. Sending the documented default turned the opt-out on:

| Request body | Input from another history or library, before | After |
| --- | --- | --- |
| `no_add_to_history` omitted | copied into target history | copied into target history |
| `"no_add_to_history": false` | 🐛 **not copied** | copied into target history |
| `"no_add_to_history": null` | 🐛 **not copied** | copied into target history |
| `"no_add_to_history": true` | not copied | not copied |

There's no error either way. The invocation runs, but the target history ends up with the outputs and without the inputs they came from.

```diff
-    add_to_history = "no_add_to_history" not in payload
+    add_to_history = not payload.get("no_add_to_history", False)
```

***A typed client has to send a value: the published `@galaxyproject/galaxy-api-client` (26.1.1) types `no_add_to_history` as a required `boolean | null` on `InvokeWorkflowPayload`, and the natural value, the schema default `false`, did the opposite of what it says.***

***Omitting the flag behaves as before, and so does BioBlend's `import_inputs_to_history=False`, which only ever sends `true`.***

***No schema or client change: the request model has documented `false` as the default since 2024, and this makes the server match it.***

***Despite its schema description ("should not be added to the history"), the flag never kept the invocation out of the history. It only controls whether inputs from other histories or libraries are copied in.***

<details><summary>Why the presence check misfired</summary>

`WorkflowsService.invoke_workflow` dumps the payload with `model_dump(exclude_unset=True)` before calling `build_workflow_run_configs`. So an omitted field never reaches `run_request.py`, but any explicitly sent value does, including `false` and `null`. The presence check `"no_add_to_history" not in payload` therefore read every explicit value as "don't add". Reading the value instead makes omission, `false` and `null` behave the same, as the schema says they should. The same value now applies to HDA/HDCA cross-history copies and library dataset imports (`run_request.py` `:426`, `:441`, `:468`).

The presence check is old: it was already there when the run-request handling moved into `run_request.py` (d5916381a8c, 2014). The `default=False` the schema promises arrived with the pydantic invoke payload (222f3649d1b, 2024-02). So schema and code have disagreed for over two years; this isn't a recent regression.

`no_add_to_history` isn't the only defaulted field the TS type makes required. `batch`, `legacy`, `instance`, `ds_map`, `parameters`, `use_cached_job`, `parameters_normalized`, `require_exact_tool_versions` and `allow_tool_state_corrections` are too. It's the one where sending the default silently did the opposite.

</details>

## Risks

Low, and in the direction of the documented contract. This changes observable API behavior on a release branch, but only for requests that explicitly sent `false` or `null` and got the opposite of what the schema documents.

<details><summary>Risk Details</summary>

- A client that sent `false` or `null` and came to rely on inputs *not* being copied will now see them copied into the target history. No such client is known; the reliable way to opt out has always been `true`, which is unchanged.
- Library dataset inputs follow the same flag, so an explicit `false`/`null` now imports them into the target history too. The regression test covers HDA inputs only.
- No schema, model or client changes.

</details>

<details><summary>Risk Review Advice</summary>

The production change is one line in `lib/galaxy/workflow/run_request.py`. The question worth a reviewer's time is whether any caller intentionally sends `false` or `null` to mean "don't copy". That would be a caller working against the published schema.

</details>

## Context

Split out of 🌿[issue_20900_invocation_validation](https://github.com/jmchilton/galaxy/tree/issue_20900_invocation_validation), which works toward 🎯 #20900 (validate workflow invocation requests before side effects). This fix doesn't depend on that branch. Broader invocation validation and extra input-source test matrices (library datasets, collections) stay with that work.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the narrow scope: fix the flag's value semantics, with regression coverage through the invocation API.</summary>

Considered: widening the test matrix to collection and library inputs (more setup for a flag shared by every input source), folding in #20900's invocation validation and side-effect guarantees (separate failure modes, would couple an independent fix to a larger change), and shipping without the API regression (leaves the serialization boundary unprotected). The narrow fix with an API regression was kept. Explicit `null` coverage, listed there as optional, was added during polishing.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Keep the API regression; no unit tests or mocks to replace, and a browser test is unnecessary.</summary>

The test checks observable behavior: it creates a workflow, invokes it through the public API with an HDA from a separate source history, and counts the target history's contents. `false` and `null` demonstrate the bug; omitted and `true` guard the existing behavior. An input-only workflow avoids depending on tool execution. There's no UI change, so a browser test adds nothing.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Nothing new. Explicit `false`/`null` now take the existing copy path; the old bug was silent, with inputs missing from the target history.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. It's an API test that asserts target-history contents for omitted, `null`, `false` and `true`.
- [x] Are the comments free of excess archeology? Yes. The diff adds no comments.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? No workflow definitions change. Only invocation requests that explicitly send `no_add_to_history: false` or `null` now copy inputs.
- [x] Who hits this in practice and what is the evidence? No known client sends explicit `false`. Exposed: callers typed against the generated TS `InvokeWorkflowPayload` (field non-optional) or that serialize the full payload model.
- [x] Were simpler or existing approaches considered? Yes. Narrowing the schema to `bool` would reject `null` (an API contract change on a release branch). Dropping `exclude_unset=True` would change every other payload field. The value check is the smallest change.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Test</summary>

`lib/galaxy_test/api/test_workflows.py::TestWorkflowsApi::test_run_no_add_to_history` is parametrized over omitted / `null` / `false` / `true`. Against `release_26.2`'s `run_request.py`, `null` and `false` fail at the count assertion (empty target history) and omitted and `true` pass, matching every "before" row of the table above. With the fix, all four pass.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
