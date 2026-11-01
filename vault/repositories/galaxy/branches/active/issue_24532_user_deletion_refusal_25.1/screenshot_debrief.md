Run via Claude Opus 5.5 at low effort.

# Screenshot debrief: issue_24532_user_deletion_refusal_25.1

**Top-line: screenshots successfully obtained.** The new integration Selenium test `test/integration_selenium/test_user_deletion_disabled.py` passed green on the first real run (1 passed, about 61s). The test is committed as `beaf0f4d568` ("Add Selenium test for refused user self-deletion") and pushed to `jmchilton/issue_24532_user_deletion_refusal_25.1`.

## Screenshots

| File | What it shows |
|------|---------------|
| `screenshots/user_deletion_refused_by_configuration.png` | The Account Deletion modal with `allow_user_deletion=False`, after the user typed their email and clicked "Delete Account Permanently". The modal is still open. The red alert reads "User deletion must be configured on this instance in order to allow user self-deletion. Please contact an administrator for assistance." above the existing warning. The email field is still filled and valid. The OK button is enabled again because `deleting` was reset after the failure. |

The screenshot matches the intended behavior, so no changes to the test or the component were needed. The test also checks that the user is still logged in after the refusal.

## Relevance

No existing E2E test reaches this state. The Selenium driver sets `allow_user_deletion=True`, and `lib/galaxy_test/selenium/test_personal_information.py::test_delete_account` only covers the success path. That is why a new integration Selenium test was added.

## Environment notes (Ubuntu 26.04 host, no sudo)

- Browser: the recipe from `earlier_drafts/1/screenshot_debrief.md` worked without changes. It uses the following steps:
  1. `apt-get download` the GTK/ATK/X library debs and fonts, then unpack them with `dpkg-deb -x` into a scratch root.
  2. Set `LD_LIBRARY_PATH` to that root.
  3. Set `FONTCONFIG_FILE` to a `fonts.conf` that lists the scratch fonts.
  4. Set `SE_BROWSER_PATH` to a wrapper that runs selenium-manager's Chrome 156 with `--no-sandbox`.
- Client build: gulp had already finished in the earlier attempt. `pnpm exec webpack` in development mode, under node 22.13.0, took about 5 minutes. `pnpm run stage-build` then copied it into `static/dist`, which is gitignored and not committed.
- Pytest has two pitfalls on this host:
  - Pass `-p no:postgresql`. The `pytest_postgresql` plugin fails to import because libpq is missing.
  - Leave `GALAXY_TEST_SELENIUM_HEADLESS` unset (`auto`). Setting it to `1` sends the run through pyvirtualdisplay, which is not installed. In `auto` mode with `GALAXY_TEST_SELENIUM_BROWSER=CHROME`, Chrome runs natively headless.
- Working command, run from WORKING_DIRECTORY with the env above: `GALAXY_TEST_SELENIUM_BROWSER=CHROME GALAXY_TEST_SCREENSHOTS_DIRECTORY=<dir> PYTHONPATH=lib .venv/bin/pytest test/integration_selenium/test_user_deletion_disabled.py -p no:postgresql`
- The test framework started the Galaxy server on a random port and stopped it when the run ended. No other servers were started.
