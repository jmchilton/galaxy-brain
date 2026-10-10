# ActivityItem

Selected originator: `client/src/components/ActivityBar/ActivityItem.test.js`. Baseline **2 tests** → final **8 tests**.

The two tests shared one `beforeEach` wrapper. The "rendering" test chained five `setProps` steps through title, icon, progress visibility, colour and width. They are now separate cases, each mounting through `mountActivityItem(props)`, which keeps the original default props and overrides only the one under test. A `SELECTORS` constant names the item, icon, indicator and progress elements. `enableAutoUnmount(afterEach)` cleans up wrappers; nothing unmounted them before. The testing Pinia goes in through `withPlugins`, and the `FontAwesomeIcon` stub moves under `global.stubs` instead of relying on the VTU v1 adapter to relocate a top-level `stubs`. `mount` stays: the title and progress bar render inside Popper's `reference` slot, which a shallow stub does not render.

Preserved, with identical expected values:

- title text and the `activity-test-icon` stub
- no `.progress` without a status
- `.progress` and `.bg-success` for `success`; `.bg-danger` and no `.bg-success` for `danger`. Each status is now its own `it.each` row mounted directly with that status, not reached by switching from success to danger. The success row also checks there is no `.bg-danger`, which is new.
- bar width `0%`, then `50%` after `setProps({ progressPercentage: 50 })`. This case keeps the in-place update.
- no indicator at `0`; indicator present showing `1` for 1, and `99` for 1000. Each count is now its own mount.

Reuse: `getLocalVue` and `withPlugins`, following `WorkflowInvocationStepHeader.test.ts` for adding stubs on top of `localVue.stubs`. No other test mounts ActivityItem, so no shared helper.

Validation: 8 tests pass shuffled (seed `290101`, `NODE_OPTIONS=--no-webstorage`). Scoped ESLint and Prettier pass; full client `vue-tsc --noEmit` passes.

Guidance: none.
