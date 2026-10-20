# Existing branch history reorganization

Reorganized the existing branches in place. No domain branches or new PRs were created. The complete RFC and all final source files are preserved.

| Existing branch | Published head | Own commits |
| --- | --- | ---: |
| `vitest_readability` | `dd0f27fb6ac7` | 396 |
| `vitest_stories` | `1a4eb0e275cf` | 102 |
| `vitest_story_play` | `23418c761940` | 96 |
| `vitest_real_api_calls` | `3684d62a1e16` | 3 |
| `vitest_readability_with_churn` | `ca6893f93ef6` | 76 |

Each main lane has one opening shared-infrastructure commit, one example next, then the remaining per-test conversions. Readability uses parseBool; stories/play use GDropdownItem. The readability opening commit includes the README plus shared helpers and fixtures, including helpers the README references.

Repeated historical modifications to a test are consolidated into its final delta. The shared GalaxyAI story is assigned to its earliest owner; other historical owners and all original provenance are retained in [manifest.json](manifest.json). Two historical empty readability commits are recorded there rather than recreated.

All five final Git tree IDs exactly equal their original tree IDs. No Galaxy source, README, assertion, configuration, workflow or accessibility exception changed. The ancillary real-API and churn branches retain their own commits atop rewritten readability. Exact source identity preserves the previous validation evidence and its limitations; no fresh runtime tests were run for this history-only operation. Existing strict accessibility failures, historical TODO exceptions and missing browser CI remain.

The original heads are retained under local `refs/archive/test-history-20261020/<branch>` recovery refs. Existing refs were updated atomically with explicit old-head guards; publication used exact preceding remote-head leases on the jmchilton fork. Original worktree indexes/files remained unchanged, including the running Storybook demo.

The future merge route is an infrastructure-plus-example foundation followed by independent domain PRs of roughly 5–10 related tests. This extraction has not been performed. Keep each component’s readability, stories, plays and accessibility changes together when it is requested.

[Normal review](review.md). The manifest records original/new commits, file ownership, examples, omitted empty commits, ancillary parent mappings and tree checks. [build_history.py](build_history.py) prepares objects without updating refs; [apply_refs.py](apply_refs.py) performs the guarded existing-ref transaction.
