# Scope evaluation — user_activation_register_masthead

**Recommendation: modest expansion. Move the two remaining `mock_emails_to_path` integration tests, `TestToolInstallationRequestFormEmailContentIntegration` and `TestErrorEmailReportIntegration`, onto the new `ConfiguresMockEmails` mixin, so that it is the only way integration tests configure and read mock email. Keep everything else as implemented. Password-reset email E2E coverage and a `data-description` on the Resend link in `App.vue` stay out of scope.**

Reviewed `origin/release_26.2..user_activation_register_masthead` (3 commits: `f132af8c195` mixin, `7d5b12f9ce6` docstring, `f93600ecf44` tests; 6 files, +87/-27). Inputs: index, initial debrief, normal review, test challenges, polish, codex, thermo, baseline refactor, the [upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md), and the sibling `workflow_editor_run_cancel` scope evaluation.

## Possible Decompositions

The branch is about 114 changed lines, nearly all test code. Possible splits:

1. **One PR (as is).** The mixin, the docstring, the masthead registration test and the activation E2E land together.
2. **Two PRs.**
   - (a) `f132af8c195` `ConfiguresMockEmails` + the `test_users.py` conversion (plus the expansion below, if taken). This is a pure test refactor with no E2E.
   - (b) After (a): the docstring, `register(via_masthead=)`, `test_registration_from_masthead`, `inactivity_box` and `test_user_activation.py`.
3. **Three PRs.**
   - (a) The mixin, as in 2a.
   - (b) Independent of (a): the docstring, `register(via_masthead=)` and `test_registration_from_masthead`. This is all in `lib/galaxy_test/selenium` + `navigates_galaxy.py`.
   - (c) After (a): `inactivity_box` + `test_user_activation.py`. It calls `register(email)` on the default path, so it does not need (b). It only conflicts with (b) textually, through the docstring commit.

## Scope items raised by earlier reviews

| Source | Item | Disposition |
|---|---|---|
| initial, normal review #2, test challenges, polish, thermo | Activation-email parsing copied a 3rd time from `test_users.py` | Done in the baseline refactor (`ConfiguresMockEmails`) |
| baseline refactor "Not converted" | `test_tool_installation_request_form.py`, `test_error_report.py` hand-roll the same `mock_emails_to_path` setup | **Expand** (scope B) |
| normal review #7, test challenges, polish | `data-description` on the Resend link in `App.vue` | Decline (scope D) |
| test challenges | Activation test registers via the login page, not the masthead as the GTN FAQ does | No change. Masthead registration has its own test, and this is a one-arg swap if a reviewer asks. |
| normal review #3 | Real DNS lookup of `example.org` under `user_activation_on` | No change. It's documented in a comment, and only offline runners are at risk. |
| thermo | `via_masthead` boolean vs a separate method | Keep. It's not a scope question. |
| test challenges | Title the test commit "Baseline tests: …"? | Not a scope question. The branch is coverage only, with nothing for a baseline to precede. Leave the title as is. |

## A. As implemented

Adds `register(via_masthead=True)` and a masthead registration test. Adds an `inactivity_box` component and an integration E2E test for register → inactivity banner → resend → follow emailed link → banner gone. Extracts `ConfiguresMockEmails` into `integration_util.py` and converts `test_users.py` to use it.

| Pros | Cons |
|---|---|
| Covers the GTN `account_create` flow end to end. Green on both backends and reviewed by normal review, codex and thermo. | The new mixin has 2 consumers, while 2 more classes in `test/integration` still hand-roll the identical `smtp_server = mock_emails_to_path://…/email.json` + `json.load` pattern. A reviewer seeing a new shared helper will ask why the neighbours weren't moved. |
| Introduces a reusable abstraction rather than a 3rd copy, and it follows the `Configures*` mixin convention. | It's slightly more than "pull a commit out of `galaxy_ui_driver`": the mixin is new here and isn't in gxui. |
| Production code untouched. | |

