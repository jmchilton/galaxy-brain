# galaxy #23771 - Replace the extra preferences form inputs with a typed API

- PR: https://github.com/galaxyproject/galaxy/pull/23771 (mvdbeek, base `dev`, +1081/-402, 12 files)
- Head reviewed: `f7689baeace` (our merge of `origin/dev` to fix an import-only conflict in `test/unit/app/managers/test_UserManager.py`). Reviewed author commits `092234d28c..64d84cef65` via `git diff origin/dev...HEAD`.
- Date: 2026-09-30
- Worktree: `~/projects/worktrees/galaxy/pr/23771`
- CI: restarted on the merge, all pending at review time.
- Local: `test/unit/app/managers/test_UserManager.py` 43 passed; `test/integration/test_vault_extra_prefs.py` 17 passed.

## Summary

Replaces the unreleased `extra_preferences/inputs` endpoints from #23303 with a typed definition endpoint
(`GET /api/configuration/extra_preferences`) plus typed values GET/PUT under `/api/users/{id}/extra_preferences`.
Logic moves out of two ad-hoc `UsersService` methods into `ExtraPreferencesManager`, which the deprecated
`information/inputs` path also uses. It also redacts sensitive values in `UserSerializer` and purges extra
preferences on user purge. Storage keys (`<section>|<input>` JSON, vault `preferences/<section>/<input>`) are
unchanged, so file source templates (`user.preferences[...]` via `galaxy/files/__init__.py:448`) keep working.

This is a good consolidation. It leaves a reusable manager in place of copy-pasted form code, imports are at
module top, and the integration tests are thorough and in the right place. Nothing blocks merge. The main gap
is that "purge removes the vault values" is only half true, because the vault wrappers do not forward
`delete_secret`. There is also a smaller hardening point about the redaction strategy.

Verdict: **approve with comments** (finding 1 can be a follow-up if the author prefers).

## Findings

### 1. Medium - vault "delete" is an overwrite; purge leaves secrets recoverable on Hashicorp
`lib/galaxy/managers/extra_preferences.py:91,216` call `UserVaultWrapper.delete_secret`. `UserVaultWrapper`,
`VaultKeyValidationWrapper` and `VaultKeyPrefixWrapper` (`lib/galaxy/security/vault.py:248-334`) don't override
it, so the base `Vault.delete_secret` (`vault.py:74`) runs: `write_secret(key, "")`.
- `DatabaseVault.delete_secret` (`vault.py:235`), which really deletes, never runs. The row stays, holding an encrypted `""`.
- `HashicorpVault.write_secret` is `kv.v2.create_or_update_secret`. Writing `""` adds a new version, and the old
  versions stay readable in KV v2 history. So on Hashicorp, purge and "null clears" leave the real secret recoverable.
- The purge test asserts `not self._read_vault(...)` instead of `is None`, which fits this overwrite behaviour.

Fix (small, reusable, vault layer): forward `delete_secret` through the three wrappers, applying the same key
transform as `write_secret`. Make `DatabaseVault.delete_secret` a no-op when the row is missing (today
`session.delete(None)` raises). Add `HashicorpVault.delete_secret` using
`kv.v2.delete_metadata_and_all_versions`. `purge` can then drop the read-before-delete loop, and the test can
assert `is None`. If this is out of scope, soften the PR description ("overwritten", not "removed") and file a follow-up.

### 2. Low/Medium - redaction is a denylist over the *current* definition
`ExtraPreferencesManager.redact` (`extra_preferences.py:62`) drops only keys of inputs that are currently defined
and sensitive. Anything else in the stored JSON is still served from `GET /api/users/current` and `/api/context`:
- inputs an admin later removed or renamed, or changed from `password` to `text`;
- keys the old `save_extra_preferences` stored for unknown inputs in a known section (its `else: extra_user_pref_data[item] = payload[item]` branch). Existing databases can hold these.

The client reads only `localization|locale` (`client/src/utils/localization.js`, `client/src/app/galaxy.js`) and
`sentry_replay|enabled` (`client/src/app/addons/sentry.ts`). An allowlist (emit only keys of defined,
non-sensitive inputs) is just as simple and fails closed. Suggested change:
```python
allowed = {_stored_key(s, f) for s in self.definition() for f in s.inputs if not f.sensitive}
return json.dumps({k: v for k, v in stored.items() if k in allowed})
```

### 3. Low - legacy PUT no longer wipes extra prefs; unmentioned fix, add a regression test
On `dev`, `save_extra_preferences` always rewrote `extra_user_preferences` from the payload alone. So
`client/src/components/Sharing/SharingPage.vue:202`, which PUTs `information/inputs` with just `{username}`,
erased every stored extra preference. `_apply` now writes only when something changed, which fixes this. It is
worth one line in the PR description and a test: PUT `information/inputs` with only `username`, then assert the
extra preferences are intact.

