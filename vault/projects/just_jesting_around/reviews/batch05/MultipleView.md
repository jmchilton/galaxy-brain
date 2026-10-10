# MultipleView review — iteration 05

Selected originator: `client/src/components/History/Multiple/MultipleView.test.js`.

Baseline and final: 6 cases, 16 assertion statements. All original conditions survive: eight histories hide the oldest current history while showing switch/select controls and the four-history title; three histories show the current history; the load-more control appears for eight and disappears for three; one click changes four→eight and hides it; two clicks change four→eight→twelve, preserving intermediate visibility and titles.

Uses the existing `getFakeHistorySummary` and registered-user factory, explicit native `global` plugin/stub configuration and automatic unmounting. Fixed, ascending update timestamps make the first history unambiguously oldest rather than depending on the clock or equal-date sorting. Removed comments narrating the assertions and named the first two conditions precisely. Keeps `mount`: current/switch buttons and load-more behavior live in the actual child components, so shallow stubs would lose the tested rendering.

Reuse search: other history components already consume the shared summary/user factories; no new wrapper abstraction improves their different child boundaries. No supporting migrations originate here. Existing guidance covers these improvements; no README addition or marginal advice proposed.

Validation: the 11 affected client suites pass 63 cases, including all 6 here; scoped ESLint passes. Root performs final combined checks and type checking.

Coverage note (2026-10-10), not fixed: `userTagsStore.ts` fell from 23/3 to 18/2 lines/branches in this test. The lost code is the "no new tags" path of `onMultipleNewTagsSeen` after `until(dbLoaded)`; base reached it only because its slower test let the IndexedDB load finish before unmount (a 200ms sleep restores it). Nothing visible depends on it; a `userTagsStore` unit test is the right place if it should be covered.
