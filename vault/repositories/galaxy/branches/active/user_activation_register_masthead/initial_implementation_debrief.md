# Initial implementation debrief — user_activation_register_masthead

Base `release_26.2` (`c686feb4f5a`). Cherry-picked from `galaxy_ui_driver`, both clean:

1. `204351544e5` Document NavigatesGalaxy.register (from `c31fcb13a8e`)
2. `f2aac0f0dc2` Test registering from the masthead and activating an account (from `4d391ac7e36`)

## Dependencies

Only `c31fcb13a8e`: the test commit rewrites the docstring it adds. Everything else the test uses already exists on 26.2: `masthead.register_masthead_button`, `masthead.logged_in_only`, `_.messages.all`, `_get_random_email(domain=)`, `mock_emails_to_path://`, `#inactivebox` in `App.vue`, the resend message in `controllers/user.py`, the subject in `managers/users.py`.

## Tests

All green, one at a time:

| Test | Playwright | Selenium |
|---|---|---|
| `test_registration.py::test_registration` (existing path through refactored `register`) | ✓ | ✓ |
| `test_registration.py::test_registration_from_masthead` | ✓ | ✓ |
| `test/integration_selenium/test_user_activation.py` | ✓ | ✓ |

Registration tests ran against another session's Vite on 5173 (same 26.2 client; only Python + `navigation.yml` change here). The integration test started its own Galaxy with this worktree's built client.

## Red → green

Coverage-only, no production change, so no red. Without `via_masthead` the masthead test can't be written; the activation test guards existing behavior.

## Notes

- Baseline-tests-first doesn't map: the branch is all tests plus a test-helper option.
- `test/integration/test_users.py` already inlines the same activation-link regex twice; this adds a third copy. Candidate for a shared helper — left to hardening.
- Upstream plan said "green under Playwright only so far"; Selenium is now green too.
