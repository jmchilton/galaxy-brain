Reviewed `client/src/components/Common/SidebarList.test.ts`: retain all 20 existing cases.

The mount helper derives its overrides from the component's props and mounts without an `any` cast. Automatic unmounting closes each test's component lifetime. Existing `nth` replaces non-null indexed access; emitted event tuples read as complete contracts, including the mouse event and the Enter keyboard event.

Preservation: all three original items and indices, default/custom loading and empty messages, mutually exclusive states, scoped slots, click/Enter/Space actions, emitted item/index/count, role/tabindex checks, and object/string class variants remain. The Enter event type check strengthens its existing item/index checks.

Reuse: the existing `nth` helper removes ambiguous indexing; these three simple items need no domain factory. No shared abstraction or README gap was found.

Validation: 36/36 cases pass across the three assigned suites, zero skipped, shuffled seed `140037` with `NODE_OPTIONS=--no-webstorage`. Scoped ESLint (`--max-warnings=0`) and Prettier pass. Full client typechecking is coordinated by the driver.
