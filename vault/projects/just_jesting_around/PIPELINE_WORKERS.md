# Pipeline workers

These are the agents that move test files up the lanes in [PIPELINE_BRANCHES.md](PIPELINE_BRANCHES.md). Each lane has one **driver**. The driver owns the lane's branch and worktree, and is the only writer of that lane's ledger field.

The driver can fan work out to **subagents**:
- Each subagent takes one test and works in a disposable worktree cut from the lane tip.
- It returns a single commit, or a skip with its reason.
- The driver applies the returned commits one at a time, so conflicts in shared files are resolved in one place.

## Common driver cycle

1. Rebase the lane onto the lane below it, then validate. Lane 1 rebases onto dev.
2. Pick the next tests. A test is eligible when the lane below is done with it or skipped it, and this lane's field is missing.
3. Fan out to subagents. When a subagent needs shared code, the driver commits that shared code first.
4. Apply the returned commits, validate the affected suites, and write the batch report.
5. Update this lane's field in `jest_tests.yml`, and only that field.

## Workers

### Splitter (one-time, done)

Replayed `jest_readability_batch_01` iteration by iteration into `vitest_readability`, using the [rebase prompt](REBASE_READABILITY.md). The result is one commit per originating test, with shared-helper commits before them and the docs commit last. A test that was edited in several iterations keeps one commit per iteration; find them all through the `Test-File:` trailer.

### Readability driver (lane 1)

The loop described in [READABILITY_LOOP_ITERATION.md](READABILITY_LOOP_ITERATION.md), changed to fit the split history:

- Works on `vitest_readability` instead of `jest_readability_batch_01`.
- Emits per-test commits plus shared-code commits, instead of one commit per iteration. Each commit carries the `Readability-Iteration: NN` trailer. The batch report replaces the iteration commit as the record of the batch.
- Leaves alone any file that a lane above has already changed. That includes supporting edits.

### Story driver (lane 2)

Runs [TO_STORY_ITERATION.md](TO_STORY_ITERATION.md); decisions are logged in [STORY_LOG.md](STORY_LOG.md).

Pulls readability-done tests and does one of two things:
- Moves the test's setup into stories that the test mounts. This is the composed-story pattern from FormData.
- Records `storified: skip`.

Parallelizes well. The contention points are `.storybook/preview.ts`, `tests/vitest/stories.ts` and `__mocks__/http.ts`, so changes to those go through the driver.

### Play driver (lane 3)

Runs [TO_PLAY_ITERATION.md](TO_PLAY_ITERATION.md); decisions are logged in [PLAY_LOG.md](PLAY_LOG.md).

Moves component-behavior cases out of a storified test and into `play` functions.

- **Assertions:** strengthening is welcome; a case that would lose or weaken a check stays in vitest until John approves.
- Edge-case-heavy tests stay in vitest and get `storybook_play: skip`.

### Real-API driver (lane 4)

- **One-time infra:** a Galaxy API-test suite that records responses to generated JSON, typed against the OpenAPI schema, with a drift check.
- **Per-test work:** swap hand-written mock payloads for the recorded JSON.
- **Constraint:** it needs a live Galaxy server, and those tests run one at a time. The recording side can't fan out the way lane 2 can.

## Ledger writes

`jest_tests.yml` has several writers, one per field:
- Change only your own field, using exact-line edits, and commit it with your log row using explicit paths (`git commit -o`). Don't push galaxy-brain.
- Readability manifests fingerprint the whole file (`inventory_sha256`), so the hash changes whenever another lane writes. That's expected; the fingerprint dates a selection snapshot.

## Is this sane?

Yes, as long as the per-test commit is the unit of work. These are the risks:

- **Review is the bottleneck, not agents.** A 396-test stack that never merges is the failure mode. Per-test commits make it cheap to cut slices into upstream PRs, for example one directory per PR, starting with lane 1.
- **Rebase cascade.** Every lane-1 commit ripples up three lanes. Batch the rebases, one cascade per driver cycle, instead of rebasing per commit.
- **Shared-helper churn.** The readability loop's habit of following an abstraction into its consumers is the main source of conflicts in the lanes above. The "downstream wins" rule caps it.
