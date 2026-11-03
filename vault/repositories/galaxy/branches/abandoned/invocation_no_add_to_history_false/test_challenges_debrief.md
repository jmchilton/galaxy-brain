# Test challenges

Re-run on head `b0385f2c556` (base `origin/release_26.2`). Covers both API tests and the generator vitest. Reviewed `GX_PROCESS_CHALLENGE_TESTS.md`, Galaxy `doc/source/dev/writing_tests.md` (decision tree, populators, API assertions, fixtures) and `client/README.md#client-side-unit-testing`.

Result: kept all three tests, made two small edits (below) and added no E2E test.

## `test_run_no_add_to_history` (API, 4 params)

Kept unchanged. It's the right layer: the bug sits on the HTTP/serialization boundary (key presence vs value), so a unit test of `build_workflow_run_configs` would just mirror the one-line implementation. It covers the public request and checks the visible result (target history contents). Mocks: none. The source and target histories have to differ for the copy path to run at all.

## `test_run_inputs_with_ds_map` (API, 4 params)

Kept, with one edit. `assert "..." in response.text` became `assert_error_message_contains(response, "Cannot specify both legacy ds_map and input attributes")`. That helper is already imported, it's what the neighboring tests at `test_workflows.py:7866-8008` use, and it asserts on `err_msg` specifically, so the check is stronger. The cases where the request succeeds assert only a 200. That's enough: if `ds_map` were taken over the inputs, the required `input1` would be unset and the request would fail.

## Overlap between the two API tests

No shared helper. The shared part is a 5-line inline YAML, one `new_dataset` and a 3-key request dict. The setups also differ in an important way: the copy test needs two histories and the ds_map test needs one. A helper would either take a history-topology parameter or hide the request body, and the request body is what both tests are about (which keys are present, and with what values). Inline input-only YAML is the file's usual idiom (`:7854`, `:7887`, `:7914`). `WORKFLOW_INPUTS_AS_OUTPUTS` in `workflow_fixtures.py` doesn't fit because it requires a text input too. A module constant isn't worth it for two uses.

Considered but not done: the `history_id` pytest fixture, which `writing_tests.md` recommends and `:7851` uses, could replace one `test_history()` context per test. It would save one level of indentation. That's cosmetic, and it would have meant re-running the copy test for no gain in coverage.

## `client/tests/vitest/generate-api-schema.test.js`

Kept, with one case dropped. Location: `tests/vitest/` next to the `check-style-imports.test.js` precedent. The README's "adjacent to the code" rule is about `src/` components, and the script lives in `client/scripts/`. Vitest's `include` covers `tests/vitest/**`. Mocks: none. A fixture OpenAPI doc goes through the real `openapi-typescript`, and the test asserts on the emitted TS, which is the script's observable output.

**Dropped** `"finds schemas reachable only from request bodies"`. It asserted the intermediate set from `requestOnlySchemaNames`, and that helper is exported only for this test, so the case tested the implementation directly. Reasoning per mutant that the output-level cases still catch every mutant the dropped case caught:

- Drop response reachability: `Shared` (reachable through `Payload.shared.allOf` and `Result.shared.items`) becomes request-only, so `label` turns optional and the "keeps … reachable from responses" case fails.
- Drop transitive closure: `Nested` is never reached, so `depth` stays required and the "makes … optional" case fails.
- Flip request/response: `Payload.flag` stays required and `Shared.label`/`Result.count` turn optional, so both cases fail.
- Drop the `required` check or the property-name unescape: `"a/b"` or `"x~y"` turns optional, so the "whatever their name" case fails.

`requestOnlySchemaNames` is now exported for nothing. Removing the `export` is a one-word script change and is up to the caller.

**`$ref`-name unescape: no case added.** Pydantic 2.13.5's `GenerateJsonSchema.normalize_name` rewrites component names to `[a-zA-Z0-9.\-_]` (`re.sub(r'[^a-zA-Z0-9.\-_]', '_', name)`), so `/` and `~` can't occur. A grep of the component-schema keys in both committed `schema.ts` files found none (891 Galaxy keys, 323 Tool Shed keys). The failure mode is also safe: an un-unescaped name never matches a schema, so it's never classified request-only and its fields stay required, which is the pre-branch behavior. A fixture for a path that can't be reached and fails safe would be a silly test. The unescape in `collectRefs` is dead code for pydantic-generated input; keeping it as cheap JSON-pointer correctness or deleting it is a script decision for the caller. This differs from the property-name unescape, whose failure was unsafe (a required field made optional), so that case stays.

## E2E

None. No UI behavior changed. The client diff is generated types only, and CI's `lint_openapi_schema` regeneration diff plus the client typecheck cover the regenerated `schema.ts`.

## Edits and runs

- `client/tests/vitest/generate-api-schema.test.js`: dropped the `requestOnlySchemaNames` case and its import. `vitest run tests/vitest/generate-api-schema.test.js` (node 22.20.0): 3 passed. Prettier clean.
- `lib/galaxy_test/api/test_workflows.py`: `assert_error_message_contains` in `test_run_inputs_with_ds_map`. `pytest …::test_run_inputs_with_ds_map`: 4 passed (omitted, null, empty, non_empty) in 31s. Ruff and black clean.
- `test_run_no_add_to_history` was not edited and not re-run.
- Uncommitted in the worktree. No red run of the ds_map test against the base in this pass.
