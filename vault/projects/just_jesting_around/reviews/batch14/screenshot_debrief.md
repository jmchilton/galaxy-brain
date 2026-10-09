Screenshots not relevant for this change.

Read [Component - E2E Tests - Writing](../../../../research/Component%20-%20E2E%20Tests%20-%20Writing.md), including its screenshot and snapshot recording guidance. Iteration 14 changes ten client unit-test suites and their existing PageEditor fixture source. No Vue template, production script, CSS, navigation selector, E2E test, or screenshot baseline changes, so the application has no altered rendered state to capture.

The SidebarList and HeadlessMultiselect checks still exercise rendered controls; the latter keeps real teleport and focus. MarkdownVitessce config mapping keeps its real alert output and validates the renderer's config prop. These test-harness changes do not introduce new UI behavior. The pre-existing invocation-parameter mismatch is recorded in the Markdown review and is outside this implementation.

No browser run or screenshot artifact is needed. There is no screenshot blocker.
