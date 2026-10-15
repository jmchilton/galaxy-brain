Polished the invocation rerun lineage E2E test with condition-based screenshot waits, portable href assertions, state-aware grid navigation, and useful card/grid captures; the final Playwright run passed.

Reviewed `GX_PROCESS_POLISH_E2E_TESTS.md`, “Component - E2E Tests - Writing”, and “Component - E2E Tests Smart Components” against `TestWorkflowRun.test_workflow_rerun_lineage` and its `navigation.yml` targets.

- All added element selectors live in `navigation.yml`, including parameterized invocation card badges, grid Run type cells, and the rendered overview graph. No inline CSS selectors or arbitrary sleeps were introduced.
- Added explicit rendered-graph and history-dataset readiness waits before detail screenshots. The shared `scroll_into_view` helper exposes Run type before the grid capture.
- The simple and expanded flows share a loop and existing workflow/navigation helpers. The test exercises I → J through the simple form and J → K through the expanded form, refreshes each rerun, and follows source/latest links in both directions.
- Coordinated challenge fixes normalize relative and absolute hrefs with `urljoin`, open the grid from the already-open activity panel, and read grid cells after presence rather than visibility because the original Run type is intentionally empty. Assertions still require two Rerun values and a blank original value.
- Six screenshots cover both rerun results, both source details, invocation-card badges, and grid markers. Every final image was visually inspected; see `screenshot_debrief.md` for the index and archived partial attempts.

Final validation: **1 passed** in **107.84 seconds** using headless Playwright against the isolated task servers. One unrelated Google GenAI deprecation warning. Final log: `/tmp/issue24174-screenshot-e2e-final3.log`. No further polish changes are required.
