Screenshots not relevant for this change.

Compared with `61c44ce5a05f0b70021010ba7d937c25690c1558`, iteration twelve changes fifteen client unit-test files only. It changes no production Vue component, drawing implementation, style, route implementation, browser navigation selector, Selenium/Playwright test, or screenshot baseline.

Reviewed the shared screenshot process and the vault references *Component - E2E Tests - Writing* and *Component - E2E Tests Smart Components*. Relevant existing browser captures include workflow-editor collection inputs and subworkflow/tool upgrades in `lib/galaxy_test/selenium/test_workflow_editor.py`, plus page-editor/embed-workflow captures in `lib/galaxy_test/selenium/test_pages.py`. These screens render the unchanged application; the adjusted Vitest fixtures, modal mounts, canvas spies, and memory-router cases cannot alter their screenshots.

The process requires new capture when the change alters a screen or relevant E2E screenshots. Neither condition applies to this iteration. No screenshot capture, browser run, wait/selector change, or screenshots directory is needed. There is no screenshot blocker.
