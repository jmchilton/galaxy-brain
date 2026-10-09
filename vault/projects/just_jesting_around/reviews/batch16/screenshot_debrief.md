Screenshots not relevant for this change.

Read [Component - E2E Tests - Writing](../../../../research/Component%20-%20E2E%20Tests%20-%20Writing.md), including screenshot capture, transition waits and browser fixture guidance. Iteration 16 changes ten selected client unit-test files, the supporting GenericItem suite and a test-only visibility observer. It changes no Vue component, production script, stylesheet, browser test, navigation selector or screenshot baseline; there is no altered application rendering to capture.

The tests retain meaningful rendering boundaries: real clarification and action children where their events are tested, real object-store fields and submission children, real numeric inputs, real workflow card interactions, and the URI element renderers. The shared observer continues to report immediate visibility in test mounts so the existing tabular scroll and history refresh contracts can run; it does not affect application browser observation or geometry.

No browser run or screenshot artifact is required. There is no screenshot blocker.
