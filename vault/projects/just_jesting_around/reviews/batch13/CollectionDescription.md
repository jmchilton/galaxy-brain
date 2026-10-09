# CollectionDescription: accepted

Originator: `client/src/components/History/Content/Collection/CollectionDescription.test.ts`. Cases: **2 → 13**, all passing, no skips.

Thirteen independent description variants now have descriptive table rows. Each row still starts from a fresh null-count/no-datatype collection and calls `setProps` before asserting its exact text, retaining meaningful prop-update coverage. The existing `getFakeCollectionSummary()` replaces a handwritten full HDCA fixture. Shallow mounting isolates description rendering; none of the original assertions involved progress children. Every wrapper automatically unmounts.

All original type/count/datatype inputs and expected strings remain: heterogeneous txt/csv/tabular list with one dataset; empty datatypes for pair/count2, list/count10, list:paired/count10, list:list/count10, and other/count10; homogeneous tabular list/count1 and the same pair/list/nested-list variants plus paired:paired/count10 and other/count10. The increased case count only splits existing assertions.

Reuse: the canonical collection factory is already shared by other reviewed suites. No new fixture abstraction is needed, and no supporting edit is warranted merely to migrate unrelated consumers.

Existing guidance already covers tables, fixture reuse, shallow mounting, and cleanup. No new advice proposed.

Validation: the selected baseline is `/private/tmp/jest_readability_batch13_baseline.json`. The final assigned-suite run in `/private/tmp/jest_readability_batch13_history_final.json` passes all **75 cases across five suites**, with shuffled seed `130059`, no skips or failures. Scoped current ESLint (zero warnings) and Prettier pass. Full client typechecking and independent reviews are owned by the driver. No production changes.
