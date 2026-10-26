# Debrief: collection_build_leaves_stale_selection

## Research
- Confirmed on `origin/dev` and `origin/release_26.2`: `SelectionOperations.vue` L163 binds `@created-collection="createdCollection"` and no such method exists.
- 08410e96e57 (John, 2025-01-06) removed the method; first tag v25.0.0.
- Parent `HistoryPanel.vue` still handles `@reset-selection`, so only the child emit is missing.
- `update:show-selection` false matches `onStorageOperationCompleted` / `runOnSelection`.
- `CollectionCreatorIndex` emits `created-collection` twice (on create and on ready). A second reset is harmless.
- Other creator consumer: `FormDataWorkflowRunTabs.vue` only.
- No duplicate issue or PR found via gh search.

## Rewrite
- Restructured to GX_ISSUE_DESCRIPTIONS form: repro opener, Context, code in details, Proposed + Alternative Approaches.
- Reviewer subagent (one round) agreed with the premise. It added notes on the parent listener and the double emit.

## Unresolved
- "2 of 1 selected" seen in the Playwright FAQ loop. Not re-reproduced during this review.
- 08410e96e57 also dropped a `reset-selection` emit in the rules-builder path. Whether a current equivalent exists is unchecked.
- The claim that `test_collection_builders.py` never checks the selection afterwards was not closely verified.
