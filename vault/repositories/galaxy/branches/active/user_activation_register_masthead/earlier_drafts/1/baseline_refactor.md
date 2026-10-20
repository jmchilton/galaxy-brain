One refactor commit was added on top of the base: a `ConfiguresMockEmails` mixin in `lib/galaxy_test/driver/integration_util.py`. `test/integration/test_users.py` now uses it, and so does the new E2E test.

## History rewrite

- Old HEAD: `a39e92b08e6`. Base unchanged: `c686feb4f5a` (`origin/release_26.2`).
- New history:
  1. `f132af8c195` Extract ConfiguresMockEmails integration test mixin
  2. `7d5b12f9ce6` Document NavigatesGalaxy.register (cherry-picked from `204351544e5`, no changes)
  3. `f93600ecf44` Test registering from the masthead and activating an account (cherry-picked from `a39e92b08e6`, amended to use the mixin, message kept)
- `git diff a39e92b08e6 HEAD` touches only `integration_util.py`, `test_users.py` and `test_user_activation.py`.

## The mixin

`ConfiguresMockEmails` follows the neighbouring `Configures*` mixins (`ConfiguresDatabaseVault`, `ConfigureAllowedUrlHeaders`). It lives in `galaxy_test.driver.integration_util`, which `test/integration` and `test/integration_selenium` both already import. It adds one stdlib import (`json`) and no new package dependency.

- `_configure_mock_emails(config)`, a classmethod called from `handle_galaxy_config_kwds`, sets `cls.email_path` (a temp `email.json`), `email_from`, and `smtp_server=mock_emails_to_path://...`. Each test class still sets its own activation settings (`user_activation_on`, `activation_grace_period`).
- `_read_mock_email()` loads the last email as a dict.
- `_read_activation_link(email_address)` asserts the recipient and the "Galaxy Account Activation" subject, then returns the `/user/activate` link.

## Call sites

- `TestAdminResendActivationEmail` in `test_users.py`: its config block became one mixin call, and the `email_directory` ClassVar was dropped.
  - `test_email_change_deactivates_and_mails_the_new_address` now uses `_read_mock_email()` and keeps its own `to` and subject asserts, so its behavior is unchanged.
  - `_change_email_and_read_activation_token` now uses `_read_activation_link`. This adds one subject assert (strengthened, not weakened).
  - `test_resend_activation_includes_qualified_link` now uses `_read_activation_link` and keeps its `activation_token=` and `email=` asserts. Only the assert message text changed.
- `test_user_activation.py` dropped its config block, its `email_directory` and `_email_path` names, and its private `_activation_link`, which leaves it with only the `os` import. Merging the two path names (deferred in the thermo review) is done, since the mixin's `email_path` replaces both.

## Not converted (possible follow-ups)

- `test/integration/test_tool_installation_request_form.py` uses the same `mock_emails_to_path` pattern, but with a different `email_from` string.
- `test/integration/test_error_report.py` also writes an error-report config to the same directory.
- Both would fit the mixin, but they are unrelated to this branch, so changing them would only add review noise here.

## Tests (final HEAD)

- `test/integration/test_users.py -k "ResendActivation or Activation"`: 3 passed.
- `test/integration_selenium/test_user_activation.py`: passed under Playwright (headless) and under Selenium.
- ruff check, ruff format and black are clean on the touched files. mypy reports no errors in `integration_util.py`. Pre-commit hooks passed.
