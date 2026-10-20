# Scope evaluation (pass 2, post-rescope) — user_activation_register_masthead

**Recommendation: keep as implemented.** The pass-1 expansion landed: `ConfiguresMockEmails` is now the only way Galaxy integration tests configure and read mock email (4 consumers, no inline copies left). Every remaining candidate is a different layer (Tool Shed driver, unit test), pre-existing code the branch doesn't touch (users populator helper), new feature coverage (password-reset E2E), or a production touch three reviews already declined (`data-description` in `App.vue`). None is a modest generalization of this branch's code. An optional one-line `ConfiguresMockEmails` row in the `writing_tests.md` Configuration Mixins table is polish, not scope; it can be done or skipped without parking the branch.

Reviewed `origin/release_26.2..user_activation_register_masthead` at `7857f4ca51e` (3 commits; 8 files, +102/-57, all test code, helpers or `navigation.yml`). Inputs: index, alts/original_scope, initial + rescope debriefs, pass-2 test challenges, polish, codex, thermo, baseline refactor, both subagent reviews, the pass-1 [scope evaluation](earlier_drafts/1/scope_evaluation.md), and the [upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md).

## Possible Decompositions

Roughly 160 changed lines, about half of them deletions from the mixin migration. Not a recommendation.

1. **One PR (as is).** Mixin + 4-consumer migration, docstring, masthead registration, activation E2E.
2. **Two PRs.**
   - (a) `7dc39c97151`: `ConfiguresMockEmails` + `test_users.py`, `test_error_report.py`, `test_tool_installation_request_form.py` migration. Pure integration-test refactor, no E2E.
   - (b) After (a): `24c02011c2b` docstring + `7857f4ca51e` (`register(via_masthead=)`, `test_registration_from_masthead`, `inactivity_box`, `test_user_activation.py`).
3. **Three PRs.**
   - (a) As 2a.
   - (b) Independent of (a): docstring + `register(via_masthead=)` + `test_registration_from_masthead` (selenium-only, no integration server).
   - (c) After (a) and (b): `inactivity_box` + `test_user_activation.py`. It now registers `via_masthead=True` (pass-2 test challenges), so unlike pass 1 it depends on (b).

## Scope items raised by reviews

| Source | Item | Disposition |
|---|---|---|
| pass-1 scope eval | Move tool-install and error-report tests onto the mixin | Done (rescope) |
| pass-2 test challenges | Last inline to/subject copy in `test_email_change_...` | Done (amended into mixin commit) |
| pass-2 thermo | Dead `reports_directory` state after migration | Done |
| thermo, test challenges | `ConfiguresMockEmails` row in `writing_tests.md` | Optional polish (scope B) |
| thermo | Tool Shed driver + `test/unit/app/tools/test_error_reporting.py` hand-roll `mock_emails_to_path` | Decline (scope C) |
| test challenges | `users` populator helper for email change / active lookup | Decline (scope D) |
| pass-1 scope eval | Password-reset email E2E | Decline (scope E) |
| normal review, test challenges, polish | `data-description` on the Resend link in `App.vue` | Decline (scope F) |
| thermo | `_clear_mock_email()` instead of `os.remove(self.email_path)` | Not scope; one caller |
| thermo | `via_masthead` bool vs separate method | Not scope; kept |
| normal review, test challenges | `example.org` DNS lookup under `user_activation_on` | Not scope; needs a production config knob |

## A. As implemented (recommended)

`ConfiguresMockEmails` mixin in `integration_util.py` with `_configure_mock_emails`, `_read_mock_email`, `_read_activation_link`, used by all four Galaxy integration tests that mock email. `register(via_masthead=)` + masthead registration test; `inactivity_box` component; integration-selenium E2E for masthead register → inactivity banner → resend → emailed link → banner gone.

| Pros | Cons |
|---|---|
| Covers the GTN `account_create` FAQ flow end to end, from the same entry point (masthead) the FAQ uses. Green on both backends. | Slightly beyond "upstream one gxui commit": the mixin and 3-file migration are new here. Decomposition 2/3 isolates that if a reviewer objects. |
| Leaves a real shared abstraction, not a third copy; matches sibling `Configures*` mixins. | Touches 2 integration test files unrelated to activation (net deletions). |
| Production code untouched; release-branch friendly. Codex: no findings; thermo: no structural issues. | |

## B. Polish: document the mixin in `writing_tests.md`

Add `| ``ConfiguresMockEmails`` | Capture sent email as JSON | ``_configure_mock_emails()``, ``_read_mock_email()`` |` to the Configuration Mixins table (`doc/source/dev/writing_tests.md:987`).

| Pros | Cons |
|---|---|
| Makes the new abstraction discoverable to the next test author, which is the point of extracting it. One line. | Table is already non-exhaustive (lists 4 of ~10 mixins; `ConfigureAllowedUrlHeaders`, `ConfiguresFileSourceTemplates`, `UsesFakeAIProvider` are absent), so its absence isn't an inconsistency. |
| | Adds a docs file to a test-only PR. Not worth parking the branch over; do it in-line if convenient or skip. |

## C. Expansion: Tool Shed driver and unit test onto the mixin

`lib/tool_shed/test/base/driver.py:149` and `test/unit/app/tools/test_error_reporting.py:28` still build `mock_emails_to_path://` by hand.

| Pros | Cons |
|---|---|
| Last two hand-rolled uses in the repo. | Neither has a `GalaxyTestDriver` / `handle_galaxy_config_kwds`; the mixin's shape doesn't fit. Making it fit means a second, lower-level helper — new abstraction for two unrelated layers. Not a modest generalization. |

## D. Expansion: `users` populator helper

`_put(f"users/{id}", {"email": ...})` and the `f_email` active lookup repeat in `TestAdminResendActivationEmail` and `api/test_users.py`.

| Pros | Cons |
|---|---|
| Removes small duplication in user API tests. | Pre-existing code the branch's diff doesn't add or change. Unrelated to mock email or the E2E. Follow-up material. |

## E. Expansion: password-reset email E2E

Read the reset email via the mixin, follow its link, set a new password; `test_login.py::test_reset_password_link` stops at the "sent" alert.

| Pros | Cons |
|---|---|
| Sibling account-email flow; would be the mixin's 5th consumer. | New feature coverage, not a generalization of touched code. Needs a reset-link helper, new components and a second integration-selenium test — doubles the E2E surface. Not part of the gxui commits being upstreamed. Good follow-up. |

## F. `data-description` on the Resend Verification link

| Pros | Cons |
|---|---|
| Best-practice selector. | Makes a test-only release PR touch `App.vue`. `#inactivebox a[href*="resend_verification"]` is specific and lives in `navigation.yml`. Declined by 3 reviews. |

## G. Contraction: revert to original scope (`_alt_original_scope`)

Mixin used only by `test_users.py` and the new E2E.

| Pros | Cons |
|---|---|
| 2 fewer files. | Leaves two hand-rolled neighbours next to a new shared helper — the exact thing pass 1 expanded to fix. Not recommended. |

## H. Contraction: drop the mixin entirely

| Pros | Cons |
|---|---|
| Pure cherry-pick of gxui commits. | Third (now fifth) copy of mock-email config/parsing; every review flagged it. Not recommended. |
