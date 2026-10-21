# Test challenges debrief (round 2, re-harden): #24303 `type_prefix`

Process: `vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md`. Head went from `8e5ae068ddf` to `c2b64d54901` (13 commits, not pushed). One fixup was folded into "Resolve sliced type_source type in subworkflow editor export" (`3d257117fe9`) by a non-interactive autosquash. The baseline commit `2e0c137cfe9` and every commit below the re-scope commit are unchanged. No messages were reworded. `git diff 8e5ae068ddf HEAD` touches 2 test files: +9/−14.

Round 1 (`earlier_drafts/1/test_challenges_debrief.md`) is still valid for every test outside the re-scope commit. Since `3cb5777162b`, those tests have changed in one way only: the legacy linter test was removed along with the legacy form. I re-checked them and found nothing new.

## Red check of the re-scope tests (observed)

Method: I restored `workflows.py` from `95de0d86251`, the commit just before the re-scope, and ran the tests.

**Before my changes:**
- **`test_subworkflow_type_source_map_over_type`:** 4 of 6 cases went red. Two passed:
  - `paired → list:paired`. It duplicates the API test `test_export_editor_subworkflow_collection_type_prefix`.
  - "Unmapped source, other input mapped". This one is red against `origin/release_26.2`, because base ignores the prefix.
- **API `..._collection_type_source_other_input_mapped`:** green on pre-fix code and on base. The re-scope already noted this.
- **API `..._collection_type_prefix_mapped`:** red.

## Changes

1. **Unit `test_subworkflow_type_source_map_over_type`:** dropped 2 of its 6 cases.
   - `paired → list:paired` duplicates the API test `..._subworkflow_collection_type_prefix`.
   - `list:paired + prefix → list:list:paired` duplicates the API test `..._prefix_mapped`.
   - Four cases remain. Each one covers something the API layer doesn't: the unmapped-source guard, "other maps deeper", `paired_or_unpaired`, and `sample_sheet`.
2. **API `..._other_input_mapped`** (not red) is replaced by `test_export_editor_subworkflow_collection_type_source_mapped`.
   - It feeds `list:paired` into the existing `collection_type_source_map_over` tool, which uses plain `type_source` with an input of `list,paired`.
   - It expects `list:paired`. Pre-fix code returns `list:list:paired`, and I observed it going red at its own assertion.
   - Before this change, nothing at the API level pinned the plain `type_source` part of the bug.
3. **Strengthened `test_subworkflow_map_over_type`.** It now pins the `get_step_map_over` side effects claimed in the commit message:
   - `list:paired` into `paired_or_unpaired` maps over `list`;
   - `sample_sheet` into `list` is a direct connection.
   - Both cases are red on pre-fix code.

## Not changed / why

- **Unit fixtures:** dict step fixtures follow the existing `_input_step`/`_output_step` pattern. There are no mocks beyond the existing `MockTrans`.
- **Testing `_input_map_over` directly:** it is private, and testing it would test the implementation. `_resolve_collection_type` is already the seam that the existing tests use.
- **API helpers:** the export tests use the existing `_upload_yaml_workflow`/`_download_workflow`.
- **E2E:** none is needed. The fix is server-side export only, and vitest covers editor typing.
- **`collection_semantics.yml`:** none of the touched tests is linked from it.

## Results

- **Unit tests:** 612 passed. Ran `test_modules`, `dataset_collections/`, `test_parsing`, `test_tool_linters`, `test_yaml_parameters`, `test_user_tool_source_response` and `test_collection_semantics`.
- **API:** `test_workflows.py -k test_export_editor_subworkflow_collection_type` passed 4/4, in one serial run.

STATUS: READY
