Reviewed `client/src/components/TagsMultiselect/HeadlessMultiselect.test.ts`: retain all 12 existing cases.

The mount helper supplies the common six options and empty selection, leaving selection and validator differences visible at the call site. Mounts use inferred component props without a broad cast and fresh `getLocalVue()`. Awaited Vue Test Utils events replace unawaited dispatch plus manual `nextTick`; the keyboard helper still sends both keydown and keyup. Its type requires only the public `trigger` method, accepting Vue Test Utils `get()` results without a cast. Option queries use this test's app root, and automatic unmounting runs before removing the root.

Preservation: real Teleport and focus remain active. Popup open/close, search values `a`, `na`, empty, `bc`, and `123`, counts 5/4/6, search option ordering, all highlighted-value transitions, validator states, keyboard and mouse selection/deselection, emitted array order, and adding `123` remain unchanged. Invalid markup assertions now inspect the actual option instead of whether a DOM query throws.

Reuse: existing `emittedArg`, `nth`, and `getLocalVue` continue to serve the suite. Root creation is tied to this component's real teleport/focus contract; no second consumer justifies a shared helper. Existing lifecycle/async guidance already covers the changes; no new guidance is proposed.

Validation: 36/36 cases pass across the three assigned suites, zero skipped, shuffled seed `140037` with `NODE_OPTIONS=--no-webstorage`. Scoped ESLint (`--max-warnings=0`) and Prettier pass. Full client typechecking is coordinated by the driver.
