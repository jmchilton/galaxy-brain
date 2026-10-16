# playwright_timeout_retry_once — implementation debrief

**STATUS: READY.** Branch `playwright_timeout_retry_once` @ `7682a9a4e09` is a single commit on dev (merge-base `df3932ed4ba`), pushed to `jmchilton`. It is 2 files, +45.

## What it does

`retry_call_during_transitions` now counts Playwright `TimeoutError`s separately and re-raises on the second one. A stuck Playwright action fails after 2 action timeouts, where it used to take 12 (the first call plus `attempts + 1` retries). Stale, not-clickable and intercepted errors keep the full budget.

This is a partial revert of `2825bb09e42`, which made Playwright timeouts retryable. That commit's one retry survives.

## Choices

- **Origin.** Cherry-picked from `galaxy_ui_driver` (7b). Drop it there on merge.
- **Scope kept as implemented** ([scope evaluation](scope_evaluation.md)). Each of these stays out:
  - the `previous_attempts > attempts` off-by-one;
  - tidying the private import in `_exception_indicates_playwright_timeout`, which fits the `galaxy.selenium` area PR;
  - retrying Selenium `TimeoutException`;
  - a full revert.
- **The import tidy.** The normal review called that in-function import necessary because Playwright is optional at runtime. The scope evaluation found that weak: `packages/selenium` has `playwright` as a hard dependency. Either way it is out of scope.
- **Tests.** One unit file, 2 cases. The Playwright case pins the change. The stale-element case is the contrast that a cap-everything fix would fail. No E2E test: proving "fails fast" end to end would mean stalling for minutes ([test challenges](test_challenges_debrief.md)).

## PR description must say

- The PR is a partial revert of `2825bb09e42` (John, 2026-10-09: its CI run is gone, and the change justifies itself).
- Timing changes for every caller of `retry_call_during_transitions`: about 100 call sites.
- On Playwright, the cap also covers Galaxy `wait_for_*` timeouts, which are re-raised as Playwright `TimeoutError`.

## Evidence

- `test_retry_during_transitions.py`: 2 passed. Red without the fix: 1 failed.
- Full `test/unit/selenium/`: 517 passed. The 3 failures in `test_driver_factory.py` came from chromedriver missing from PATH. With it on PATH, that file passed (19).
- ruff, black and isort are clean.
- Reviews: [normal review](subagents/normal_review.md); [Codex](codex_review.md), no findings. The thermo-nuclear review was skipped because the branch is under 50 lines. Screenshots don't apply: there is no UI change.
