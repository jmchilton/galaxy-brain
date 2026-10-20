No refactoring of the base branch was performed. The history already has the right shape: the refactor is first, then a doc-only commit, then the feature. Nothing left in the feature commit is a behavior-preserving refactor.

## History evaluated (unchanged)

Base `origin/release_26.2`. Head `7857f4ca51e`.

1. `7dc39c97151` Extract ConfiguresMockEmails integration test mixin
2. `24c02011c2b` Document NavigatesGalaxy.register
3. `7857f4ca51e` Test registering from the masthead and activating an account

## Why no further split

- **Mixin commit (`7dc39c97151`)** stands on its own. Every mixin member (`_configure_mock_emails`, `_read_mock_email`, `_read_activation_link`) has a caller on base (`test_users.py`, `test_error_report.py`, `test_tool_installation_request_form.py`). It carries nothing that only the new E2E test needs. After the rescope it is the bottom commit, which is right.
- **Docstring commit (`24c02011c2b`)** is doc-only. It goes before the feature so that the feature diff shows only the `via_masthead` docstring change.
- **`register(via_masthead=...)`** is not a refactor. It adds a new path through the masthead Register button, and the default path is unchanged. A separate commit would be "add helper option + `test_registration_from_masthead`". That is a feature commit of its own, not base restructuring. It is 8 lines and only exists for the new tests, so splitting it would add a commit without making review easier.
- **`inactivity_box` navigation component** is used only by `test_user_activation.py`. Moved into an earlier commit, it would be an unused selector block. It belongs with its only consumer.
- **Order** is right: refactor, then doc, then feature. No commit depends on a later one.

## Tests

None were rerun, because history was not rewritten. The pass-2 hardening debriefs already cover this head.
