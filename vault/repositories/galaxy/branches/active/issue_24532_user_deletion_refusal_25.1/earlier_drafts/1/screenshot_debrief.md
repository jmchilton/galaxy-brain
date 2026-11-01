Run via Claude Opus 5.5 at low effort.

# Screenshot debrief: issue_24532_user_deletion_refusal_25.1

**Top-line: screenshots are relevant, but none were recorded in this pass. This is an environment limitation, not a BLOCKER.** The coordinator stopped the step before the first run because the branch is being re-scoped (a `deleting` in-flight state is being added to `UserDeletion.vue`). Screenshots will be redone during re-hardening. A working browser path on this host was found and is described below.

## Relevance

The change is visible in the UI. On a failed deletion, the Delete Account modal now stays open and shows "User deletion must be configured on this instance…" when the server refuses with `403004`. No existing E2E test reaches this state:

- The Selenium driver sets `allow_user_deletion=True`.
- `lib/galaxy_test/selenium/test_personal_information.py::test_delete_account` only covers the success path.

A new integration Selenium test is needed.

## Draft test (untracked, not committed)

`test/integration_selenium/test_user_deletion_disabled.py` in WORKING_DIRECTORY. It passes ruff, black and isort, but it has never been run. It is a `SeleniumIntegrationTestCase` with `allow_user_deletion = False`. The test does the following:

1. Registers a user and opens User Preferences, then Delete Account.
2. Types the user's email and clicks "Delete Account Permanently".
3. Checks that `.alert-danger` contains "User deletion must be configured on this instance".
4. Checks that the modal's `#name-input` is still visible, then takes the screenshot `user_deletion_refused_by_configuration`.
5. Reopens preferences to confirm the user is still logged in.

After the re-scope, it may need a wait for the `deleting` state to clear before the alert assertion.

## Environment: how to get a browser on this host (no sudo, no system changes)

- The Playwright and Selenium browser builds are present but cannot start. The system is missing GTK/ATK/X libraries (`libatk-1.0`, `libgbm`, `libcups`, `libcairo`, `libpango`, `libXcomposite` and others). Firefox also fails, because the system `libnss3` is too old (`NSS_3.126`).
- 25.1 has no Playwright backend, so the only option is Selenium.
- Recipe that worked, using a Selenium Chrome session through `galaxy.selenium.driver_factory`:
  1. `apt-get download` the missing library debs. The list is `libatk1.0-0t64 libatk-bridge2.0-0t64 libatspi2.0-0t64 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2t64 libcups2t64 libcairo2 libpango-1.0-0 libxkbcommon0 libwayland-server0 libpixman-1-0 libxrender1 libxcb-render0 libxcb-shm0 libfontconfig1 libthai0 libfribidi0 libharfbuzz0b libdatrie1 libavahi-client3 libavahi-common3 libgraphite2-3`, plus fonts (`fonts-liberation`, `fonts-dejavu-core`).
  2. Unpack them with `dpkg-deb -x` into a scratch root.
  3. Export `LD_LIBRARY_PATH=<root>/usr/lib/x86_64-linux-gnu`.
  4. Point `FONTCONFIG_FILE` at a `fonts.conf` that lists `<root>/usr/share/fonts`. There is no `/etc/fonts`, and without this pages render blank.
  5. Set `SE_BROWSER_PATH` to a wrapper script that runs selenium-manager's Chrome 156 (`~/.cache/selenium/chrome/linux64/156.0.8078.80/chrome`) with `--no-sandbox`. Unprivileged user namespaces are restricted by AppArmor, so the sandbox kills Chrome under chromedriver.
- The client is not built. 25.1 uses webpack, and integration Selenium tests serve Galaxy's own `static/dist`. A development build had started (`npm_config_use_node_version=22.13.0 pnpm exec gulp && pnpm exec webpack`, then `cpy 'dist/*' '../static/dist'`). Gulp finished in about 4 minutes, but webpack was stopped partway at the coordinator's request. `static/dist` does not exist yet, and gulp installed visualization plugins under `config/plugins/visualizations/`.
- To run the test: `GALAXY_TEST_SELENIUM_BROWSER=CHROME GALAXY_TEST_SELENIUM_HEADLESS=1 PYTHONPATH=lib .venv/bin/pytest test/integration_selenium/test_user_deletion_disabled.py`, with `GALAXY_TEST_SCREENSHOTS_DIRECTORY` set and the env above.

## Screenshots

None. No Galaxy or Vite servers were started, and the build was stopped.
