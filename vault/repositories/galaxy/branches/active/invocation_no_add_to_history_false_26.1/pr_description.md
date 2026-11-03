Fix two workflow invocation request checks that treat a field being present as its value, so callers that send the documented defaults get the documented behavior.

The pydantic request model is correct: `no_add_to_history` and `ds_map` are optional with defaults. The generated TypeScript types (also published as `@galaxyproject/galaxy-api-client`) mark them required anyway, so typed callers fill in `false` and `{}`. The server then misreads both:

| Request | Before this fix | With this fix |
| --- | --- | --- |
| `no_add_to_history: false` or `null` | 🐛 inputs from other histories or libraries silently not copied into the target history | copied, same as omitting it |
| `no_add_to_history: true` | not copied | unchanged |
| `ds_map: {}` or `null` alongside `inputs` | 🐛 **400**: "Cannot specify both legacy ds_map and input attributes." | accepted, `inputs` used |
| non-empty `ds_map` alongside non-null `inputs` | 400 | unchanged |

```diff
-    if "inputs" in payload and "ds_map" in payload:
+    if payload.get("inputs") is not None and payload.get("ds_map"):
 ...
-    add_to_history = "no_add_to_history" not in payload
+    add_to_history = not payload.get("no_add_to_history", False)
```

***Omitting either field behaves exactly as before. BioBlend is unaffected: it never sends `ds_map` and only ever sends `no_add_to_history: true`.***

***No API contract or client type change: the server now does what the request model already documents.***

<details><summary>Why the presence checks misfired</summary>

`WorkflowsService.invoke_workflow` dumps the payload with `model_dump(exclude_unset=True)` before `build_workflow_run_configs`. An omitted field never reaches `run_request.py`, but any explicit value does, including `false`, `null` and `{}`. Both checks used `"key" in payload`, so they read every explicit value as "the caller set this".

Of the ten defaulted fields the generated type makes required, these are the only two `run_request.py` reads by presence; the rest use `.get()` or model attributes. Galaxy's own run form posts through untyped axios and only sends the fields it sets, which is why this went unnoticed. Both checks predate the 2024 pydantic payload, so these aren't recent regressions.

</details>

## The path not taken: fixing the generated types

The alternative was to fix the types so callers aren't pushed into sending the defaults at all: 🌿[invocation_no_add_to_history_false](https://github.com/jmchilton/galaxy/tree/invocation_no_add_to_history_false) against `release_26.2`. It carried these two server fixes plus a small wrapper around openapi-typescript (`client/scripts/generate-api-schema.mjs`), the description fix, and regenerated `schema.ts`. The [comparison gist](https://gist.github.com/jmchilton/c68c645a8fa6d8da58af9a5e70f060c1) covers both.

openapi-typescript's `defaultNonNullable` makes defaulted properties required, which is right for responses, where the server always sends them. It exempts request bodies, but only inline ones; Galaxy's request bodies `$ref` shared component schemas, so they lose the exemption. The wrapper re-applied it to schemas reachable only from request bodies.

| Fix the types (26.2 branch) | Fix the server only (this PR) |
| --- | --- |
| <ul><li>Fixes the cause: typed callers no longer have to send defaults.</li><li>New build script, ~450 lines of regenerated `schema.ts`, Makefile and CI hooks on a release branch.</li><li>Still partial: 80 schemas shared by requests and responses (176 defaulted properties) keep required defaults.</li><li>Every merge forward needs `make update-client-api-schema` rerun.</li></ul> | <ul><li>Two lines plus API tests; merges forward like any release fix.</li><li>Fixes the behavior for every published api-client, including 26.1.x.</li><li>Typed callers still send the defaults, but the server now honors them.</li></ul> |

I asked on the backend channel for a preference between the two and got none, so this takes the smaller fix. The type fix can come back on `dev` if wanted; an upstream openapi-typescript option that also exempts `$ref`'d request bodies may be the cleaner home for it.

<details><summary>Other type fixes considered</summary>

- `--default-non-nullable=false` globally would also make response fields optional, even though the server always sends them.
- Pydantic's `json_schema_serialization_defaults_required` would mark defaults required only in response schemas, but splits about 80 shared models into `*-Input`/`*-Output` and renames types across the client.

</details>

## Risks

Low. Behavior changes only for requests that explicitly sent `false`/`null` for `no_add_to_history` or `null`/`{}` for `ds_map`, toward what the schema documents.

<details><summary>Risk Details</summary>

- A client that sent `no_add_to_history: false`/`null` and relied on inputs *not* being copied will now see them copied. No such client is known; `true`, the reliable opt-out, is unchanged.
- The flag also feeds library dataset imports and HDCA copies (`run_request.py`), so an explicit `false`/`null` now imports those too. The regression test covers cross-history HDA inputs only.
- `inputs: null` with a non-empty `ds_map` used to 400 and now runs from `ds_map`, the same path as omitting `inputs`.

</details>

<details><summary>Risk Review Advice</summary>

Ask whether any caller intentionally sends `no_add_to_history: false`/`null` to mean "don't copy", or an empty `ds_map` expecting a 400. Either would be working against the published schema.

</details>

## Context

Split out of 🌿[issue_20900_invocation_validation](https://github.com/jmchilton/galaxy/tree/issue_20900_invocation_validation), which works toward 🎯 #20900 (validate workflow invocation requests before side effects). This PR doesn't depend on that branch.

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? No new error path. Explicit `false`/`null` `no_add_to_history` now copies inputs, and a `null`/`{}` `ds_map` next to `inputs` now runs instead of returning 400. A non-empty `ds_map` next to `inputs` still gets the same 400.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Both API tests drive the public invocation endpoint and check HTTP status or target-history contents.
- [x] Are the comments free of excess archeology? Yes. The change adds no comments.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? No workflow definitions change. Requests with these explicit default values are corrected; omission and the `true` opt-out keep their behavior.
- [x] Who hits this in practice and what is the evidence? No known in-tree or ecosystem client sends explicit `false` or a `ds_map` alongside `inputs`. Typed TS callers of the published api-client are pushed into both, because the type makes both fields required.
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes. Two value-based checks avoid changing the service's `exclude_unset=True` dump, which would change how every other field arrives. The type-side fix is described above.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `lib/galaxy_test/api/test_workflows.py::TestWorkflowsApi::test_run_no_add_to_history`, parametrized over omitted / `null` / `false` / `true`. Without the fix, `null` and `false` fail at the count assertion (empty target history).
- `lib/galaxy_test/api/test_workflows.py::TestWorkflowsApi::test_run_inputs_with_ds_map`, parametrized over omitted / `null` / `{}` / non-empty. Without the fix, `null` and `{}` get the 400 above; non-empty still does.

Both tests (8 cases) pass with the fix. Against `release_26.1`'s `run_request.py`, exactly the four cases above fail.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
