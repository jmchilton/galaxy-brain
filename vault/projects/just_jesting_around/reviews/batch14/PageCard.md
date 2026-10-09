# PageCard review — iteration 14

The suite now has one local mounting function with fresh LocalVue, an explicitly installed testing Pinia, and automatic unmounting. It renders the real GCard because the existing contracts concern its title link, badges, and action controls. A selector map replaces the branching selector function. View and Edit action checks are independent cases, and emitted events are checked exactly.

All original inputs and actions remain: `page-1` / `My Analysis`, its `Edit Notebook` title and title click, the empty-title `page-2` fallback, the update-time badge, one revision, and both action clicks. The literal `1 Revision` expectation replaces an expression computed from the fixture, preserving the original one-revision input while making the expected output visible. Page input is copied with a fresh revision array.

Existing reuse: the adjacent shared fixture now delegates to `getFakePageSummary`, retaining every original value. Its other consumer, HistoryPageList, is unchanged and validated as supporting work. No new helper API is necessary.

Validation: 5 passing cases (4 original cases; the two independent action checks are split), 0 skips, shuffled seed 140047. Scoped ESLint with zero warnings, Prettier, and diff whitespace checks pass.

Guidance: existing README instructions cover named scenarios, factories, deliberate real-child rendering, mount helpers, emitted events, and cleanup. No worthwhile missing guidance or deferred abstraction was found.
