PASS. Every agent-answerable item passes; the human-read item is left for John.

Evaluated `e6121407400` against `origin/release_26.2` (2 files, +25/-1).

## General

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Same as an omitted flag: the input is copied into the target history. The fix adds no new error path.
  <details>

  Before the fix, an explicit `false` or `null` made the input silently miss the target history, with no error. After the fix, `false`, `null` and omitted take the same existing copy path (`run_request.py:468`). `true` keeps leaving the input in its source history. Any failure is the same silent "input in the wrong history" result as before, not a new message.
  </details>
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. It's an API test that checks target-history contents for omitted, `null`, `false` and `true`, not the payload parsing.
  <details>

  `test_workflows.py:8060-8082` is parametrized over `["omitted", None, False, True]`. It posts real JSON to `workflows/{id}/invocations` with an HDA from a separate source history, sends the key unless `"omitted"`, and expects 0 target-history items only for `True` (`:8081`), 1 otherwise. It uses no mocks and doesn't touch `build_workflow_run_configs`. Against `release_26.2`'s `run_request.py`, `[None]` and `[False]` failed with `AssertionError: []` (0 items) while `[omitted]` and `[True]` passed; with the fix all 4 pass.
  </details>
- [x] Are the comments free of excess archeology? Yes. The diff adds no comments.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## Workflow-related

- [x] Which existing workflows change behavior (if any)? No workflow definitions change. Only invocation requests that send `no_add_to_history: false` or `null` now copy inputs; both cases are tested.
  <details>

  `run_request.py:336` changes from `"no_add_to_history" not in payload` to `not payload.get("no_add_to_history", False)`. The service dumps the payload with `exclude_unset=True` (`services/workflows.py:330`), so an explicit value reaches this line. The behavior changes are:
  - explicit `false`: before, not copied; now copied. This is the fix.
  - explicit `null` (allowed by `bool | None`, `schema/workflows.py:211`): before, not copied; now copied. This matches the schema default. The `[None]` test case covers it and was red before the fix.
  - omitted or `true`: unchanged, and both are tested.

  The flag reaches the LDDA/LD paths (`run_request.py:426,441`) and the HDA/HDCA cross-history copy (`:468`). `build_workflow_run_configs` has one caller (`services/workflows.py:330`).
  </details>
- [x] Who hits this in practice and what is the evidence? No known client sends explicit `false`. The exposed callers are clients that send the schema's documented default or a full payload model.
  <details>

  - In-tree Galaxy (client and server): no code sends `no_add_to_history`. Its only uses are the schema field, `run_request.py` and the new test.
  - BioBlend sends only `True` (`workflows/__init__.py:584` and `invocations/__init__.py:286`, both behind `if not import_inputs_to_history`), so it isn't affected.
  - Planemo doesn't send the flag.
  - Exposure: the schema documents the default as `False`. The generated `@galaxyproject/galaxy-api-client` type marks it as a required `no_add_to_history: boolean | null` in `InvokeWorkflowPayload` (`client/packages/api-client/src/schema/schema.ts:18398`). A typed TS caller, or any client that serializes the full pydantic/OpenAPI model, would naturally send `false` or `null`, and before this fix its inputs silently weren't copied. No concrete affected user is known.
  </details>
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes. The one-line value check is the simplest fix; the alternatives change the API surface more.
  <details>

  - Narrow the schema to `bool = False`: this would reject explicit `null`, an API contract change on a release branch.
  - Drop `exclude_unset=True` in the service: this would change the semantics of every other payload field read by `build_workflow_run_configs`.
  - Broader invocation validation and atomicity from issue_20900, plus extra LDDA/HDCA/null input matrices: kept as separate work (see `scope_evaluation.md`), because the flag logic is shared by every input source.
  </details>
