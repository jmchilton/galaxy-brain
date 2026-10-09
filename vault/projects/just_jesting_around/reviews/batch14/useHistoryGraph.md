# Reactive history graph

Originator: `client/src/components/History/Graph/useHistoryGraph.test.ts`. Cases: **12 → 12**.

Rename the effect-scope wrapper to distinguish it from the real composable, and give it fresh default seed refs. Scenarios specifying seeds or a changing history ID keep those inputs visible. Expose the mocked loading/error refs so the return-shape case checks dependency identity rather than constructing an unrelated computed ref.

Preserved empty node/edge/execution arrays, non-truncated default, four mixed node sources and the exact two execution IDs, capped truncation, `hda:d-7` focus encoding, missing-source/missing-ID transitions, both update-time transitions with their refetch counts, SSE disabled/owned/non-owned scenarios, unsubscribe `h1` and subscribe `h2` on ID change, and all nine public return keys. The existing scope stop after each test still disposes watchers and viewer subscriptions. Identity checks now cover history, loading, error, and refetch.

Reuse: the composable has no mounting/injection requirement; retain the local effect scope and mocked dependencies. Existing history factories describe full API summaries, whereas these refs intentionally contain only watched fields, so a factory would add unrelated data. No repeated multi-file graph setup needs a shared abstraction. Existing guidance is sufficient; no new guidance or marginal advice proposed.

Validation: all four owned suites pass **27/27**, with zero skips under shuffled seed `140041` (`/private/tmp/batch14_graph_tests.json`). Scoped ESLint, Prettier, and whitespace checks pass. The driver performs full-client typechecking and combined batch validation.
