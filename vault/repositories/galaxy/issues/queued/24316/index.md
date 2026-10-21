# galaxy#24316 — Filter (Filter1) error handling: a missing column gives a bare traceback, and its own error messages finish green

[Issue](https://github.com/galaxyproject/galaxy/issues/24316) · [proposal](proposal.md) · [debrief](debrief.md) · [source draft](issue_draft.md)

Filed 2026-10-21, unassigned (John asked not to be assigned). Found by the 26.2 Playwright FAQ loop (`faqs/galaxy/analysis_troubleshooting`).

`filtering.py` never checks the condition's highest column against `in_columns`, so a missing column raises an `IndexError`. `stop_err()` exits 0, and since 25eb8a32485 put 1.1.1 on `profile="24.2"`, every `stop_err` error finishes green with empty output.

Open: the green state isn't confirmed in a real Galaxy job (it comes from the code and from running the script on its own). Version bump to 1.1.2 is left to the maintainers. `cN` inside string literals counts as a column (follow-up).

Next: branch with `sys.exit(1)`, the bounds check, and two `expect_failure` tool tests (red first via `./run_tests.sh --main_tools -id Filter1`).
