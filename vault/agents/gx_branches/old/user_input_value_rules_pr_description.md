*Drafted by Claude (AI assistant) on behalf of jmchilton.*

# Finish moving value-only user rules to `galaxy.util.user_input`; type `username`

Follow-up to #23773.

The `galaxy.util.user_input` docstring says it holds the user-field rules that depend only on the value. The public name and password rules were still in `galaxy.security.validate_user_input`, which meant value rules had two homes. This PR moves them and gives `username` a schema type.

## Move

- `validate_publicname_str`, `transform_publicname`, `validate_password_str`, `PUBLICNAME_MAX_LEN`, `VALID_PUBLICNAME_RE`, `VALID_PUBLICNAME_SUB`, `FILL_CHAR` and `PASSWORD_MIN_LEN` now live in `galaxy.util.user_input`. That module still imports only `re` and `unicodedata`, so galaxy-util picks up no new dependencies.
- The rules that need the database or config stay in `galaxy.security`: `validate_email`, `validate_publicname` (uniqueness), `validate_password` (confirm), the ban list and domain checks.
- In-tree importers now use the new module: `galaxy.model`, the tool shed model, `buildapp.py`, the LDAP provider and the OIDC integration test. In that test the import was also moved to the top of the module.
- `galaxy.security.validate_user_input` re-exports every moved name. It also re-exports the email and display-name names that #23773 removed (`validate_email_str`, `is_valid_email_str`, `VALID_EMAIL_RE`, `EMAIL_MAX_LEN`, `validate_display_name_str`, `DISPLAY_NAME_MAX_LEN`), so out-of-tree auth plugins keep importing. `INVALID_DISPLAY_NAME_RE` is not brought back. #23773 replaced it with a Unicode-category rule, and a regex that no longer matches the real check would mislead anyone who imported it.
- The value-only unit tests moved to `test/unit/util/test_user_input.py` with their assertions unchanged.

## `username` typing

- `UserCreationPayload.username` is now `NewUsername`. The schema checks the format (`validate_publicname_str`) and the length, and a bad name gets the usual 400 `USER_REQUEST_INVALID_PARAMETER` with the public-name message. The route still checks that the name is not taken.
- `UserUpdatePayload.username` is now `Username`, which only bounds the length (255). Some accounts were created under older rules and hold names the current regex refuses. Clients send the whole form back, so a format check in the schema would lock those users out of changing their email or display name. The manager path (`validate_publicname`) already skips unchanged names and checks format and uniqueness only when the name changes, so that is where the format rule stays. The length bound is safe because the column is `TrimmedString(255)`, so no stored name is longer.
- The field description now says so. The regenerated client schema changes only that description.

## Tests

- `test_value_rules_importable_from_previous_home` is one parametrized check that each legacy name in `galaxy.security.validate_user_input` is the same object as in `galaxy.util.user_input`.
- `test_legacy_username_update` (manager) builds a user named `"Legacy User"`. It runs `UserUpdatePayload` and the deserializer with the unchanged name plus a new email, and the update succeeds. Changing to `"Other User"` is refused by both the deserializer and `update_username`.
- `test_user_username_fields` (schema) checks three things: update accepts a legacy name, creation rejects it with the public-name message mapped to `RequestParameterInvalidException`, and both payloads reject 256 characters.
- API tests extend `test_update` (an invalid new name gets 400, and the current name plus other changes gets 200) and add `test_create_username_invalid` (400 with `USER_REQUEST_INVALID_PARAMETER`).

The legacy tests fail if `Username` is made to enforce the format like `NewUsername`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
