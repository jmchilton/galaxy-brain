# Pipeline branches

Each test file moves through stacked branches ("lanes"). Each lane adds one kind of improvement on top of the lane below it. [PIPELINE_WORKERS.md](PIPELINE_WORKERS.md) describes the agents that move tests between lanes.

## Lanes

Stack order, bottom to top:

|   # | Branch                   | Adds                                                                                         | State                                                                                      |
| --: | ------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
|   1 | `vitest_readability`     | Readability and reuse rewrites ([READABILITY_LOOP_ITERATION.md](READABILITY_LOOP_ITERATION.md))| Per-test commits, split from `jest_readability_batch_01` ([prompt](REBASE_READABILITY.md)) |
|   2 | `vitest_stories`         | Storybook and its Vitest browser project; test mounts composed stories with mocks            | Infra plus per-test commits; progress in [STORY_LOG.md](STORY_LOG.md)                     |
|   3 | `vitest_story_play`      | Cases moved to `play` functions ([plan](plan_vitest_addon.md))                              | Per-test commits only; progress in [PLAY_LOG.md](PLAY_LOG.md)                              |
|   4 | `vitest_real_api_calls`  | Real API responses replace hand-written mock payloads                                        | Not started                                                                                |

Worktrees live under `~/projects/worktrees/galaxy/branch/`: `vitest_readability`, `storybook_prototype` (lane 2) and `storybook_interactions` (lane 3); the last two keep their old names until they're moved. Lanes push to the `jmchilton` remote.

Run client commands from `client/` with the pinned node and `VITE_CONFIG_NATIVE_IGNORE_WARNING=true`; the default node 25 breaks happy-dom:
- `npm_config_use_node_version=$(cat .node_version) pnpm exec vitest run --project unit <test>`
- `... pnpm exec vitest run --project storybook <file>.stories.ts` (output is noisy with Vue compat warnings; read the summary)
- `... pnpm type-check`
- `... pnpm exec eslint <files>` and `... pnpm exec prettier --check <files>`
- zsh doesn't split a variable holding several paths; pipe through `xargs` instead.
- To read a run's result, filter with `2>&1 | grep -E "Test Files|Tests |FAIL"`; for type-check, check the exit code.

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

CI runs only the `unit` project. Story render checks and play functions aren't in CI yet, so the play lane can't go upstream until a browser CI job exists (undecided: a step in `client-unit.yaml` or its own workflow).
| `split_commit` | `true` | Splitter (done; informational) |

- `skip` means the stage doesn't apply to that test. The reason goes in the stage's batch report, not in the ledger.
- For `storified: skip`, use the split in [plan_vitest_addon.md](plan_vitest_addon.md#split-to-aim-for): logic, stores, composables and API-client tests stay in happy-dom.
- No `false` value: a missing field already means pending.
- `storified: skip` is enough on its own. The play lane selects only `storified: true`, so it leaves `storybook_play` unset (the bulk row set both; that's harmless).
- Shared-code commits may carry a `Test-File:` trailer for the test that motivated them. Selection skips a trailer whose commit doesn't touch that file.
- A test file with no entry is new upstream. Any lane adds a bare `- file:` entry in sorted order, committed on its own.
- The ledger can run ahead of a pushed branch; select from what the pushed branch contains.

## Invariants

- **One commit per test file per lane.** Each commit carries a `Test-File: <path>` trailer. The trailer survives rebases, so it's how workers find a test's commits, not the SHA. If the test already has a commit in the lane, fold new work into it (`git commit --fixup` then a non-interactive autosquash: `GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash <base SHA you started from>`). Never autosquash onto a remote ref: another session's fetch can move it mid-iteration and silently replant the lane.
- **Push plainly when you can.** If the rebase rewrote nothing, the push is a fast-forward and needs no force. Use `--force-with-lease` only when the lane was rewritten.
- **A blocked push stops the iteration.** If the push is refused, leave the ledger field unset, keep the log row and commits local, and report the exact push command to the driver.
- **The ledger says what's ready.** A lane selects from the ledger field of the lane below, not from that lane's branch; a commit without its ledger write isn't done.
- **Shared code is committed first.** Helpers, fixtures, mock handlers and story infra each go in their own commits, before the test commits that use them.
- **Tests can enter mid-stack.** A test can be storified with no `iterated` count (FormData, FilesDialog and HistoryExportWizard already were). Lanes are a stacking order, not a gate every test must pass through.
- **Lanes build on pushed tips.** A lane rebases onto the lane below's `jmchilton/` branch, never the local one. A driver pushes only after its iteration is validated and reviewed; until then it may amend freely.
- **Downstream wins.** Once a lane above has changed a test, lanes below leave that file alone. If a shared helper changes below, the lanes above rebase and adapt. A lane may edit a lower lane's shared helper in its own shared-code commit, and keeps that edit through rebases.
