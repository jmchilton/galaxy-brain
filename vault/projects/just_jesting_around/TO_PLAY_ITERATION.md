Each iteration moves one storified test's interaction cases into Storybook `play` functions on `vitest_story_play`, which is stacked on `vitest_stories`. Lane rules and ledger fields are in [PIPELINE_BRANCHES.md](PIPELINE_BRANCHES.md). The browser project setup and open questions are in [plan_vitest_addon.md](plan_vitest_addon.md).

Reuse the same branch and worktree for every iteration.

## Rebase

Rebase `vitest_story_play` onto `jmchilton/vitest_stories`. The story lane rewrites itself on every rebase, so replay only the play commits: `git rebase --onto jmchilton/vitest_stories <parent of the first play commit>`.
- Resolve conflicts so that both lanes' intent survives.
- Run the `storybook` browser project and the affected unit tests.
- Don't select a test until the rebased lane is green.

## Select

Pick the most recent test commit on `vitest_stories` whose `jest_tests.yml` entry has `storified: true` and no `storybook_play` field.

## Decide, case by case

- **Move:** component behavior a user would perform and see, such as filling forms, clicking through dialogs and wizards, or visible results.
- **Keep in vitest:** edge-case matrices, emitted-payload details, timing and logic, which read better as unit cases.
- **Assertions:** a moved case keeps its assertions, rewritten as user-visible equivalents ([STORY_CONVENTIONS.md](STORY_CONVENTIONS.md#play-functions)).
  - Strengthen weak assertions (OR-checks, ones that pass without the behavior) as you go, and note it in the log.
  - Weakening or dropping a check needs John's approval. If a case can't move without that, keep it in vitest and log why.

If no case moves, set `storybook_play: skip`, log the reason, and end the iteration.

## Convert

- Write each moved case as a `play` function on an existing or new story.
- Remove the vitest case only after its play function passes.
- Before committing, show each play function fails for the right reason, for example by breaking one expectation locally.

Storybook and browser-project infra lives in `vitest_stories`. If the conversion needs a change there, stop and report it to the driver.

## Validate

- Run the story file in the `storybook` browser project.
- Run what remains of the test in the `unit` project.
- Run type-checking, lint and formatting.
- Have an independent subagent confirm that every original assertion lives in a play function or in the remaining test.

## Record

- Commit the stories and the test together, with a `Test-File: <path>` trailer.
- Set `storybook_play: true` in `jest_tests.yml`, and change no other field.
- Append a row to [PLAY_LOG.md](PLAY_LOG.md) with the test, the cases moved and kept, the reasons and the wall time against the old unit run.
