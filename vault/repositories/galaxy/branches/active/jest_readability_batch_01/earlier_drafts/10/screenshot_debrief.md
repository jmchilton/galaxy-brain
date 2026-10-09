# Screenshots not relevant for this change

Iteration 05 changes 24 unit-test suites and three test-only helpers against `2dbcc3703c61c058598fe50d14fba2623bd3329f`. It changes no shipped Vue component, rendering logic, style, route, navigation selector, E2E test, or existing screenshot capture. The mounted components in these unit tests render existing behavior with test fixtures; their test-specific metadata JSON-viewer stub is not shipped UI.

Read the shared screenshot process and `vault/research/Component - E2E Tests - Writing.md`. The requirement to find or add captures applies when changed UI can be observed by existing browser tests. There is no changed application behavior or appearance to record here. A source-diff check over Vue/CSS/SCSS/navigation/Selenium/Playwright/screenshot paths returned no modifications.

For the supporting HistoryExportWizard fixture migration, existing `lib/galaxy_test/selenium/test_history_export.py` already records format, destination, download-options, preparation, and ready states. Those tests and the corresponding application components are unchanged; the unit fixture factory preserves the existing POSIX and Zenodo scenarios. Running them would capture the same shipped behavior and would not validate this readability change.

No E2E or screenshot modifications, browser runs, generated images, or screenshots directory are required. No screenshot blocker was encountered.
