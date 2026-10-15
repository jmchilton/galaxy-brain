Fix workflow invocations built to the published request types: honor `no_add_to_history: false`, accept an empty `ds_map` next to `inputs`, and stop generated client types requiring defaulted request fields.

A minimal invocation body doesn't compile against the generated client types (also published as `@galaxyproject/galaxy-api-client`, 26.1.1 included):

```ts
const body: components["schemas"]["InvokeWorkflowPayload"] = {
    history_id: "abc",
    inputs: { input1: { src: "hda", id: "def" } },
};
// error TS2740: Type '{ history_id: string; inputs: ... }' is missing the following properties
// from type ...: allow_tool_state_corrections, batch, ds_map, instance, and 6 more.
```

The OpenAPI document doesn't mark those ten fields required; they just have defaults. A typed caller that fills them in with the documented defaults then hits two server bugs. They're the only two of the ten fields the server read by key presence rather than by value:

| Field the type demands | Value a caller fills in | Before | After |
| --- | --- | --- | --- |
| `ds_map` | `{}` (its default) or `null` | 🐛 **400**: "Cannot specify both legacy ds_map and input attributes." | accepted, `inputs` used |
| `no_add_to_history` | `false` (its default) or `null` | 🐛 **inputs from other histories or libraries silently not copied** into the target history | copied |

```diff
-    if "inputs" in payload and "ds_map" in payload:
+    if payload.get("inputs") is not None and payload.get("ds_map"):
 ...
-    add_to_history = "no_add_to_history" not in payload
+    add_to_history = not payload.get("no_add_to_history", False)
```

***Omitting either field behaves exactly as before. BioBlend is unaffected: it never sends `ds_map` and only ever sends `no_add_to_history: true`.***

***No API contract change: the server now does what the request model documents. The `no_add_to_history` description is corrected too: the flag never kept the invocation out of the history, it only controls whether inputs are copied in.***

The type fix: openapi-typescript makes defaulted properties required on purpose for responses (the server always sends them), and skips that for request bodies, but only when the schema is inline. Galaxy's request bodies point into `components/schemas`, so they lost the exemption. `make update-client-api-schema` now applies it to schemas reachable only from request bodies:

```diff
 InvokeWorkflowPayload: {
-    no_add_to_history: boolean | null;
+    no_add_to_history?: boolean | null;
```

The `schema.ts` diff is pure regeneration: 224 properties gain a `?` (2 in the Tool Shed schema), plus the one description line. CI's drift check runs the new script.

***Response types don't change. Neither do the 80 schemas shared between requests and responses (176 defaulted properties, e.g. `WriteStoreToPayload`), so this is a partial fix on purpose: loosening those needs separate input/output schemas, which would rename client types.***

***Why on 26.2: today a request that satisfies the published types either 400s or silently skips copying inputs. Shipping both server fixes with the type fix lets the next api-client release carry types callers can satisfy. The server fixes are also being backported to 26.1 separately.***

<details><summary>Why the presence checks misfired</summary>

`WorkflowsService.invoke_workflow` dumps the payload with `model_dump(exclude_unset=True)` before calling `build_workflow_run_configs`. So an omitted field never reaches `run_request.py`, but any explicitly sent value does, including `false`, `null` and `{}`. Both checks used `"key" in payload`, so they read every explicit value as "the caller set this":

