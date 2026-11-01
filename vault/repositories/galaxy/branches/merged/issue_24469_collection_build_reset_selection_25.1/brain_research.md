```yaml
documents:
  - path: vault/repositories/galaxy/issues/queued/24469/debrief.md
    why: Prior research on the bug (confirmed on dev and 26.2; double created-collection emit is harmless; only other consumer is FormDataWorkflowRunTabs.vue). Open items - rules-builder reset-selection loss, test_collection_builders.py never checks selection.
    load_when: Scoping the fix and tests.
  - path: vault/repositories/galaxy/issues/queued/24469/issue_draft.md
    why: Filed issue text with proposal (restore handler emitting reset-selection + update:show-selection false) and test ideas (Selenium selection-mode check, vitest on SelectionOperations).
  - path: vault/research/PR 19377 - Collection Types and Wizard UI.md
    why: Introduced Auto/Advanced Build List and ListWizard.vue (/collection/new_list); the path that currently never resets history selection.
    load_when: Deciding whether ListWizard completion should also reset selection.
  - path: vault/repositories/galaxy/branches/merged/library_collection_selected_history_26.1/index.md
    why: Recent branch touching the same ListWizard / selection-to-builder flow (history-id handling); possible conflicts or reusable test helpers.
    load_when: Touching ListWizard.vue or the collectionBuilderItemsStore.
  - path: vault/repositories/galaxy/branches/active/selenium_collection_build_convert/index.md
    why: Recent Selenium additions to test_collection_builders.py and navigates_galaxy builder helpers; a selection-mode assertion should follow those conventions and may textually conflict.
    load_when: Writing the Selenium test.
  - path: vault/research/Component - E2E Tests - Writing.md
    why: Selenium/NavigatesGalaxy/navigation.yml conventions for a new selection-mode assertion (existing selector history_panel.selection_count).
    load_when: Writing the Selenium test.
  - path: vault/projects/playwright/training_findings/26.2/faqs/galaxy/collections_autobuild_list.md
    why: Live observation of the bug ("2 of 1 selected" with hidden sources) and the GTN workaround step.
    load_when: Reproducing; not needed for implementation.
research_requests:
  - vault/agents/gx_research/todo/history_panel_selection_and_collection_builders.md
```

## Gaps and code notes (non-YAML)

- No vault note covers history-panel selection state or SelectionOperations event wiring; requested above.
- Code (release_25.1): `SelectionOperations.vue` L146 binds `@created-collection="createdCollection"` (no method) on `CollectionCreatorIndex`, which is only rendered for `buildDatasetListAll` (selection undefined, so nothing to reset on that path). Auto/Advanced Build List (`listWizard()`, ~L302) copies selection to `useCollectionBuilderItemSelection` and routes to `/collection/new_list`; `ListWizard.vue` only sets `collectionCreated` (L160) and has no link back to HistoryPanel selection. Parent `HistoryPanel.vue` (components/History/CurrentHistory/) handles `@reset-selection` -> `resetSelection` and `@update:show-selection`. A fix for the primary repro therefore needs a reset at `listWizard()` time (emit `reset-selection` / `update:show-selection` false when routing) or a store/event signal from ListWizard completion; restoring only `createdCollection` would not fix Auto/Advanced Build List.
- Existing unit tests: `SelectionOperations.test.js` already asserts `update:show-selection` emission pattern (~L231-242); extend it for the new emit.
- Selenium: `test_collection_builders.py` lacks any post-build selection check; helpers `history_panel_build_list_auto/advanced` in `lib/galaxy/selenium/navigates_galaxy.py` (~L2309), selector `history_panel.selection_count` (navigation.yml ~L855).
