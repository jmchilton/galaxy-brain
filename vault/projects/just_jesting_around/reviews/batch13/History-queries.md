# History-queries: accepted

Originator: `client/src/components/History/model/queries.test.ts`. Cases: **9 → 9**, all passing, no skips.

API successes now assert the complete typed response instead of non-null assertions followed by scattered selected-field checks. The preview and execute handlers verify the actual history ID and JSON bodies already named by the tests. Watchers created by the four existing cases are tracked locally and stopped after each case, including the nonterminal pending case. Names distinguish a completed run with failed items from a run whose own state is failed, and avoid claiming an unasserted polling-stop behavior.

Original preview snapshot/eligible/ineligible counts, 404 rejection, execute pending run ID/state, snapshot-expired rejection, run-status failed count, initial null/nonterminal state, latest pending/nonterminal state, completed successful/terminal state, failed-items/terminal state, and completed-run failed count remain. The fixture bodies and all original request inputs are unchanged. Complete-response equality includes the old field checks and the item's state/reason, successful byte count, and run metadata. Added request assertions check move mode, target other, empty items; and snapshot ID, default skip-ineligible policy, completion notification.

Reuse: the existing storage-operation run factory remains. A local createRunWatcher helper only registers instances for teardown, with endpoint response fixtures visible in each scenario. No second consumer calls this same set of query functions and watcher contract, so no shared helper or supporting changes.

Existing cleanup, typed API mocks, and descriptive-name principles cover the changes. No new advice proposed.

Validation: the selected baseline is `/private/tmp/jest_readability_batch13_baseline.json`. The final assigned-suite run in `/private/tmp/jest_readability_batch13_history_final.json` passes all **75 cases across five suites**, with shuffled seed `130059`, no skips or failures. Scoped current ESLint (zero warnings) and Prettier pass. Full client typechecking and independent reviews are owned by the driver. No production changes.
