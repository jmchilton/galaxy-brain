# states

Selected originator: `client/src/components/History/Content/model/states.test.js`. Baseline **1 test** → final **16 tests**.

The single loop test ("check if all reduced states exist and have a status set") becomes `it.each(HIERARCHICAL_COLLECTION_JOB_STATES)`, one named case per job state (7). A missing state used to fail with a `TypeError` on `undefined.status` and stopped at the first gap; now each state reports separately, and `toHaveProperty([state, "status"], expect.anything())` names the missing path. `expect.anything()` keeps the original `toBeDefined` strictness (an explicit `status: undefined` still fails). Checking `"text"` instead fails for `failed`, so the assertion can fail. The unneeded `async` is dropped, and the describe is named after the `STATES` export.

Added: the same check over `HIERARCHICAL_COLLECTION_DATASET_STATES` (9 cases). `getContentItemState` reduces collections to those states too, and nothing else tested them. This is the only new scenario.

Kept as `.js`, not renamed to `.ts`, to keep the originator commit to a single file.

Reuse: none applicable.

Validation: 16 tests pass shuffled (seed `240101`); scoped ESLint and Prettier pass; full `vue-tsc --noEmit` passes.

Guidance: none.
