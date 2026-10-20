# user_activation_register_masthead

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:user_activation_register_masthead?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/user_activation_register_masthead)

## Status

Polished on `release_26.2`, head `7857f4ca51e`; ready for final review, framed as missing E2E coverage for the release.

No PR.

Fork CI on `7857f4ca51e` still queued at handoff, no failures yet.

## Scope

E2E coverage for GTN's `account_create` FAQ: register from the masthead Register button (`register(via_masthead=True)`), then with `user_activation_on` see the inactivity banner, click Resend Verification, follow the emailed activation link, and see the banner gone. Adds an `inactivity_box` navigation component and `test/integration_selenium/test_user_activation.py`.

Bottom commit adds a `ConfiguresMockEmails` mixin in `galaxy_test.driver.integration_util`; `test_users.py`, `test_error_report.py` and `test_tool_installation_request_form.py` now use it (scope expansion; pre-expansion branch in [alts/original_scope.md](alts/original_scope.md)).

Brings `c31fcb13a8e` (one-line `register` docstring) because the test commit edits that docstring. The upstreaming plan had it folded into the `galaxy.selenium` PR; it goes here instead.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Drop `c31fcb13a8e` and `4d391ac7e36` from `galaxy_ui_driver` once this merges.

[Initial implementation](initial_implementation_debrief.md) · [Implementation debrief](implementation_debrief.md)

[PR description](pr_description.md) · [PR titles](pr_titles.md) · [PR tags](pr_tags.md) · [Polish debrief](polish_debrief.md)
