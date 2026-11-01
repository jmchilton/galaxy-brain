Run via Claude Opus 5.5 at low effort.

**Top-line:** Moved the delete-account flow into a shared `request_account_deletion` helper with no sleep, scoped the refusal assertion to a new modal-local `preferences.delete_account_error` navigation target, and added checks that the email is kept and the OK button is clickable again. The new test and the existing `test_delete_account` passed green twice.

## Changes (commit `551bc3a8e7f`, pushed)

- `client/src/utils/navigation/navigation.yml`: added `preferences.delete_account_error: '#modal-user-deletion .alert-danger'`. The old `assert_error_message` matched any `.alert-danger` on the page. The new target only matches the alert inside the deletion modal. It uses the existing `id="modal-user-deletion"`, so no client or DOM change was needed.
- `lib/galaxy/selenium/navigates_galaxy.py`: added `request_account_deletion(email)`. It goes to User Preferences, clicks Delete Account, types the email and clicks OK. Both deletion tests used these same steps, so they now share the helper.
- `test/integration_selenium/test_user_deletion_disabled.py`: uses the helper. Three checks follow it:
  - the refusal text, read from the modal-scoped target;
  - the email input still holds the email;
  - `delete_account_ok_btn.wait_for_clickable()`, which checks that `deleting` is reset after the failure, a behavior this branch added.
- `lib/galaxy_test/selenium/test_personal_information.py::test_delete_account`: uses the helper. Its behavior is unchanged.

## Sleep removal

`sleep_for(UX_RENDER)` came from the original `test_delete_account` and was removed. Here is why it was not needed:

- The Delete Account card is behind `v-if="isConfigLoaded && ..."`, and `wait_for_and_click` already waits for it.
- The next step, `delete_account_input.wait_for_and_send_keys`, would fail at once if the click had missed.

Both tests passed in two runs in a row without the sleep.

## Screenshots

The test was already the only E2E coverage of this state and already took a screenshot. I re-captured it after the changes. The image matches the earlier one: the red refusal alert is shown, the email field is valid, and the OK button is enabled. It was copied over `screenshots/user_deletion_refused_by_configuration.png`.

## Not done

- No client refactor. This targets release_25.1, and the existing `#modal-user-deletion` id was enough to scope the selectors.
- `delete_account_ok_btn` (`.modal-footer .btn-danger`) and `delete_account_input` (`#name-input`) still use the old global selectors. They work, and changing them would touch existing targets for little gain.
