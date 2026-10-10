# ErrorBanner

Selected originator: `lib/tool_shed/webapp/frontend/src/components/ErrorBanner.test.ts`. Baseline and final: **9 tests**.

Every test repeated a four-line `mount(ErrorBanner, { props: { error } })` and a `find("button")` / `trigger` / `flushPromises` sequence. Those are now `mountBanner(error)` and `clickDismiss(wrapper)`. The `[role="alert"]` selector is a single `BANNER` constant. The no-op `vi.clearAllMocks()` is gone, since the file has no mocks. `enableAutoUnmount(afterEach)` follows the sibling Tool Shed suites such as `ResetMetadataTab.test.ts`. The extra `nextTick`/`flushPromises` after `setProps` are dropped, because `setProps` already awaits the re-render in which the `error` watcher re-shows the banner. Comments that narrated each step are replaced by names that state the behaviour. The two "edge cases" move under "rendering".

Strengthened:
- The special-characters case only checked that `"Error:"` and `"quotes"` appeared somewhere. It now asserts the full message is shown as literal text and that no `<script>` element was rendered. That was the intent of its "Vue escapes HTML" comment.
- The emit case's `toBeTruthy()` plus `toHaveLength(1)` became `toEqual([[]])`: exactly one `dismiss`, with no payload.

Preserved: every message string, the empty-error case, banner presence and `aria-live="assertive"`, the `"Dismiss"` button text, hide-on-dismiss, re-show after dismissal with `"Second error"`, and replacing `"Initial error"` with `"Updated error"`, including the `not.toContain` check.

Reuse: none applicable. The Tool Shed frontend has no shared mount helpers, and `MetadataInspector/test-utils.ts` holds MetadataInspector stubs. A single-button banner does not need the button-finding helpers of `ResetMetadataTab.test.ts`.

Validation, from `lib/tool_shed/webapp/frontend/`: 9 tests pass shuffled (seed 260101), ESLint (`--max-warnings 0`) and Prettier pass, and `pnpm typecheck` is clean. Client `vue-tsc --noEmit` is also clean.

Guidance: none.
