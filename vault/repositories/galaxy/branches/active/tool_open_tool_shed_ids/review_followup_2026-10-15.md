# PR #24142 review follow-up — 2026-10-15

## Syntax finding

Marius asked whether the syntax should be `tool_id:<id>` ([comment](https://github.com/galaxyproject/galaxy/pull/24142#issuecomment-6187223292)). Both `id:` and `tool_id:` are already accepted aliases: `FILTER_KEYS.id = ["id", "tool_id"]` in `client/src/components/Panels/utilities.ts`. The release base has the same mapping. The existing `tool_open` helper itself uses `id:`. This was not an agent usage/syntax error.

The regression is independent of spelling: both full-GUID queries return an empty result with the original regex-based matcher and the expected tool with the literal matcher. Replaced the previous table row with two individually reported `it.each` cases, one per alias.

## Fixture correction

Marius correctly identified the old fixture as an expression tool ([comment](https://github.com/galaxyproject/galaxy/pull/24142#discussion_r4280410185)). Choosing it was a poor agent fixture choice: its special-form routing prevented the test from asserting normal tool-form opening. The previous response narrowed the assertion to link lookup instead of choosing a suitable command tool.

Replaced it with `devteam/fastqc`, revision `3d0c7bdf12f5`, GUID `toolshed.g2.bx.psu.edu/repos/devteam/fastqc/fastqc/0.73+galaxy0`. This exact pin is already used by `test/integration/test_shed_tool_tests.py`. It is a standard command tool and its GUID covers periods, slashes and a plus sign.

- Panel test now asserts the expected visible form version after `tool_open`.
- Card test retains version/favorite/help checks, then clicks the previously untested Open button and asserts the expected form version.
- Removed the special-form caveat and outdated expression-tool screenshots from the PR description; reset the human-read checkbox for the revised tests.
- No production code changes and no PR comments posted.

## Verification

- Search suite: **27 passed**.
- Both full-GUID alias tests on original release search code: **2 failed**, expected tool versus empty result; restored production file afterward.
- Revised browser integration tests on Playwright: **2 passed** (31.52s). Used this worktree's existing built client, existing Python test environment, and a temporary Galaxy server; conda auto-init disabled. The initial attempt skipped both tests; retry executed both successfully.
- Revised browser tests with original release navigation selectors: **2 failed** (37.55s). Panel test times out on the raw GUID in the encoded href; card test raises CSS `Unexpected token "/"`. Restored navigation file afterward.
- Black, Prettier and whitespace checks pass.
- The initial commit attempt hit old ESLint 8 in the pre-existing shared node_modules symlink (`--warn-ignored` unsupported). Used an existing ESLint 10 environment temporarily for lint/hooks and restored the original symlink afterward.

Logs: `/tmp/pr24142-vitest-green.log`, `/tmp/pr24142-vitest-red.log`, `/tmp/pr24142-browser-retry.log`, `/tmp/pr24142-browser-red.log`.
