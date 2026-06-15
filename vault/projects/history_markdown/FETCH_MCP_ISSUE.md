# Issue draft: agent-operations `upload_file_from_url` passes a decoded id to a field that re-decodes

> Draft prepared for filing against galaxyproject/galaxy. Affects `dev` and `release_26.1`.

## Title

`upload_file_from_url` agent operation / MCP tool fails: decoded history id passed to `FetchDataPayload` (which expects an encoded id)

## Summary

The shared agent-operations `upload_file_from_url` (exposed as the `upload_file_from_url` MCP tool) is broken for every call. It decodes the incoming `history_id` to a raw integer and passes that integer to `FetchDataPayload`, whose `history_id` field is a `DecodedDatabaseIdField` — i.e. it expects the **encoded** id string and decodes it itself. The pre-decoded int fails validation, so no upload ever succeeds.

## Affected versions

- `dev` — present (`lib/galaxy/agents/operations.py`).
- `release_26.1` — present (identical code; the introducing PR is an ancestor of the release branch).
- `release_26.0` — **not** affected (predates the feature).

## Symptom

Any `upload_file_from_url` call returns:

```
1 validation error for FetchDataPayload
history_id
  Assertion failed,  [type=assertion_error, input_value=108, input_type=int]
```

(`108` is the raw decoded id of whatever history was targeted.)

## Root cause

`lib/galaxy/agents/operations.py`, `upload_file_from_url`:

```python
decoded_history_id = self.trans.security.decode_id(history_id)
fetch_payload = FetchDataPayload(
    history_id=decoded_history_id,   # <-- raw int
    targets=[...],
)
```

`FetchDataPayload.history_id` is declared as `DecodedDatabaseIdField` in `lib/galaxy/schema/fetch_data.py`:

```python
class BaseDataPayload(...):
    history_id: DecodedDatabaseIdField
```

`DecodedDatabaseIdField` validates an **encoded** id string and decodes it during model construction. Passing an already-decoded `int` trips its validator.

The same "decode first, then pass `decoded_history_id`" idiom is used by the sibling methods in this file (`get_history_details`, `get_history_contents`, `get_history_details`, …) and is **correct there**, because those pass the int to service methods that accept a raw decoded id. `FetchDataPayload` is the one consumer in the file whose contract is the opposite (it wants the encoded string), so it is the single call site that breaks.

## Proposed fix

Pass the encoded `history_id` straight through and let the schema field decode it; drop the redundant `decode_id`:

```diff
     def upload_file_from_url(
         self,
         history_id: str,
         url: str,
         file_type: str = "auto",
         dbkey: str = "?",
         file_name: str | None = None,
     ) -> dict[str, Any]:
-        decoded_history_id = self.trans.security.decode_id(history_id)
         fetch_payload = FetchDataPayload(
-            history_id=decoded_history_id,
+            history_id=history_id,
             targets=[
                 DataElementsTarget(
                     destination=HdaDestination(type="hdas"),
                     elements=[
                         UrlDataElement(
                             src="url",
                             url=url,
                             ext=file_type,
                             dbkey=dbkey,
                             name=file_name,
                         )
                     ],
                 )
             ],
         )
         result = self.tools_service.create_fetch(self.trans, fetch_payload)
         return self._encode_ids_in_response(result)
```

Verified working against a live server: with this change the upload runs and the fetched dataset lands in the target history.

## Test gap

`test/integration/test_agents.py` references `upload_file_from_url` only to assert it is present in the registered MCP tool list — it never executes a real upload, so the decode path is never exercised. A regression test should call `upload_file_from_url` with an encoded `history_id` and assert the dataset arrives `ok`.

## Origin

- Introduced by commit `36a5e66089` *"Add history and dataset MCP tools"* (Dannon Baker, 2025-12-03).
- Merged via **PR #21942** *"Shared Agent Operations and MCP Server"* (merged 2026-04-03).
- No prior tracking issue — latent since introduction.

## Related observation (separate, not part of this fix)

The agent-operations `run_tool` cannot express **map-over a dataset collection** on a single dataset input — core Galaxy rejects a bare `{"src": "hdca", ...}` on such a param and requires the `{"batch": true, "values": [{"src": "hdca", "id": ...}]}` encoding, which the operation/tool does not surface. Worth tracking separately if collection map-over is meant to be reachable through the MCP.
