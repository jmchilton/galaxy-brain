Screenshots not relevant for this change.

Reviewed the shared screenshot process and [Component - E2E Tests - Writing](../../../../research/Component%20-%20E2E%20Tests%20-%20Writing.md), including its distinction between failure-only snapshots and explicit screenshots captured with `GALAXY_TEST_SCREENSHOTS_DIRECTORY`.

Iteration 08 changes ten selected unit-test suites, two supporting suites, and two test helpers relative to the reviewed baseline `7c2738f4644b7b0f6923d9a2e6654349210e81b8`. Production Vue templates, component logic, CSS, navigation selectors, assets, and E2E tests are unchanged in this iteration. Mounted component and directive test arrangements exercise existing behavior; their fixture and assertion changes do not alter the deployed UI.

Existing browser tests cover adjacent tool-panel and export views, including `lib/galaxy_test/selenium/test_edam_tool_panel_views.py`, `test_tool_panel_search.py`, and the explicit history-export screenshots in `test_history_export.py`. There is no changed visual state to capture for this iteration, so no E2E modification or screenshot run is required. No screenshots were created, and there is no screenshot blocker. Earlier iteration screenshot evaluations remain the record for earlier changes on this branch.
