# user_activation_register_masthead

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:user_activation_register_masthead?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/user_activation_register_masthead)

## Status

Implemented on `release_26.2`, head `f2aac0f0dc2`; framed as missing E2E coverage for the release.

No PR.

CI not yet observed.

## Scope

E2E coverage for GTN's `account_create` FAQ: register from the masthead Register button (`register(via_masthead=True)`), then with `user_activation_on` see the inactivity banner, click its Resend Verification link, follow the emailed activation link, and see the banner gone. Adds an `inactivity_box` navigation component and `test/integration_selenium/test_user_activation.py`.

Brings `c31fcb13a8e` (one-line `register` docstring) because the test commit edits that docstring. The upstreaming plan had it folded into the `galaxy.selenium` PR; it goes here instead.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Drop both commits from `galaxy_ui_driver` once this merges.

[Initial implementation](initial_implementation_debrief.md)
