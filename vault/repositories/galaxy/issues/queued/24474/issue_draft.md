# Tool API accepts a directly-passed HDCA whose collection type the input doesn't declare

Source: #24303 branch `issue_24303_collection_type_prefix_26.2` (record `vault/repositories/galaxy/branches/active/issue_24303_collection_type_prefix_26.2/`). Found while writing `test_nest_does_not_offer_paired_input_1_1_0` (`lib/galaxy_test/api/test_tools.py` on that branch). Re-pin against `dev` before filing.

## Problem

`DataCollectionToolParameter.from_json` (`lib/galaxy/tools/parameters/basic.py`, data_collection param) doesn't check the HDCA's `collection_type` against the param's declared `collection_type` list when an hdca is submitted directly (`{"src": "hdca", "id": ...}`, no batch/map-over). The tool form doesn't *offer* a non-matching collection, but the API accepts it, so the job proceeds with an input of the wrong type.

Observed: Nest 1.1.0 (input `collection_type="list,list:paired"`) given a bare `paired` HDCA is not rejected at input validation. The run fails later in output collection building with a 400 "must be a sub-collection of type 'paired'" (no collection/dataset left in the history). Other tools would instead run on the wrong structure (e.g. a `list:list` HDCA directly into a `list`-only input) — check what happens for a regular command-line tool (wrong `$input` structure in the cheetah template) and for DB-operation tools.

## Expected

API rejects with a 400 at parameter validation: "collection of type X not accepted by input Y (accepts ...)", same rule as the form (`HistoryQuery.direct_match`, `model/dataset_collections/query.py` ~58-67). Map-over submissions (batch values with `map_over_type`) already go through `can_map_over`.

## Considerations

- Workflows: does workflow invocation go through the same `from_json`? Workflow map_over logic (`workflow/map_over.py`) checks `direct_match` first; confirm whether invalid direct connections can reach a job.
- `sample_sheet` accepted by `list` inputs (`accepts`) — keep.
- Back-compat: API clients relying on lax acceptance (unlikely to be intentional).

## Tests

API: submit a `paired` HDCA directly to a `list`-only tool (e.g. a test tool with `collection_type="list"`) → expect 400 at submission, no job created. Update `test_nest_does_not_offer_paired_input_1_1_0` on the #24303 branch (if merged) to expect the earlier rejection.
