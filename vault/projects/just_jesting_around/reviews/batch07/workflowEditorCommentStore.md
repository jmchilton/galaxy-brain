# Workflow editor comment store

Selected originator: `client/src/stores/workflowEditorCommentStore.test.ts`.

One validation test embedded twelve independent outcomes across four comment types and three data shapes. Replace it with named parameterized cases: text without size, empty data, and text with size, each checked against freehand, text, markdown, and frame requirements. Each case gets a fresh Pinia through existing `setupTestPinia()` and the same four typed input comments. The accepted-types column states the expected contract explicitly; the assertion branch follows that expectation rather than the returned result.

Keep all twelve original validation outcomes: markdown accepts text alone; every type rejects empty data; text and markdown accept text plus size; freehand and frame reject both text shapes. These now produce twelve individually reported cases instead of one. They retain the original text values and size 2, and all invalid inputs must still throw `TypeError`.

Behavior names now explain color/input independence, clearing creation metadata on reset, assignment to an inner frame, and the selection/deselection/toggle/clear sequence. The five typed comment fixtures and mocked step positions/bounds remain unchanged: they are the geometry under test, so their coordinates, sizes, IDs, and contents should stay visible. Production copies comments with `cloneRaw`, so these shared input constants are not mutated by store actions.

All 43 original executed assertions remain represented. The twelve validation assertions moved into the parameterized cases; all other assertions and action sequences are unchanged, including freehand bounds, stored and original colors, pre/post-reset metadata and highest ID, inner/outer frame membership and exclusions, and every intermediate selection state. The suite expands from 7 to 18 cases, without adding or removing coverage outcomes.

No new shared helper or supporting migration is warranted. The existing Pinia helper removes the repeated infrastructure setup; these particular comment coordinates describe the local containment scenario and are not generic defaults for another suite.

No README addition or marginal advice is proposed. Existing guidance already addresses independent cases, parameterized combinations, and keeping domain inputs visible. The improvement applies that guidance directly.

Validation: focused Vitest results in `/private/tmp/jest_readability_batch07_stores_results.json`; scoped ESLint with `--no-ignore --max-warnings 0` and Prettier checks passed. Driver performs combined typecheck and independent review.
