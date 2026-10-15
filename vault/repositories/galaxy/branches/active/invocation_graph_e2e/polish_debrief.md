# Polish debrief — invocation_graph_e2e

**The branch needed no code changes, so polishing produced only the [PR description](pr_description.md) and [titles](pr_titles.md).** Head stays `7d2439be1c4` on base dev `c63ffc2ccae`, and it merges cleanly with current `origin/dev`.

## CI (fork, `jmchilton/galaxy`)

- `7d2439be1c4`: Client unit, client lint, Integration Selenium, Toolshed, first startup and macOS startup are green. Playwright (all 3 shards) is green, including all 6 new tests, both `test_workflow_invocation_details` tests and the 3 `test_workflow_rerun` tests.
- `c528bbf34d7`, the previous head and the one that changed the fixture: API tests are green, which covers `test_keep_success_mapping_error` on the repositioned `WORKFLOW_KEEP_SUCCESSFUL_DATASETS`. Python lint, unit, framework and docs are green too.
- **Unrelated red:** `Test Galaxy packages` on `c528bbf34d7` fails mypy at `galaxy/security/ssh_util.py:18` (`publickey` untyped call, from type stubs). The branch doesn't touch that file. The red is the same on 3.10 and 3.14.
- The Selenium workflow runs only on its weekly cron or by dispatch, so Playwright is the PR-time E2E gate.

## Checklist (GENERAL + WORKFLOW_RELATED)

- A subagent answered every item from the diff, and none fail. The human-read item is left for John.
- It raised one concern: the shared fixture's API test hadn't run. CI on `c528bbf34d7` settles that.
- It also flagged stale numbers in `scope_evaluation.md`: 3 Vue files and a 166-line test file. The branch actually touches 4 Vue files and a 174-line test file. The description uses the current numbers.

## Strengthening round

These were applied to the description only:

- New highlighted sentences:
  - Why browser tests rather than more Vitest.
  - Why these 6 tests avoid the live-update race.
  - "Tests and test helpers", since the PR touches `NavigatesGalaxy` too.
- #24138 wording corrected: the Overview poll loop is only the *likely* cause, and the #24138 fix branch removes it. "1 in 6" now reads "once in 6 local Selenium runs".
- Other corrections:
  - Five of the 6 tests use the inline workflow.
  - `label_input` is the Step Config field, not a node lookup.
  - The Codex review and the mutations ran at earlier heads, and the mutations ran under Playwright only.
  - The "How to test" section separates local runs at earlier heads from the final-head Playwright CI.

Not done (reported, not looped):

- **No local Selenium re-run** of `test_workflow_rerun` / `test_workflow_invocation_details` at the final head. Another session's Galaxy server was running, and CI's Playwright suite covers both at this head. Their Selenium passes are from earlier heads (`test_workflow_invocation_details` at `f3abbbfa287`).
- **Mutations weren't re-run** at the final head. The changes since then are the search click path and the polling waits.
- **History not squashed.** There are 8 commits, including a move that was later reverted (`226a0b2` → `b04051e`). Squashing means a force-push, which is John's call; squash-merge at merge time also works.

## Open questions for John

- Squash the 8 commits before opening?
- Keep "Toward 🎯 #3241" (2016 umbrella "Expand Selenium Test Coverage") as the opener?
- Steps-tab search test: follow-up PR?
- Live-update test: land it here after #24138 merges forward, or with that merge-forward?
