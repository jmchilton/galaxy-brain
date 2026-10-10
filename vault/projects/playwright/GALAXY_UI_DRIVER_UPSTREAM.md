# galaxy_ui_driver upstreaming

Long-running task (John, 2026-10-09): break `galaxy_ui_driver` down and land its Galaxy fixes in
dev. Replaces the old "decide what to pull out at the end" rule.

## Rules

- Each PR comes off dev and holds one theme from the commits below the gxui tip.
- Prefer PRs that grow E2E coverage. A fix or abstraction lands with a Selenium/Playwright test
  that uses it, so the suite becomes its regression test and the PR has a non-gxui motivation.
- Once a PR merges, rebase `galaxy_ui_driver` onto dev and drop its commits. gxui stays the tip.
- Commits only gxui motivates (CDP port, storage state, public locator APIs) go up with gxui.
  They don't get separate PRs.
- Branch records, PR descriptions and opening follow `vault/agents/gx_branches/`.

## First-cut grouping (draft, 2026-10-09)

Commit numbers follow the queue in `GALAXY_UI_SKILL_DESIGN.md` ("Prerequisite PRs").

| PR candidate | Commits | Tests today | Coverage to add |
|---|---|---|---|
| Tool-form filler on `NavigatesGalaxy` | 6a, 6a′, 7a, 7e, 7f | tool-form E2E suite, stub-form unit tests | an E2E test filling a workflow editor step's form (7a) |
| `tool_form_parameters` | 6b, 6c | unit + one E2E | an E2E test describing a rerun form (6c) |
| Open workflows by exact title | 7c, 7g, 7i | unit | E2E tests: open or run a workflow whose name has a prefix sibling or a ":" |
| Workflow editor/run navigation | 4b, 7d, 7h, 7j | none | E2E tests: simplified run form inputs, a second subworkflow insert, run from the editor, cancel an invocation |
| Extraction helpers on `NavigatesGalaxy` | 5a | `test_extract_rename_input` | none needed |
| Multiview copy + hooks | 4c, 5e | E2E | none needed |
| Tool Shed ids in `tool_open` | 4a | vitest + unit | none possible in CI (no shed tools) |
| Single retry on Playwright timeout | 7b | unit | none needed |
| `galaxy_url` path prefix | 7n | unit | none needed |
| Go up with gxui | 2, 5b, 5c, 5d, 7k, 7l, 7m | unit | n/a |

## Open questions

- Is 7k (upload helpers lift) a standalone refactor PR, or does it go with gxui?
- 5d (docstrings): ship alone, or fold each docstring into the PR that touches its method?
- What order? Fixes with no coverage gap first, or the coverage-adding PRs first?
