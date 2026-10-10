Each iteration moves one storified test's interaction cases into Storybook `play` functions on `vitest_story_play`, which is stacked on `vitest_stories`. Lane rules and ledger fields are in [PIPELINE_BRANCHES.md](PIPELINE_BRANCHES.md). The browser project setup and open questions are in [plan_vitest_addon.md](plan_vitest_addon.md).

Reuse the same branch and worktree for every iteration.

## Rebase

Rebase `vitest_story_play` onto `jmchilton/vitest_stories`. The story lane rewrites itself on every rebase, so let git find the old base from the remote ref's reflog: `git fetch jmchilton vitest_stories && git rebase --fork-point jmchilton/vitest_stories`. Commands are in [PIPELINE_BRANCHES.md](PIPELINE_BRANCHES.md#lanes).
- Resolve conflicts so that both lanes' intent survives.
- Run the whole `storybook` browser project and the unit files of every test with a play commit on the lane (find them by `Test-File:` trailer).
- Don't select a test until the rebased lane is green.

## Select

Pick the most recent test commit on `vitest_stories` whose `jest_tests.yml` entry has `storified: true` and no `storybook_play` field.

## Decide, case by case

- **Move:** component behavior a user would perform and see, such as filling forms, clicking through dialogs and wizards, or visible results.
- **Keep in vitest:** edge-case matrices, emitted-payload details, timing and logic, which read better as unit cases. A matrix that reads as one fill-in script (ExportForm's disabled states) may move as one play.
- **Don't measure layout:** no pixel sizes or computed styles. Those couple a play to global CSS; a class or prop check in vitest is enough.
- A case may split: its user-visible assertions move and the rest stay.
- **Assertions:** a moved case keeps its assertions, rewritten as user-visible equivalents ([STORY_CONVENTIONS.md](STORY_CONVENTIONS.md#play-functions)).
  - Strengthen weak assertions (OR-checks, ones that pass without the behavior) as you go, and note it in the log.
  - Weakening or dropping a check needs John's approval. If a case can't move without that, keep it in vitest and log why.

If no case moves, set `storybook_play: skip`, log the reason, and end the iteration.

## Convert

- Write each moved case as a `play` function on its own story ([STORY_CONVENTIONS.md](STORY_CONVENTIONS.md#play-functions)). A play that only reads, or leaves the story in its initial state (hover), may sit on the base story.
- Remove the vitest case only after its play function passes. If every case moves, time the unit file first, then delete it; the commit keeps its `Test-File:` trailer.
- If a user has to reveal content (expand a section, open a dialog), the play reveals it too and checks it was hidden before.
- Before committing, show each play function fails for the right reason: break the behavior in the component locally and watch the play fail. For a strengthened check, show the old check still passes under that break (copy the old test to a sibling `<name>.old.test.<ext>`, run it, delete it).
- New checks a play makes possible are welcome, including a new story whose data exposes a weak check (an all-off config next to all-on); log them as strengthening.

If the strongest check would fail on a pre-existing component bug, don't fix the component in this lane: write the check to tolerate it, mark it in the play with a comment, and add the bug to [BUGS_FOUND.md](BUGS_FOUND.md).

Storybook and browser-project infra lives in `vitest_stories`. If the conversion needs a change there, stop and report it to the driver.

## Validate

- Run the story file in the `storybook` browser project.
- Run what remains of the test in the `unit` project.
- Run type-checking, lint and formatting.
- Have an independent subagent confirm that every original assertion lives in a play function or in the remaining test.

## Record

- Commit the stories and the test together, with a `Test-File: <path>` trailer, before the review; amend with its fixes. Push with `--force-with-lease` once validation and review pass.
- After the push, set `storybook_play: true` in `jest_tests.yml`, and change no other field. Commit it with the log row (`git commit -o`); don't push galaxy-brain. If the lane below moved during the iteration, push anyway; the next rebase picks it up.
- Append a row to [PLAY_LOG.md](PLAY_LOG.md) with the test, the cases moved and kept, the reasons and the warm vitest `Tests` time of the stories and unit files, before and after.
