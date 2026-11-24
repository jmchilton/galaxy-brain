Profile gx_risk_assessment, Claude Opus 5.5, effort low, reviewed commit `975fd1a7ad0551b4b1c7f79084499d97e75f7ca5`.

The one-way door is identity data: the migration backfills `id_key` from a frozen guess at each provider's old key, and social-auth-core 6 then rewrites existing `uid` values (notably Google, `email` -> `sub`) on each user's next login. The downgrade drops `id_key` but leaves the rewritten `uid`s, so rolling back to social-auth-core 5.2 does not restore working Google logins for migrated users.

<details><summary>Risk Details</summary>

- Google associations get their `uid` changed from email to `sub` on next login. The Alembic downgrade does not reverse this. Back on 5.2, those users would no longer match their association and might get a duplicate or orphaned account.
- The backfill uses the 5.2 defaults (`OLD_ID_KEYS`). Instances whose admins overrode `ID_KEY` in OIDC config get a wrong `id_key`. The lookup filters on `id_key`, so those users may fail to match, or may be migrated and hit the new "contact an administrator" `identifier_migration_conflict` path.
- Google's backfill tells email uids from `sub` uids by `uid LIKE '%@%'`. This is reasonable, but it is a heuristic applied to production data once.
- Providers missing from `OLD_ID_KEYS` (custom or newly added backends) keep `id_key=""`.
- The database schema now depends on the social-auth-core 6 storage contract (`id_key`, `migrate_social_auth`, `get_social_auth_by_extra_data`, nonce `consume`). Future upgrades of the library are tied to this model surface.
- `get_social_auth_by_extra_data` loads every association for a provider into Python. This could be slow on large instances, depending on how often social-auth-core calls it.
- The OAuth state check moved from Galaxy's own session key comparison to social-auth-core's transaction keys. CSRF and state protection now relies on the 6.x session layout.
- Token-refresh behavior changes: `retry_later` errors no longer force reauthentication, and other `AuthException`s that used to fall through to the generic handler now do.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should focus on the backfill table and the Google heuristic in `ddd0f036e070`, and check them against social-auth-core 5.2's actual `ID_KEY` per backend, especially okta and azuread `preferred_username` and Tapis `id`. They should also decide whether release notes need to tell admins that overridden `ID_KEY`s need a manual `id_key` fix and that downgrading after users log in is not clean.

Someone should test a real Google login end to end on an upgraded database with pre-existing email-uid rows, plus the deferred-creation (`REQUIRE_CREATE_CONFIRMATION`) path, which now carries `id_key` through the confirmation flow state.

</details>
