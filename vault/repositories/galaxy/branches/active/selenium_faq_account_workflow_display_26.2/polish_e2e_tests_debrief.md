Fresh E2E polish replaced the catalog path's remaining raw Visualize-tab selector with its existing navigation target and confirmed shared helpers, observable waits, semantic hooks and seven screenshot capture sites cover the expanded scope.

<details>
<summary>Full polish review</summary>

Read `GX_PROCESS_POLISH_E2E_TESTS.md` and the E2E Writing and E2E Smart Components notes. Reviewed the complete expanded branch diff and its touched tests/helpers afresh.

## Change made

`show_dataset_visualizations()` now calls `self.components.dataset_view.visualize_tab.wait_for_and_click()` instead of embedding a CSS selector and performing a separate wait/click. The existing `dataset_view.visualize_tab` navigation target contains exactly the selector that the helper previously duplicated. Both catalog tests and existing visualization consumers now reuse the same target. Removed the redundant Find-and-click comment with the raw selector.

Committed as `2f95abc74ce` (`Reuse dataset Visualize navigation target in browser helper`). This is an abstraction-only refactor with unchanged selector and waiting behavior; no test methods or assertions changed.

## Checks and retained choices

- New catalog label/link traversal uses selectors from navigation.yml, scoped to each application item; Python tests do not embed CSS/DOM selector strings for these operations.
- Both modern and legacy display entries have matching semantic data-description hooks. The outer readiness marker requires the requested dataset identity, distinguishing successful empty data from provider loading/failure/stale data. No additional DOM decoration is justified.
- Refresh, profile navigation/save, reset request, workflow tags, Best Practices and catalog inspection live in NavigatesGalaxy. Existing consumers reuse those helpers; no duplicate test-local abstraction remains in the changed paths.
- Workflow tagging delegates to the existing tagging abstraction and obtains its scope from the navigation target. Its final persisted-tag assertion uses a transition-aware retry.
- Profile changes wait for rendered Preferences and input state rather than the removed fixed sleeps. All newly added helpers and changed test bodies are free of fixed sleeps. Untouched neighboring test cases retain their prior timing behavior; changing them is outside this extraction.
- Catalog inspection waits for the provider-backed readiness marker, then reads all entries. This intentionally supports an empty collection without waiting for a nonexistent first item.
- Storage Refresh waits for recalculation feedback, reset request waits for the result alert, and Best Practices waits for its panel sections.
- Further client refactoring is unnecessary for this release_26.2 extraction. The existing component is adequately observable with the added hooks and successful-load marker.

## Screenshot coverage

All newly covered component states have capture calls after reaching/asserting their relevant state:

| State | Screenshot name |
| --- | --- |
| Storage Refresh feedback | `storage_dashboard_recalculating_disk_usage` |
| Workflow editor tags | `workflow_editor_tags` |
| Populated display catalog | `dataset_display_application_links` |
| Loaded empty display catalog | `dataset_display_application_links_empty` |
| Password reset request result | `password_reset_request_result` |
| Persisted public name | `manage_information_public_name_saved` |
| Best Practices input metadata warning | `workflow_editor_best_practices_input_metadata` |

Screenshot generation and visual inspection are the coordinator's subsequent dedicated stage. No screenshot artifact is claimed as newly captured by this polish task.

## Verification

Black check and `git diff --check` passed. The standalone `.venv/bin/ruff` executable was absent; the commit's configured Ruff hook passed, alongside Black, Flake8, Prettier and the other applicable precommit checks. No new standalone test was added for this selector deduplication. No browser run was started while the coordinator's Selenium process was active. The unchanged selector and subsequent planned screenshot/browser runs cover this refactor without a competing process.

</details>
