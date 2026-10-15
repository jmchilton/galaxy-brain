PASS. Every item an agent may answer passes. The `ds_map` conflict check now matches the `inputs`/`ds_map` branch choice and has a red-to-green API test. The generator's fixture test still catches every non-equivalent mutation. The human-read item is left for John.

Evaluated `33be985c49e` against `origin/release_26.2` at `162b71f8185` (9 files, +453/-232; 4 commits: `9e160f5cbde` `no_add_to_history` by value + API test, `261b0266427` schema description, `40d5f0eeaa1` `client/scripts/generate-api-schema.mjs` + fixture test + Makefile + `lint_openapi_schema.yml` paths + regenerated `schema.ts` files, `33be985c49e` `ds_map`/`inputs` conflict check + API test).

## General

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Server: no new error path. Explicit `false`/`null` `no_add_to_history` now copies inputs, and a `null`/`{}` `ds_map` next to `inputs` now runs instead of returning 400. A non-empty `ds_map` next to `inputs` still gets the same 400 message. Types: a wrong classification would show up as a TS compile error or a server 422, never as a runtime change.
  <details>

  **`no_add_to_history`.** Before the fix, an explicit `false` or `null` silently left the input out of the target history, with no error. Now `false`, `null` and omitted all take the existing copy path (`run_request.py:336`, `:426`, `:441`, `:468`). `true` behaves as before. A failure would be the same silent "input in the wrong history" outcome, not a new message.

  **`ds_map` check (`run_request.py:333`).** `payload.get("inputs") is not None and payload.get("ds_map")` matches the branch choice at `:345-361`:
  - `inputs` is `None` (omitted or explicit `null`): `ds_map` is used (`:356`). The check never fires, so nothing is dropped.
  - `inputs` is non-`None`, even `{}`: `inputs` is used and `ds_map` is ignored. The check fires exactly when the ignored `ds_map` is non-empty, so no data is ever dropped silently. A `null`/`{}` `ds_map` carries nothing.
  - `inputs: null` + `ds_map: null`: now reaches `:356` with `None`. `expand_workflow_inputs` already does `inputs or {}` (`tools/parameters/meta.py`), the same path as omitted `inputs` + `null` `ds_map` on the base.

  Payloads arrive via `model_dump(exclude_unset=True)` (`services/workflows.py:330`), so only explicitly sent keys reach the check. The old key-presence test rejected the schema default `ds_map: {}` whenever a client sent it.

  **Generated types.** `schema.ts` contains types only, so a classification mistake can't change runtime behavior. A schema wrongly kept required forces callers to send a defaulted field. That's today's behavior for request schemas that a response also reaches, and it's kept on purpose. A required field wrongly made optional compiles, and then the server rejects the request with a 422.

  **Generator.** `generate-api-schema.mjs:76` unescapes the schema and property segments of the `transformProperty` path (`~1` to `/`, then `~0` to `~`) before the `requestOnlySchemas` and `required` lookups. `$ref` targets are used as-is (`:30`). No unescape is needed there: pydantic's `GenerateJsonSchema.normalize_name` replaces every character outside `[a-zA-Z0-9.\-_]` with `_`, so schema names never contain `/` or `~`. Transitive `$ref` closure works through any key (`allOf`/`anyOf`/`items`). `PROPERTY_PATH` (`:14`) matches only direct properties of component schemas. The CLI main guard (`:92`) matches `check-style-imports.mjs:7`. `make update-client-api-schema` on the new base shows zero drift for both `schema.ts` files, and client vue-tsc and the Tool Shed typecheck both report 0 errors.
  </details>
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Both API tests drive the public invocation endpoint and check HTTP status or history contents. The generator test checks the TS emitted for a fixture OpenAPI document. Each was red without its fix or fails under mutation.
  <details>

  **`test_run_no_add_to_history`** (`test_workflows.py:8060-8082`) is parametrized over omitted/`null`/`false`/`true`. It invokes with an HDA from a separate source history and counts the target history's contents. No mocks. `null` and `false` were red on the base, and all four pass with the fix.

  **`test_run_inputs_with_ds_map`** (`:8084-8110`) is parametrized over omitted/`null`/`{}`/non-empty `ds_map` next to by-name `inputs`. The non-empty case expects 400 plus the message, checked with `assert_error_message_contains`. The others expect 200. Before the fix, `null` and `empty` were red (400 `Cannot specify both legacy ds_map and input attributes.`), and omitted and non-empty passed. Dropping the check entirely would fail non-empty: `inputs` would win and the request would return 200. Reverting to `is not None` on `ds_map` would fail `empty`. Not covered: `inputs: {}` + non-empty `ds_map` (it would catch a truthiness test on `inputs`) and `inputs: null` + non-empty `ds_map` (now accepted via the legacy path).

  **Generator test.** `client/tests/vitest/generate-api-schema.test.js` has 3 cases, all green. It feeds a ~35-line OpenAPI fixture to the exported `generateApiSchema` and checks the emitted `?`:
  - request-only `Payload.flag` and the nested `$ref` `Nested.depth` become optional;
  - `Shared` (request via `allOf`, response via `items`) and response-only `Result` keep defaults required;
  - explicitly required `"a/b"`/`"x~y"` stay required.

  The `requestOnlySchemaNames` case was dropped and the helper is no longer exported, so the suite tests only output.

  **Mutation check** (scratch copy of the script, same test file, at this SHA):
  - dropping the property unescape fails the escaped-name case;
  - dropping the `required` check fails the escaped-name case;
  - dropping the response-reachability filter fails the response case;
  - dropping the transitive closure fails the request-only case;
  - disabling the flip fails the request-only case;
  - dropping `"default" in schemaObject` passes, but it's an equivalent mutant (non-required, non-defaulted properties already have `?`).

  **CI coverage.** `client-unit.yaml` triggers on `client/**`, and its vitest `include` covers `tests/vitest/**`. `lint_openapi_schema.yml` lists `client/scripts/generate-api-schema.mjs` in both its `push` and `pull_request` paths (`:20`, `:38`), so a change to the script alone still regenerates and diffs `schema.ts`.
  </details>
