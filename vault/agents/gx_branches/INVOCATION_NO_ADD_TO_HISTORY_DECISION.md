# Deciding between the two `no_add_to_history` branches

The workflow invocation API checks whether `no_add_to_history` and `ds_map` are present instead of reading their values, so a typed api-client caller that sends the defaults (`false`, `{}`) silently loses input copying or gets a 400.

**26.2 — [`invocation_no_add_to_history_false`](../../repositories/galaxy/branches/active/invocation_no_add_to_history_false/index.md)** ([branch](https://github.com/jmchilton/galaxy/tree/invocation_no_add_to_history_false), base `release_26.2`). It fixes the two server checks, corrects the `no_add_to_history` description, and adds a small wrapper around openapi-typescript (`client/scripts/generate-api-schema.mjs`). The wrapper makes defaulted fields optional in schemas used only by request bodies, so typed callers no longer have to send the defaults at all. That root-cause fix costs about 450 lines of regenerated `schema.ts` plus Makefile and CI hooks.

**26.1 — [`invocation_no_add_to_history_false_26.1`](../../repositories/galaxy/branches/active/invocation_no_add_to_history_false_26.1/index.md)** ([branch](https://github.com/jmchilton/galaxy/tree/invocation_no_add_to_history_false_26.1), base `release_26.1`). It contains only the two server fixes and their API tests: `run_request.py` +2/-2, `test_workflows.py` +52. Typed callers still send the defaults, but the server now honors them. It merges forward like any release fix, and the generator change could follow as its own PR or be dropped.

The other options don't work. Pydantic is already correct: `InvokeWorkflowPayload` is input-only, has a separate output model (`WorkflowInvocationRequestModel`), and the OpenAPI schema doesn't mark these fields as required. openapi-typescript's `defaultNonNullable` adds the requirement, and it only exempts inline request bodies, not request bodies that `$ref` a shared schema the way Galaxy's do. Turning `--default-non-nullable` off globally would make response fields optional too, even though the server always sends them. Adding pydantic's `json_schema_serialization_defaults_required` would split about 80 shared models into `-Input`/`-Output` versions and rename types across the client.

<details><summary>More detail</summary>

- **Why it went unnoticed.** Galaxy's own run form posts through untyped axios (`client/src/components/Workflow/Run/services.js`) and only sends the fields it sets. Only callers using the published typed api-client are pushed to fill in every defaulted field.
- **The server fixes.** `add_to_history = not payload.get("no_add_to_history", False)`, and the `ds_map` conflict now applies only to a non-empty `ds_map` alongside non-null `inputs`. Explicit `true` and a non-empty conflicting `ds_map` behave as before. The parametrized API tests cover omitted, null, false and true for `no_add_to_history`, and omitted, null, empty and non-empty for `ds_map`.
- **No other fields affected.** In `run_request.py`, every other check reads the value. The remaining `"step_parameters" in payload` check never fires from the API, because `step_parameters` isn't a field on the model. I found no "sent false means true" bug elsewhere: the `deleted`/`visible` presence checks in the history-contents and collection update paths are deliberate.
- **The generator fix is partial.** Schemas used by both requests and responses keep the required defaults; only the pydantic split above would fix those. An upstream openapi-typescript option that also exempts `$ref`'d request bodies may be a cleaner long-term fix than a Galaxy-side wrapper.
- **The two branches overlap.** The 26.1 commits are cherry-picks of the 26.2 server commits. If 26.1 merges first, the 26.2 PR reduces to the description and generator changes after a rebase.

</details>
