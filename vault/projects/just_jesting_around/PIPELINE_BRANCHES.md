# Pipeline branches

Each test file moves through stacked branches ("lanes"). Each lane adds one kind of improvement on top of the lane below it. [PIPELINE_WORKERS.md](PIPELINE_WORKERS.md) describes the agents that move tests between lanes.

## Lanes

Stack order, bottom to top:

|   # | Branch                   | Adds                                                                                         | State                                                                                      |
| --: | ------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
|   1 | `vitest_readability`     | Readability and reuse rewrites ([READABILITY_LOOP_ITERATION.md](READABILITY_LOOP_ITERATION.md))| Per-test commits, split from `jest_readability_batch_01` ([prompt](REBASE_READABILITY.md)) |
|   2 | `vitest_stories`         | Storybook infra; test mounts composed stories with mocks                                     | Infra plus per-test commits; progress in [STORY_LOG.md](STORY_LOG.md)                     |
|   3 | `vitest_story_play`      | Vitest addon browser project; cases moved to `play` functions ([plan](plan_vitest_addon.md)) | Infra `b4b0c93a433` (27/27 browser tests); 1 play function; plan steps 2–5 open   |
|   4 | `vitest_real_api_calls`  | Real API responses replace hand-written mock payloads                                        | Not started                                                                                |

Worktrees live under `~/projects/worktrees/galaxy/branch/`: `vitest_readability`, `storybook_prototype` (lane 2) and `storybook_interactions` (lane 3); the last two keep their old names until they're moved. Lanes push to the `jmchilton` remote.

Run client tests with the pinned node: `npm_config_use_node_version=$(cat client/.node_version) pnpm exec vitest ...` from `client/`. The default node 25 breaks happy-dom.

`jest_readability_batch_01` (one commit per iteration, draft PR #24015) is the historical source for lane 1. It's frozen and no longer receives work.

Lane 4 has two parts:
- An API-test suite that runs against a live Galaxy and dumps responses as generated JSON.
- Converting client tests to read that JSON.

## Ledger

`jest_tests.yml` holds one entry per test file. A missing field means the stage hasn't processed that test yet.

| Field | Values | Set by |
| --- | --- | --- |
| `iterated` | count | Readability driver (existing) |
| `storified` | `true` \| `skip` | Story driver |
| `storybook_play` | `true` \| `skip` | Play driver |
| `real_api_calls` | `true` \| `skip` | Real-API driver |
| `split_commit` | `true` | Splitter (done; informational) |

- `skip` means the stage doesn't apply to that test. The reason goes in the stage's batch report, not in the ledger.
- For `storified: skip`, use the split in [plan_vitest_addon.md](plan_vitest_addon.md#split-to-aim-for): logic, stores, composables and API-client tests stay in happy-dom.
- No `false` value: a missing field already means pending.

## Invariants

- **One commit per test file per lane.** Each commit carries a `Test-File: <path>` trailer. The trailer survives rebases, so it's how workers find a test's commits, not the SHA.
- **Shared code is committed first.** Helpers, fixtures, mock handlers and story infra each go in their own commits, before the test commits that use them.
- **Tests can enter mid-stack.** A test can be storified with no `iterated` count (FormData, FilesDialog and HistoryExportWizard already were). Lanes are a stacking order, not a gate every test must pass through.
- **Lanes build on pushed tips.** A lane rebases onto the lane below's `jmchilton/` branch, never the local one. A driver pushes only after its iteration is validated and reviewed; until then it may amend freely.
- **Downstream wins.** Once a lane above has changed a test, lanes below leave that file alone. If a shared helper changes below, the lanes above rebase and adapt.
