# Normal review debrief

Acted on #1: the activation test now waits for `logged_in_only` before asserting the inactivity banner is gone. The banner needs `galaxy.user?.id` (`App.vue:205`), so the old order could pass before the user loaded. Green on Playwright and Selenium; amended into the test commit.

Not acted on:
- #2 shared activation-email helper (3rd copy of regex + `mock_emails_to_path` config from `test/integration/test_users.py`): handed to the baseline-refactor step.
- #3 real DNS lookup of `example.org` under `user_activation_on`: comment documents it; only offline runners at risk.
- #6 redundant `self.home()` before `register()`: mirrors existing `test_registration`.
- #7 `data-description` on the resend link: would make the branch touch `App.vue`; `#inactivebox a` fine with one link.
- #4, #5, #8: no issue.

<details><summary>Full review</summary>

**should-fix**

1. `test_user_activation.py:40-42`: `assert_absent_or_hidden()` right after `home()` can pass before the user/config loads (`v-if="showInactivityWarning && ..."`). Swap order: wait for `logged_in_only` first.
2. `test_user_activation.py:48-55`, `:16-21`: activation-link regex already inlined twice in `test/integration/test_users.py:168,181`; email.json read 3×; `mock_emails_to_path` config copied from `TestAdminResendActivationEmail`. Suggest a helper in `lib/galaxy_test/base/`.

**nit**

3. `:25-26`: `validate_email_domain_name` resolves MX/A for `example.org`; risk only on offline runners.
4. `:33-34`: email file race OK — `send_mail` writes synchronously before the request returns.
5. Activation link host built from request host (`qualified=True`); fine.
6. `navigates_galaxy.py`: `via_masthead=False` fits style; `self.home()` before `register()` redundant but mirrors `test_registration`.
7. `navigation.yml`: top-level `inactivity_box` naming/placement reasonable; `#inactivebox a` brittle but fine.
8. Imports top-level; `ClassVar` matches `test_users.py`.

</details>
