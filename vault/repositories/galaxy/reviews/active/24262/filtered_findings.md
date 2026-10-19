# Filtered findings: galaxy#24262

- **gx_test_challenger P3 2: the newest-load guard is hand-rolled again in `WorkflowList.vue`.** Filtered because it is not actionable within this PR. The PR copies the established `HistoryList.load` `loadGeneration` pattern exactly. A shared "latest call wins" helper would mean refactoring `genericTaskMonitor.ts` and `resourceWatcher.ts`, which this PR doesn't touch. The reviewer also called it optional.
- **default P3 1, second half: a list load in the middle of a save shows stale tags until the queue drains.** Not a separate finding. The reviewer called it acceptable because it happens so rarely (lists reload only on user actions). Only the `sameTags` simplification was kept, as P3 1.