### 4. Low - stale deprecation message
`lib/galaxy/webapps/galaxy/api/users.py:116` (`_warn_information_inputs_deprecated`) still points users to
`/api/users/{user_id}/extra_preferences/inputs`, which this PR removes. It should be `/api/users/{user_id}/extra_preferences`.

### 5. Low - bool/int conflation in select validation/decoding
`ExtraPreferenceInputDefinition.option_values` (`lib/galaxy/schema/schema.py:525`) is a `set`, and
`_check_type`/`_decode` (`extra_preferences.py:300-331`) compare with `==`/`in`. Checked locally:
- options `[[Low, 1], [T, true]]` produce `option_values == {1}`;
- PUT `true` for an option `1` passes validation and is stored as `true`.

In the same area, `_decode` for booleans runs `string_as_bool("garbage")` and gets `False`. The docstring
promises `null` for unreadable values. Suggested fixes: compare on `(type(v), v)`, or reject `bool` unless the
option is a `bool`; for booleans, accept only `true`/`false` strings. These are edge cases in admin config, so fine to skip.

### 6. Nit (abstraction) - third "typed definition + vault secret + is_set" shape
`ExtraPreferenceSecretState(is_set)` is close to `galaxy.schema.credentials.SecretResponse.is_set`, and
`_config_templates` has its own variables and secrets. This PR doesn't need to merge them. If the author is
open to it, reusing the credentials naming/model for the secret state would keep the API vocabulary consistent.
Not blocking.

### 7. Nit (tests) - legacy form smoke check
`test_typed_values_round_trip` requests `information/inputs` and asserts only a 200. Also asserting one decoded
value (for example `languages == ["de", "en"]`, `vault_count == 3`) would show that the legacy form renders typed
values, not only that it doesn't crash. Otherwise the coverage is strong: invalid payload writes nothing,
exact-key reads, no-vault, account interface off, admin/other-user access, purge.

### Follow-up (not this PR)
`scripts/cleanup_datasets/pgcleanup.py` `purge_deleted_users[_gdpr]` doesn't touch `extra_user_preferences` or
the vault, so only API purges get the new cleanup.

## Checked, no issue
- All DI construction of `UserSerializer`/`CurrentUserSerializer` goes through lagom. The Tool Shed uses only `UserManager`, so the new constructor arg doesn't reach it.
- Removed endpoints/models were never released, and the client has no callers of them (`UserPreferencesModel.ts` and `SharingPage.vue` still use `information/inputs`, which is kept).
- Vault key naming is unchanged. Sensitive defaults are stripped from the served definition. Admins see `is_set` only.
- `coerce_numbers_to_str` coerces numeric `name`/`label` to str, and options keep int/float values (checked).
- Imports are all module-level.

## Draft review

_This review was posted by Claude (AI assistant) on behalf of jmchilton._

Nice consolidation. `ExtraPreferencesManager` replaces the copy-pasted form code, the legacy path shares it,
and the integration coverage is thorough (17/17 pass locally). A few comments:

1. **Vault deletes are overwrites.** `UserVaultWrapper`, `VaultKeyValidationWrapper` and `VaultKeyPrefixWrapper` don't forward `delete_secret`, so the base `Vault.delete_secret` runs and writes `""`. `DatabaseVault.delete_secret` never runs, so the row stays. On Hashicorp, KV v2 keeps the earlier versions, so purge and `null` leave the real secret recoverable. Could the wrappers forward `delete_secret`, with `DatabaseVault.delete_secret` tolerating a missing row and `HashicorpVault.delete_secret` calling `delete_metadata_and_all_versions`? Then `purge` doesn't need to read before deleting, and the purge test can assert `is None`. A follow-up is fine if you'd rather keep this PR scoped, but then the description should say "overwritten".
2. **Redaction as an allowlist?** `redact` drops only keys that are currently defined and sensitive. Keys for inputs that were removed or retyped, and unknown-input keys the old `save_extra_preferences` stored (its `else` branch), are still served from `/api/users/current`. The client reads only `localization|locale` and `sentry_replay|enabled`. Emitting only keys of defined non-sensitive inputs is just as simple and fails closed.
3. This also fixes a data-loss bug on `dev`: `SharingPage.vue` PUTs `information/inputs` with only `username`, and the old code rewrote `extra_user_preferences` from that payload, which wiped everything. It might be worth a line in the description and a regression test.
4. `_warn_information_inputs_deprecated` in `api/users.py` still points to `/extra_preferences/inputs`.
5. Minor: `option_values` is a set and membership uses `==`, so `true` validates against an option `1`, and an option `true` collapses into `1`. Also, `_decode` turns an unreadable boolean such as `"garbage"` into `False`, although the docstring says unreadable values become `null`.
6. Minor: in `test_typed_values_round_trip`, the `information/inputs` check could assert one decoded value, not just the 200.
