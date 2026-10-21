# Helpers and fixtures with their first consumers

The earlier history rewrite treated all non-test files as infrastructure. This correction keeps guidance or framework setup first and introduces test support with the test that first uses it. Existing branches remain complete; no domain branches or new PRs were created.

| Lane | Opening commit | Support moved to consumers |
| --- | --- | ---: |
| `vitest_readability` | [README guidance](https://github.com/jmchilton/galaxy/commit/9f0e88c2bd6359e5efc09c15dd8f8a70e102ccb1) | 32 paths |
| `vitest_stories` | [Storybook framework (18 paths)](https://github.com/jmchilton/galaxy/commit/a77751a33d0957fd52bad23fbc780f64d0ed715c) | 41 paths |
| `vitest_story_play` | [Play/accessibility framework (5 paths)](https://github.com/jmchilton/galaxy/commit/9784684e2811d8d01de67cc2751f111059dc5cd3) | 3 paths |

Each opening commit is followed by the existing example (parseBool or GDropdownItem), then the remaining per-test commits. Independent exports from one helper module can arrive in different commits. Their required private declarations and imports arrive together, existing APIs remain until callers migrate, and helper-specific README passages accompany the relevant introduction. The completed accessibility audit and its README link arrive with the last play conversion.

The notification factories illustrate why intermediate checks matter: changing to fixed IDs while retaining the old list generator produced duplicate IDs and collapsed ten rows to two. The factories and list generator now change atomically in the first consuming test commit; their existing public API remains in use by the unconverted list tests.

## Verification

- All five final Git tree IDs are identical to the preceding published heads, preserving every final file and assertion. Real-API and churn branches retain their own commit trees, raw messages and author/committer metadata atop the rewritten readability parent.
- Syntax and import/export checks cover every intermediate test/story population, including unchanged callers. Independent object review checks all 594 lane commits and 79 ancillary commits, README ownership, per-test trailers, commit metadata and parent chains.
- Readability: 32 helper-introduction snapshots passed, covering 50 test-file executions and 515 passing cases. Full type checking passed at the matcher-declaration cleanup.
- Stories: the framework commit passed 646 unit files / 5,682 tests, with one skipped, before any conversion. All 46 helper-introduction snapshots passed (399 tests). The framework commit also passed full type checking.
- Play: all three helper-introduction snapshots passed their remaining unit contracts (11 tests) and Chromium stories (19 tests), with the existing accessibility configuration retained.

These focused results do not make the full catalog’s strict accessibility gate green. Existing catalog failures/TODOs and missing browser CI remain unchanged. Early validation attempts with temporary-worktree dependency links or missing ignored API build output were corrected and rerun; only corrected results are counted.

## Published branches

| Existing branch | Previous head | New head |
| --- | --- | --- |
| `vitest_readability` | `dd0f27fb6ac7` | `390b78fc122e` |
| `vitest_stories` | `1a4eb0e275cf` | `bf693b79ac92` |
| `vitest_story_play` | `23418c761940` | `a2acdefc35ba` |
| `vitest_real_api_calls` | `3684d62a1e16` | `a277128d39aa` |
| `vitest_readability_with_churn` | `ca6893f93ef6` | `7f5bf764eb0e` |

Publication updates only the five existing branch refs, atomically with exact preceding remote-head leases on the jmchilton fork. Local recovery refs retain their original heads at `refs/archive/test-consumer-colocation-20261020/<branch>`. The running Storybook checkout and all maintained worktree files/indexes remain unchanged. The RFC stays draft, its video is preserved, and smaller domain PRs remain a future step.

The exact source/commit/fragment mapping is in [manifest.json](manifest.json). Reviews: [design](preparation_design_review.md), [support schedule](support_schedule_review.md), [prepared objects](final_object_review.md), and [root-authored tools/docs](root_changes_review.md). Runtime records: [readability](readability_runtime.json), [stories](stories_runtime.json), [play](play_runtime.json), and [framework type check](framework_typecheck.json).
