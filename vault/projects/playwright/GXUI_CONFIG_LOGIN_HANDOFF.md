# gxui configuration and login handoff

**Integrated 2026-10-09** into `galaxy_ui_driver` (gxui tip `2573f2f9f2d`; helper lift and context-test
split below it as 7k/7l; 7m storage state, 7n path-prefix URLs). Review fixes: login restore uses the new `ConfiguredDriver(storage_state=)`
(7m) instead of swapping the private browser context; the redaction test now reaches the failing
verb; daemon's old `--config`/`--storage-state` path and the `galaxy_test.selenium.gxui` shims
dropped (gxui never shipped); `import yaml` hoisted; isort.

2026-10-07. Published on `jmchilton/galaxy_ui_driver_followups`, tip
`b71d51ffc34`, in `~/projects/worktrees/galaxy/branch/galaxy_ui_driver_followups`.
This extends the [standalone package move](GXUI_PACKAGE_MOVE_HANDOFF.md).
The integration branch was based on Claude's `f561c00528d` snapshot; Claude's
worktree and running sessions were not edited. That worktree has since advanced.

**Integration branch — do not open an independent PR.** Fold the gxui changes
into the standing branch's final gxui commit after testing. Keep the helper moves
and context-test separation below that commit, as described in the package handoff.

## Commit

`b71d51ffc34` — Add gxui profiles, configuration commands and reusable login sessions.

The new implementation is in `lib/galaxy/selenium/gxui/`. The preceding package
move relocated code from `galaxy_test.selenium.gxui`; reconcile any newer edits
Claude made in that old namespace into the canonical modules during integration.
The complete user guide and examples are in `packages/selenium/README.rst`.
No active harness launcher or skill worktree was repointed while testing continued.

## Implemented behavior

- Named YAML profiles at `$XDG_CONFIG_HOME/gxui/config.yml`, falling back to
  `~/.config/gxui/config.yml`; `--config` overrides `GXUI_CONFIG`.
- Profile selection: `--profile`, `GXUI_PROFILE`, then `default_profile`.
  Runtime values: explicit CLI, environment, profile, defaults, builtins.
- Consistent environment defaults for headless mode, timeouts, CDP port,
  artifact directory, Playwright CLI attachment, session and URL. Both `--headed`
  and `--headless` override configured booleans. Profile names default session names.
- Offline `config init`, `profile add`, `profile list`, `set`, `unset`, and
  `show --resolved --sources`; edits validate before atomic owner-only writes.
- Authentication sources: literal password, environment reference, optional OS
  keyring, or saved browser state. Setting a source replaces the previous one.
  Changing an account clears its existing auth source. Flat legacy files remain
  readable; edits require a profile config rather than rewriting legacy files.
- Terminal login prompts with masked passwords; actionable errors in scripts;
  `--password-stdin` and environment credentials. Startup settings use a pipe;
  login credentials use private socket payload fields. Passwords are excluded
  from busy status, authentication errors and transcripts. Config display redacts
  passwords without reading referenced environment values or keyrings.
- Full saved cookie/local-storage restoration. `login --save` persists verified
  authentication and updates named profiles; `login --interactive` opens a headed
  browser, waits for Galaxy to confirm actual login, then saves state.
- Credentials and saved state bind to the full Galaxy base URL including path
  prefixes. Running sessions report their captured profile/URL/browser mode;
  conflicting starts and explicitly targeted verb/login calls fail.
- Optional `galaxy-selenium[keyring]` extra; service name
  `gxui:<canonical Galaxy base URL>` and configured username. Keyring provisioning
  remains with the backend's own tools.

## Quick start after integration

```sh
gxui config init
gxui config profile add local --url http://localhost:8080
gxui config set default_profile local
gxui config set auth.username developer@example.org
gxui start
gxui login                         # masked prompt if needed
gxui config show --resolved --sources
gxui login --save                  # future starts restore authentication
```

Use `gxui --profile NAME login --interactive` for browser/SSO sign-in. Config flags
precede commands; `start` also accepts them after the command. Existing daemons
must be stopped and restarted to load the new protocol and captured settings.

## Verification

- **93 checkout tests pass**: gxui, config/auth cases, moved UI helpers, standalone
  context, rerun parameters and legacy test-framework compatibility.
- **90 installed-wheel tests pass**, including those core cases and real Chromium
  login, saved-state restart/restoration and headed interactive login, in
  `/private/tmp/gxui-followups-env` with `galaxy_test` absent. Package pytest's
  `pythonpath=src` override was disabled so imports came from the installed wheel.
- Mypy passes for all six gxui source files. Black, Ruff, Flake8 and the remaining
  repository commit hooks pass; `git diff --check` is clean.
- Browser checks use ephemeral fixture servers and CDP ports, leaving the shared
  Galaxy/Vite servers available to Claude. No live institutional SSO or OS keyring
  was exercised: interactive behavior used a fixture UI, and keyring reads used
  mocked backends. No Galaxy-wide E2E or CI verdict is claimed.
- Existing test-environment warnings: a third-party Python deprecation warning in
  the checkout; unknown `asyncio_mode` in the minimal wheel environment.

Re-run the focused checkout checks:

```sh
cd ~/projects/worktrees/galaxy/branch/galaxy_ui_driver_followups
PYTHONPATH=lib ~/projects/worktrees/galaxy/branch/playwright_text_table_parity/.venv/bin/python -m pytest \
  test/unit/selenium/test_gxui.py test/unit/selenium/test_gxui_config.py \
  test/unit/selenium/test_gxui_auth.py test/unit/selenium/test_ui_helpers.py \
  test/unit/selenium/test_context.py test/unit/selenium/test_tool_form_parameters.py \
  test/unit/test_selenium_ui_compatibility.py test/unit/test_selenium_test_context.py
```
