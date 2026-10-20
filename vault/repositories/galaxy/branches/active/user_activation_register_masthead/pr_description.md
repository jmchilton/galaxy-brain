Add the missing browser test for creating an account from the masthead and activating it by email, the flow GTN's [`account_create` FAQ](https://training.galaxyproject.org/training-material/faqs/galaxy/account_create.html) walks new users through.

| Inactivity banner after registering | Resend Verification | Emailed activation link |
|---|---|---|
| ![Home page after registering from the masthead: orange banner saying the account isn't activated yet, ending with a Resend Verification link](screenshots/user_activation_inactive.png) | ![Green message: the activation link has been sent again](screenshots/user_activation_resent.png) | ![Green message: Your account has been successfully activated!](screenshots/user_activation_activated.png) |

These are the new test's own screenshots. Nothing in the suite drove this before. `test_registration.py` only registers through Login → "Register here", so the masthead's **Register** button had a `navigation.yml` selector and no test that clicked it. Activation was only tested below the browser, in unit, Vitest and API integration tests: no browser test saw the inactivity banner, clicked **Resend Verification**, or followed the emailed link. Replaying the FAQ against 26.2 found every step working, so ***this PR changes no Galaxy behavior. It adds the tests that would catch the flow breaking. It targets `release_26.2` and is labeled a bug because the gap is in the release's test coverage of how new users get in, not in Galaxy itself.***

The test does catch a break. With `activate` changed locally to show "successfully activated" without activating the user, the test fails at its last check: the banner is still there.

- `test_registration_from_masthead` registers with the masthead's **Register** button, using a new `register(via_masthead=True)` option. The default path is unchanged.
- `test/integration_selenium/test_user_activation.py` turns on `user_activation_on` and registers from the masthead. It waits for the banner, clicks **Resend Verification** and checks the resent email. Then it follows that email's activation link, checks "successfully activated", and checks the banner is gone once the home page reloads. It passes on both Playwright and Selenium.
- `navigation.yml` gains an `inactivity_box` component (`#inactivebox` and its resend link).

***The new test needs to read Galaxy's emails, so this PR also extracts `ConfiguresMockEmails`, an integration-test mixin. Three existing integration tests already hand-rolled this setup, and they now use the mixin. That's why `test_error_report.py` and `test_tool_installation_request_form.py` are in the diff.***

<details><summary><code>ConfiguresMockEmails</code></summary>

It lives in `galaxy_test.driver.integration_util` beside the other `Configures*` mixins.

- `_configure_mock_emails(config)` sets `email_from` and points `smtp_server` at `mock_emails_to_path://<tmp>/email.json`.
- `_read_mock_email()` returns the last email as a dict.
- `_read_activation_link(address)` checks `to` and the activation subject, then returns the link. If the body has no link, the assertion message includes the body.

`TestAdminResendActivationEmail` (`test_users.py`), `TestErrorEmailReportIntegration` and `TestToolInstallationRequestFormEmailContentIntegration` were each building the `smtp_server` URL, reading `email.json` and, in `test_users.py`, regexing the link twice. They now call the mixin and keep every assertion they had. `test_email_change_deactivates_and_mails_the_new_address` now also checks the email has an activation link. `TestErrorEmailReportIntegration` also loses a `string.Template` substitution that never substituted anything. All three now send from the mixin's `galaxy-noreply@example.com`; no assertion checks the sender.

</details>

<details><summary>Notes for reviewers</summary>

- With `user_activation_on`, registration also checks the email domain in DNS. The test registers with an `@example.org` address, so a runner without network access would fail at registration. There's no config option to skip the check.
- The resend link is selected by `href*="resend_verification"`, not a `data-description`, so this PR doesn't touch `App.vue`.
- `NavigatesGalaxy.register` gets a docstring. Without one, `inspect.getdoc` returned `ABC.register`'s "Register a virtual subclass of an ABC".

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It only changes tests and test helpers.

## Context

Part of 🌿[`galaxy_ui_driver`](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver), used to replay GTN FAQs against 26.2 for release QA; this is one of the coverage gaps that replay found. Alternative kept on 🌿[`user_activation_register_masthead_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/user_activation_register_masthead_alt_original_scope) - the mixin is used only by `test_users.py` and the new test, leaving the error-report and tool-installation-request tests hand-rolled.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Widened once so every Galaxy integration test that mocks email uses the new mixin; kept as built after that.</summary>

- The first pass moved the error-report and tool-installation-request tests onto the mixin, so it didn't become a third shared-looking copy next to two hand-rolled ones.
- Possible splits, not recommended: the mixin and its migration as their own PR, then the E2E tests on top.
- Declined as different layers or new work: the Tool Shed test driver and a unit test that also build `mock_emails_to_path` URLs, a users populator helper, and a password-reset E2E test.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural problems; removed dead error-report state the migration left behind.</summary>

- `TestErrorEmailReportIntegration` kept a `reports_directory` nothing read any more and a template substitution with no placeholder. Both are gone.
- Kept: `via_masthead` as a flag on `register()`, since the fill, submit and assert steps are shared, and `os.remove(self.email_path)` in the one test that clears mail.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Made the activation test register from the masthead, and moved the last inline email check onto the mixin.</summary>

- The activation test had registered through the login page. It now uses the masthead, as the FAQ does.
- `test_email_change_deactivates_and_mails_the_new_address` uses `_read_activation_link`, which keeps its `to` and subject checks and adds a link check.
- There's no behavior change, so there's no red-to-green: the new tests cover behavior that already works.

</details>

### ✅ Second Frontier Model Review

<details><summary>Codex found nothing.</summary>

- It reviewed the diff with the selenium/Playwright drivers, the activation controllers, the email template and the masthead and login components. It reviewed statically and ran no tests.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>History already in shape: mixin extraction first, then a docstring, then the new tests.</summary>

- The mixin commit stands alone; each of its methods has a caller in the existing tests.
- `register(via_masthead=)` and `inactivity_box` stay with the tests that use them.

</details>

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A failing test stops at a named step: a missing-component wait, `assert_success_message` naming the expected text, or the mixin's assertion with the email body when there's no activation link.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. There are no unit tests; the E2E test drives the real UI and follows the real emailed link.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A. No behavior changes, so the whole branch is coverage.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `test/integration_selenium/test_user_activation.py`: passes on Playwright and Selenium.
- `lib/galaxy_test/selenium/test_registration.py`: all 11 pass on Playwright; the masthead and default paths also pass on Selenium.
- Mixin consumers: `test_users.py::TestAdminResendActivationEmail` (3), `test_error_report.py::TestErrorEmailReportIntegration`, `test_tool_installation_request_form.py::TestToolInstallationRequestFormEmailContentIntegration`.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
