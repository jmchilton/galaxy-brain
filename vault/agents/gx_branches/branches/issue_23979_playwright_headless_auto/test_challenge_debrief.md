# Test challenge debrief: issue_23979_playwright_headless_auto

Process: `vault/agents/_shared/GX_CHALLENGE_TESTS.md`. Base: `dev`. Branch head: `314fb64306f`. Issue: galaxyproject/galaxy#23979.

Fix: in `lib/galaxy_test/selenium/framework.py`, `headless_selenium()` now returns True under `GALAXY_TEST_SELENIUM_HEADLESS=auto` when the backend is Playwright. Before the fix it probed PATH for Selenium drivers in that case. The test file is `test/unit/selenium/test_framework_headless.py` (7 cases).

Result: all 7 cases kept and the fixture shape rewritten. The changes are uncommitted in the worktree.

## Layer choice

Unit is the correct layer. The function under test resolves the test harness's own config: env constants read at import time, plus the drivers found on PATH. No Galaxy server is involved, so no API or integration layer applies.

## Unit tests: verdicts

| Test | Verdict | Why |
|---|---|---|
| Playwright `test_auto_is_headless[()]` | keep | Regression for the reported bug. On old code, `auto` with no drivers raised. |
| Playwright `test_auto_is_headless[("geckodriver",)]` | keep | Regression for the second symptom. On old code, having geckodriver only gave headed Chromium. |
| Playwright `test_auto_is_headless[("chromedriver",)]` | keep | Checks that the result doesn't depend on which drivers are present. It passes on old code too, so it is **not** a red check. |
| Playwright `test_explicit_setting_respected` | keep | Checks that the short-circuit is limited to `auto`. Without this test, a fix that put `if playwright: return True` above the `auto` check would ignore an explicit `0`. |
| Selenium `test_auto_without_drivers_raises` | keep | Checks that the Playwright guard didn't change Selenium's behavior with no drivers. |
| Selenium `test_auto_with_chromedriver_is_headless` | keep | Characterizes Selenium's existing `auto` behavior. Inexpensive. |
| Selenium `test_auto_with_geckodriver_only_is_headed` | keep | Catches an over-broad fix that would make every `auto` run headless. |

None of the tests mirror the implementation, and none duplicate API, integration or Selenium coverage. Nothing else tests `headless_selenium()`.

## Rewrite: fixture closure to dataclass

Before the rewrite, test config was split across two places:
- An `auto_settings` fixture that patched globals and returned a closure for setting the drivers on PATH.
- A separate `_use_backend(monkeypatch, backend)` helper.

Each test needed two or three setup calls, and a fixture whose name said nothing about drivers.

These are now a single `HeadlessEnv` dataclass with fields `backend`, `drivers_on_path`, `headless`, `browser` and `remote`, plus an `apply(monkeypatch)` method. Each test is now one declaration and one assert, for example `HeadlessEnv(backend="playwright", headless="0").apply(monkeypatch)`. All assertions, cases and the `match=` string are unchanged.

## Red/green check

To check against old code, I loaded `git show HEAD~1:lib/galaxy_test/selenium/framework.py` into `sys.modules["galaxy_test.selenium.framework"]` using a scratch pytest `-p` plugin. I didn't use `git stash` or edit the worktree file. Results:

- New code: 7 passed.
- Old code: 2 failed (`[()]` and `[("geckodriver",)]`) and 5 passed. This matches the run before the rewrite.

Lint: ruff, black and isort are clean, and mypy reports no errors in the file.

## Declined

- **Restructuring `framework.py` into a pure resolver.** The checklist's "restructure to remove mocks" item applies in principle. `headless_selenium()` reads four module constants and two `driver_factory` probes, so a helper like `resolve_headless(setting, backend, browser, remote, virtual_display_available, local_browser)` would remove all the monkeypatching. `use_virtual_display()` has the same shape and would want the same treatment. I declined because it would grow a one-line fix into a refactor of two functions, and my grant covered the test file only. It is a reasonable follow-up if more tests are added around these functions.
- **Replacing the `_which` patch with a fake `PATH` directory.** I considered pointing `PATH` at a tmp dir containing empty `chromedriver`/`geckodriver` files. It would test the real lookup, but it adds filesystem setup and doesn't make the tests read any better. `driver_factory.Display = None` still has to be patched either way. I kept the `_which` patch.
- **An E2E test.** Every Playwright E2E run already goes through `headless_selenium()`. An E2E test also can't control which drivers are on PATH or the env-var combination that triggers the bug, because CI sets those up front. The unit tests are the only place these cases can be controlled.

## Side note

`run_tests.sh` has an uncommitted change in the worktree (a docs line about Playwright being headless by default). Another session made it during this run, and I left it alone.