- [x] Are the comments free of excess archeology? Yes. The script header explains the openapi-typescript behavior it works around, not Galaxy's history. The `run_request.py` change and the tests add no comments.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## Workflow-related

- [x] Which existing workflows change behavior (if any)? No workflow definitions change. Requests that send `no_add_to_history: false`/`null` now copy inputs, and requests that send a `null`/`{}` `ds_map` next to `inputs` now run instead of returning 400. Every request accepted before still behaves the same.
  <details>

  **`no_add_to_history`** (`run_request.py:336`) is now read by value.
  - explicit `false`: before, not copied; now copied. This is the fix.
  - explicit `null` (allowed by `bool | None`, `schema/workflows.py:211`): before, not copied; now copied, matching the schema default.
  - omitted or `true`: unchanged.

  The flag covers the LDDA/LD imports (`:426`, `:441`) and the HDA/HDCA cross-history copy (`:468`).

  **`ds_map`** (`:333`): the new condition rejects a strict subset of what the old one rejected.
  - non-`None` `inputs` + `null`/`{}` `ds_map`: before 400, now runs with `inputs`. Tested.
  - `inputs: null` + any `ds_map`: before 400, now takes the legacy `ds_map` path, the same as omitting `inputs`. Untested; the behavior follows from `:353`.
  - non-`None` `inputs` + non-empty `ds_map`: still 400, with the same message. Tested.

  The schema-description and generator commits don't change server behavior.
  </details>
- [x] Who hits this in practice and what is the evidence? No known in-tree or ecosystem client sends explicit `false` or a `ds_map` alongside `inputs`. Typed TS callers of the published api-client were pushed into both, because on the base the type made both fields required.
  <details>

  - In-tree, nothing sends `no_add_to_history` or `ds_map` alongside `inputs` apart from the new tests. The run form (`WorkflowRunFormSimple.vue:473`) builds an untyped payload with neither field. Server-side constructions of `InvokeWorkflowPayload` (`services/wes.py:563`, `agents/operations.py:562`) go through `model_dump(exclude_unset=True)`, so unset defaults never reach the check. The test populator sends `ds_map` only on its legacy path, without `inputs`.
  - BioBlend sends only `no_add_to_history=True`, behind `if not import_inputs_to_history`, and never sends `ds_map`. Planemo sends neither.
  - On the base, `InvokeWorkflowPayload` in the api-client has a required `no_add_to_history: boolean | null` and a required `ds_map`. A typed caller, or any client that serializes the full model, would send `false`/`null` (inputs silently not copied) and `ds_map: {}` next to `inputs` (400). On the branch both are optional, and the server accepts both.
  - The generator change reaches 224 request-only properties in the Galaxy client schema and 2 in the Tool Shed schema. The client and the Tool Shed frontend both typecheck clean.
  </details>
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes. Each server check is a one-line value-based fix. For types, a global `--default-non-nullable=false` would loosen response types, and pydantic's `json_schema_serialization_defaults_required` would split shared models into `-Input`/`-Output` and rename client types.
  <details>

  - **`no_add_to_history`:** the one-line value check is the narrowest fix. Narrowing the schema to `bool = False` would reject explicit `null`, an API contract change on a release branch. Dropping `exclude_unset=True` would change how every other payload field is read.
  - **`ds_map`:** leaving the check alone would keep rejecting the schema default. Removing it would silently ignore a non-empty `ds_map` whenever `inputs` wins. Rejecting only a non-empty `ds_map` next to non-`None` `inputs` is the smallest condition that still catches every request where data would be dropped.
  - **`--default-non-nullable=false` globally:** would also make defaulted response properties `T | undefined` across every response-reachable schema.
  - **Pydantic `json_schema_serialization_defaults_required` + `--default-non-nullable=false`:** every shared model with defaults would split into `-Input`/`-Output`, renaming types across the client. Galaxy already emits separate input/output schemas where they differ (`get_openapi` defaults `separate_input_output_schemas=True`, `webapps/openapi/utils.py:44`).
  - A `transformProperty` hook is the smallest change that matches openapi-typescript's own inline-request-body exemption without touching response types.
  </details>
