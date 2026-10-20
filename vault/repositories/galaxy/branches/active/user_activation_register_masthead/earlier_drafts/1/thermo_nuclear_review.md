# Thermo-nuclear review

No structural problems. Acted on one: removed the extra `self.home()` from `test_registration_from_masthead`, since `register()` already calls `home()`. Amended into the test commit, now `a39e92b08e6`. All 11 tests in `test_registration.py` pass under Playwright.

Not acted on:
- Duplicated activation-email handling (`mock_emails_to_path` config, `email.json` read, link regex; 3rd copy vs `test/integration/test_users.py`): left for the baseline-refactor step, as assigned. Also left alone: merging `email_directory` + `_email_path` into one `email_path` ClassVar. The shared helper will decide that shape, and for now the names match `test_users.py`, which keeps the extraction mechanical.
- `via_masthead` boolean on `register()`: kept. It only changes how the form gets opened, in one 2-way branch at the top of the method. Pulling it into a helper or a strategy would just move the `if`.
- The first `_activation_link(email)` call throws its return value away: it's there to check the registration email (to/subject/link). Rename it when the helper gets extracted. Not worth churn now.
- `navigates_galaxy.py` is 3357 lines: that was already true. The branch adds 5.
- Existing `test_registration` keeps its own redundant `home()`: it's outside the branch's scope.

<details><summary>Full review</summary>

Scope: `git diff origin/release_26.2...HEAD`, 4 files, +75/-3, test-only plus one test-helper option.

**Structural / code-judo**
- No regressions. `register(via_masthead=)` is the smallest change that fits: the masthead path skips the login page and its "Register here" toggle, and after that the two paths are the same. A separate `register_via_masthead()` would duplicate the fill/submit/assert tail. A helper that only opens the form wouldn't remove anything. `registration` moved above the branch so both paths share it. Fine.
- `inactivity_box` in `navigation.yml`: a new top-level component, with the selector in YAML rather than the test. Good. `a[href*="resend_verification"]` avoids touching `App.vue`.

**Duplication / canonical helpers**
- `test_user_activation.py` repeats `TestAdminResendActivationEmail`'s config block, its `email.json` read, and the activation-link regex (`test_users.py:168,181`). This is the one real reuse problem, and it's already assigned to the baseline-refactor step. Proposed shape: one mixin/helper in `lib/galaxy_test/base/` that configures `mock_emails_to_path` and exposes `read_last_email()` + `activation_link(email)`. Both API and Selenium integration tests can use it.
- `assert_success_message` already uses the canonical helper (polish step).

**Legibility nits**
- `test_registration_from_masthead` called `self.home()` before `register()`, which calls `home()` itself. Removed.
- `_activation_link` both validates the email and extracts the link. The first call uses it only to validate. Readable as is.
- `email_directory` ClassVar + `_email_path` property: two names for one path. Could collapse, but deferred with the helper.

**Checked, fine**
- Imports at top. No sleeps. No raw selectors in tests.
- `os.remove` + resend: the activation token is reused (`__get_activation_token` returns the existing token), so the two links are identical. Removing the file is the right way to prove a second email was sent. Asserting the links differ would be wrong.
- File sizes: `navigates_galaxy.py` was already over 1k lines (3357). The new test file is 58 lines.

**Tests run**
- `lib/galaxy_test/selenium/test_registration.py` (11 tests, includes `test_registration_from_masthead`), Playwright headless, self-hosted Galaxy (the 5173 Vite wasn't up): 11 passed.
- The integration activation test is unchanged and was not rerun.

</details>