- `no_add_to_history`: any explicit value turned the opt-out on. Reading the value makes omission, `false` and `null` behave the same. The value feeds HDA/HDCA cross-history copies and library dataset imports (`run_request.py` `:426`, `:441`, `:468`).
- `ds_map`/`inputs`: any explicit `ds_map` conflicted with `inputs`. Now only a non-empty `ds_map` next to non-null `inputs` is rejected. That matches how the function picks its input source a few lines later (`inputs` unless it's `None`, then `ds_map`).

Changing the service's `exclude_unset=True` dump instead would change how every other field reaches this function; fixing the two checks is local.

The `no_add_to_history` presence check predates the 2014 move into `run_request.py` (d5916381a8c). The schema's `default=False` arrived with the pydantic invoke payload (222f3649d1b, 2024-02). These aren't recent regressions.

</details>

<details><summary>Generated types: how the exemption works and how it was checked</summary>

`client/scripts/generate-api-schema.mjs` replaces the bare `openapi-typescript` CLI in `make update-client-api-schema`. It follows `$ref`s from every operation's `requestBody` and `responses` (through `allOf`/`anyOf`/`items`). For component schemas reachable only from request bodies, it adds `?` to defaulted, non-required properties through openapi-typescript's `transformProperty` hook. That mirrors openapi-typescript 7's own `defaultNonNullable` exemption, which skips paths under `parameters`, `requestBody` and `requestBodies`. Galaxy's JSON request bodies reference `components/schemas`, which that exemption doesn't see.

- Before the change, the stock CLI reproduced both committed `schema.ts` files byte for byte; the script now does.
- `InvokeWorkflowPayload` loses ten required fields: `allow_tool_state_corrections`, `batch`, `ds_map`, `instance`, `legacy`, `no_add_to_history`, `parameters`, `parameters_normalized`, `require_exact_tool_versions` and `use_cached_job`.
- Run locally: the client `type-check` (vue-tsc) and the Tool Shed frontend `typecheck` pass with 0 errors. The api-client package's vitest suite passes, and its own `tsc` output is identical before and after (pre-existing test-mock errors only).
- `client/tests/vitest/generate-api-schema.test.js` checks the rules on a fixture document: request-only and nested schemas lose `required`, schemas shared with a response (through `allOf`) or used only in responses keep it, and explicitly required properties stay required even when their names need JSON-pointer escaping.
- `lint_openapi_schema.yml` fails CI when the committed `schema.ts` drifts from `make update-client-api-schema`. The script is added to its path filters so script-only changes trigger it.

Considered and rejected:
- `--default-non-nullable=false` globally would also make defaulted fields optional in response schemas, where the server always sends them.
- Pydantic's `json_schema_serialization_defaults_required` plus `--default-non-nullable=false` would mark defaults required only in response schemas. But the 80 shared schemas would split into `*-Input`/`*-Output`, renaming types across the client.

</details>

## Risks

Low. Server behavior changes only for requests that explicitly sent `false`/`null` for `no_add_to_history` or `null`/`{}` for `ds_map`, toward what the schema documents. The generated-type change only loosens request types.

<details><summary>Risk Details</summary>

- A client that sent `no_add_to_history: false`/`null` and relied on inputs *not* being copied will now see them copied. No such client is known; `true`, the reliable opt-out, is unchanged.
- Library dataset inputs follow the same flag, so an explicit `false`/`null` now imports them into the target history too. The regression test covers HDA inputs only.
- `inputs: null` with a non-empty `ds_map` used to 400 and now runs from `ds_map`, the same path as omitting `inputs`.
- Request-payload types in the api-client get optional fields. Code that builds payloads still compiles. Code that *reads* a field back off a typed request object would now see `T | undefined`. Galaxy's own client and Tool Shed frontend typecheck clean.
- The schema build now depends on a small script around openapi-typescript's `transformProperty` hook. The vitest fixture fails if an openapi-typescript upgrade changes the property paths the script matches.
- When this merges forward, `dev` needs `make update-client-api-schema` rerun rather than a textual merge of `schema.ts`.

</details>

<details><summary>Risk Review Advice</summary>

Server side: ask whether any caller intentionally sends `no_add_to_history: false`/`null` to mean "don't copy", or an empty `ds_map` expecting a 400. Either would be working against the published schema. Client side: check the request-only reachability in `generate-api-schema.mjs`. A schema reachable from any response must keep its required fields, and the `schema.ts` diff should touch only payload-like types.

</details>

## Context

Split out of 🌿[issue_20900_invocation_validation](https://github.com/jmchilton/galaxy/tree/issue_20900_invocation_validation), which works toward 🎯 #20900 (validate workflow invocation requests before side effects). This PR doesn't depend on that branch. Broader invocation validation and extra input-source test matrices stay with that work.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep all four commits in one PR to `release_26.2`: together they fix a request built to the published `InvokeWorkflowPayload` type end to end.</summary>

Of the ten fields the old type made required, only `no_add_to_history` and `ds_map` were read by key presence; the rest use `.get()` or model attributes. So for this payload, both server bugs the type exposes are fixed, and the generator keeps request-only types from pushing callers into them again. The type fix belongs on the release branch because the api-client is built from release tags; on `dev` alone, 26.2 users would keep an unsatisfiable type for a whole release. Left as follow-ups: input/output schema splits for the 80 shared schemas, an audit of other `exclude_unset=True` presence checks if a concrete case turns up, and library/collection input test matrices.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Kept both API tests and the generator vitest; dropped one vitest case that tested an internal helper, and switched an assertion to the existing error helper.</summary>

Both server bugs sit on the HTTP/serialization boundary (key presence vs value), so API tests are the right layer; a unit test of `build_workflow_run_configs` would just mirror the one-line checks. They post real requests and check visible results (target-history contents, the 400's `err_msg`), with no mocks. A shared setup helper for the two API tests was rejected: they need different histories, and the request body is what each test is about. The vitest runs a fixture OpenAPI document through the generator and asserts on the emitted types, following `check-style-imports.test.js`. No E2E test: nothing in the UI changes.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Server: no new error path. Explicit `false`/`null` `no_add_to_history` now copies inputs, and a `null`/`{}` `ds_map` next to `inputs` now runs instead of returning 400. A non-empty `ds_map` next to `inputs` still gets the same 400 message. Types: a wrong classification would show up as a TS compile error or a server 422, never as a runtime change.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Both API tests drive the public invocation endpoint and check HTTP status or history contents. The generator test checks the TS emitted for a fixture OpenAPI document. Each was red without its fix or fails under mutation.
- [x] Are the comments free of excess archeology? Yes. The script header explains the openapi-typescript behavior it works around, not Galaxy's history. The `run_request.py` change and the tests add no comments.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? No workflow definitions change. Requests that send `no_add_to_history: false`/`null` now copy inputs, and requests that send a `null`/`{}` `ds_map` next to `inputs` now run instead of returning 400. Every request the `ds_map` check accepted before still behaves the same.
- [x] Who hits this in practice and what is the evidence? No known in-tree or ecosystem client sends explicit `false` or a `ds_map` alongside `inputs`. Typed TS callers of the published api-client were pushed into both, because on the base the type made both fields required.
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes. Each server check is a one-line value-based fix. For types, a global `--default-non-nullable=false` would loosen response types, and pydantic's `json_schema_serialization_defaults_required` would split shared models into `-Input`/`-Output` and rename client types.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `lib/galaxy_test/api/test_workflows.py::TestWorkflowsApi::test_run_no_add_to_history`, parametrized over omitted / `null` / `false` / `true`. Against `release_26.2`'s `run_request.py`, `null` and `false` fail at the count assertion (empty target history), matching the table.
- `lib/galaxy_test/api/test_workflows.py::TestWorkflowsApi::test_run_inputs_with_ds_map`, parametrized over omitted / `null` / `{}` / non-empty. Before the fix, `null` and `{}` failed with the 400 above; non-empty still gets it.
- `client/tests/vitest/generate-api-schema.test.js`: the generator's reachability and required rules on a fixture OpenAPI document.

With the fixes, all 8 API cases and all 3 vitest cases pass.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