## B. Modest expansion: all mock-email integration tests use the mixin (recommended)

Convert `TestToolInstallationRequestFormEmailContentIntegration`: `_configure_mock_emails(config)`, `self.email_path`, `self._read_mock_email()`, and drop `email_directory`. Convert `TestErrorEmailReportIntegration`: `_configure_mock_emails(config)` for `smtp_server`; keep its own temp dir for `error_report.yml`; `read_most_recent_error_report` becomes `_read_mock_email()`. Make this a separate commit after `f132af8c195`, and run each converted class once.

| Pros | Cons |
|---|---|
| Makes the mixin the one way to do mock email in integration tests, which turns a two-caller helper into an actual shared abstraction. | Touches 2 test files unrelated to user activation, so a little more review surface (about 15–20 lines net, mostly deletions). |
| Both conversions are mechanical. Neither test asserts the sender, so the mixin's `email_from` is harmless. | The error-report class gains `email_from = galaxy-noreply@example.com`, where before it had none. `errors.py:254` passes `config.email_from` as the sender, and the test never checks it. |
| Both files exist on `release_26.2`, so there's no backport friction. Fits in decomposition 2a / 3a if split. | Needs 2 more integration-test runs (one class each). |

<details><summary>Details</summary>

- `test_tool_installation_request_form.py:112-155`: it sets `email_from = "galaxy-no-reply@example.com"`, which differs from the mixin's `galaxy-noreply@example.com` by one hyphen. No assertion reads `from`. `assert not os.path.exists(email_path)` keeps working with `self.email_path`, because the mixin creates a fresh tmpdir and does not create the file.
- `test_error_report.py:76-114`: `read_most_recent_error_report` returns the raw string, which the test then `json.loads`. Swapping in `_read_mock_email()` removes that round trip. `TestErrorReportIntegration` (the JSON reporter, lines 24-74) doesn't use mock email and stays as is.
- `lib/tool_shed/test/base/driver.py` also uses `mock_emails_to_path`, but it's the Tool Shed driver, outside `galaxy_test.driver`. Out of scope.

</details>

## C. Further expansion: password-reset email E2E

`test_login.py::test_reset_password_link` stops at the "sent" alert. An integration-selenium test could use the mixin to read the reset email, follow its link and set a new password: the same shape as the activation test, for the other account-email flow.

| Pros | Cons |
|---|---|
| Reuses the mixin and pattern this branch introduces. It's the obvious sibling flow, and also untested end to end. | New coverage of a different feature, not code this branch touches. It would need a `_read_reset_link` helper, a new navigation component and another E2E test, which doubles the branch's E2E surface. |
| | Not part of the GTN `account_create` FAQ or the gxui commits being upstreamed. It's better as a follow-up. |

## D. Add a `data-description` to the Resend Verification link

Add `data-description="resend verification link"` in `App.vue` and point `inactivity_box.resend_verification` at it.

| Pros | Cons |
|---|---|
| It's the best-practice selector. | It makes a test-only branch touch production client code. The `a[href*="resend_verification"]` selector is already specific and lives in `navigation.yml`. Declined by 3 prior reviews. |

## E. Contraction: drop the mixin and keep the test self-contained

Revert `f132af8c195` and put the inline config/regex back in `test_user_activation.py`.

| Pros | Cons |
|---|---|
| The branch becomes a pure cherry-pick of the gxui commits and leaves `test_users.py` alone. | Reintroduces a 3rd copy of the email-parsing code, which every review flagged. That runs against the reuse preference. Not recommended. |

## F. Contraction: drop the masthead registration test

Ship only the activation E2E.

| Pros | Cons |
|---|---|
| A few lines smaller. | `via_masthead` is the only coverage of the masthead Register button, which is the GTN FAQ's entry point. The cost is 4 lines of test and a 2-way branch. Not recommended. |
