# gxformat2 #263 — Fix default_url_resolver for GA4GH TRS URLs

- [PR](https://github.com/galaxyproject/gxformat2/pull/263) (mvdbeek)
- [Independent review](review.md) — reviewed `e8dc2da`
- TS companion: [galaxy-tool-util-ts#191](https://github.com/jmchilton/galaxy-tool-util-ts/pull/191) — [notes](../../../../galaxy-tool-util-ts/reviews/archived/191/index.md)

## Current status — 2026-10-14

Review verdict: approve; no blockers. Marius asked for 26.2 + IWC use.

Pushed fix-up `fbd5c44` to Marius's branch (John asked to fix up issues):
- TRS descriptor without string `content` raised bare `KeyError`/`TypeError`; now `ValueError` naming both ref and descriptor URL (matches TS resolver message). Red test added first.
- isort fix in `tests/test_interop_tests.py` (only isort failure in repo; CI doesn't run isort).

Local: full suite 787 passed / 8 skipped; mypy, pyrefly, ruff/flake8/black on changed files clean. `make lint` still fails ruff E402 in `docs/conf.py`, `scripts/bootstrap_history.py` — pre-existing on main.

2026-10-14 later: merged `origin/main` (#219 draft ops) into branch at `06495cb` to clear conflict; only `tests/test_interop_tests.py` OPERATIONS dict conflicted, kept both. 888 passed / 8 skipped, mypy clean. PR mergeable.

2026-10-15: CI run 38586201483 on `06495cb` failed on `py310-lint`. Ruff 0.17.0 flagged SIM117 (nested `with`) in `test_default_url_resolver_trs_missing_content`, which came from my `fbd5c44` fix-up. The earlier "lint clean" claim used the lint group's older ruff, not the version CI installs. I pushed `7d0e5af`, which combines the two context managers into one parenthesized `with`. Latest `uvx ruff check` and black pass, and the options tests pass.

No GitHub review/comment posted. Shared fixture/expectation unchanged.

Not addressed (in review; shared with Galaxy `trs_proxy`, would need both repos + fixture): version with `?query`/`/`, `+` not idempotent on re-encode, CWL/relative descriptor URLs rewritten to GALAXY, resolver ignores `content_source`, cycle detection keyed on raw URL, `is_trs_url` now uncalled.

Worktree: `~/projects/worktrees/gxformat2/pr/263`.

## Archived — 2026-10-15

Merged on GitHub 2026-10-15 (15:34Z); tracking ended. Worktree `~/projects/worktrees/gxformat2/pr/263` still present; removal pending cleanliness check.
