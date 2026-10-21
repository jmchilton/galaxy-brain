- `kind/bug` — a dataset-only or collection-only drop onto a Multiview column didn't refresh it (`historyDragDrop.ts`, since 24.1.2). The per-column test hooks and copy helper ride along as the regression test's prerequisite.
- `area/UI-UX` — the target column now shows dropped items.
- `area/testing/selenium`

The labeler also adds `area/client` and `area/testing`. Drop `area/testing`; `area/testing/selenium` covers the E2E test. `area/client` can stay for the composable fix.
