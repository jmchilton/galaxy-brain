# galaxy_ui_driver upstreaming

Long-running task (John, 2026-10-09): break `galaxy_ui_driver` down and land its Galaxy fixes in
dev. Replaces the old "decide what to pull out at the end" rule.

## Rules

- Each PR comes off dev and holds one theme from the commits below the gxui tip.
- Prefer PRs that grow E2E coverage. A fix or abstraction lands with a Selenium/Playwright test
  that uses it, so the suite becomes its regression test and the PR has a non-gxui motivation.
- Once a PR merges, rebase `galaxy_ui_driver` onto dev and drop its commits. gxui stays the tip.
- Commits only gxui motivates (CDP port, storage state) go up with gxui. They don't get
  separate PRs.
- Branch records, PR descriptions and opening follow `vault/agents/gx_branches/`.

## Breakdown (John, 2026-10-09)

Easiest first. Commit numbers follow the queue in `GALAXY_UI_SKILL_DESIGN.md` ("Prerequisite
PRs").

**1. Two standalone fixes, in parallel.**
- **Tool Shed ids in `tool_open`** (4a). A real tool panel bug: searching by a Tool Shed id finds
  nothing. Tested by vitest and unit tests; CI has no shed tools for an E2E test.
- **Retry a Playwright timeout once** (7b). Its own PR because it changes timing for every
  `@retry_during_transitions` caller. A stuck Playwright action now fails after 2 action timeouts,
  not 11. The PR says upfront that it partly reverts `2825bb09e42` ("Try to fix transiently failing
  test?", 2026-03-22), which made Playwright timeouts retryable. That commit's CI run is gone and
  John isn't worried about the flake returning: the change justifies itself.

**2. Coverage PRs.** Each one is framed as new E2E coverage and brings the fixes its test needs.

| PR | Commits | Coverage to add |
|---|---|---|
| Run a workflow from the editor and cancel the invocation | 7h, 7j, 4b | run from the editor's Run activity, fill the simplified run form, cancel |
| Open workflows by exact title | 7c, 7g, 7i | open and run a workflow that has a prefix sibling or a ":" in its name |
| Insert a second subworkflow | 7d | insert two subworkflows from the editor's Workflows panel |

**3. Area PRs.**

| PR | Commits | Tests |
|---|---|---|
| Tool-form abstractions on `NavigatesGalaxy` | 6a, 6a′, 6b, 6c, 7a, 7e, 7f | tool-form E2E suite and unit tests; add E2E tests filling a workflow editor step's form (7a) and describing a rerun form (6c) |
| Multiview copy + hooks | 4c, 5e | Multiview E2E |
| `galaxy.selenium` usable outside the test suite | 7k, 5a, 5b, 5c, 5d, 7l, 7n | upload and extraction E2E suites, unit tests; give it a consumer by mixing `UsesUploadActivity` into `GalaxySeleniumContext` |

**4. gxui** with 2 (CDP port) and 7m (storage state).

## Starting a PR

- Pick the commit off the current `galaxy_ui_driver` by subject; hashes change on every restack.
- Branch off a freshly fetched `origin/dev` and cherry-pick it there. Re-run its tests on the new
  base.
- Step 1 branches: `tool_open_tool_shed_ids` (4a, "Let tool_open find Tool Shed tools by id") and
  `playwright_timeout_retry_once` (7b, "Retry a Playwright timeout once during transitions, not
  ten times"). Neither needs an E2E run, so a per-branch worktree under `WORKTREES.md` is fine.
- Hand off per `vault/agents/_shared/GX_IMPLEMENTATION_HANDOFF.md`: branch record, a
  `MY_BRANCHES.md` line, push to `jmchilton`. Note in the record that the commit comes from
  `galaxy_ui_driver` and gets dropped from it on merge.

## Open questions

- Is the standalone-selenium PR too big? 7k alone moves about 1,000 lines.
