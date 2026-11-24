# Performance review - PR #25081

- Profile: gx_performance_challenger
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `975fd1a7ad0551b4b1c7f79084499d97e75f7ca5`
- Details and measurement plan: [performance_challenges_debrief.md](performance_challenges_debrief.md)

Verdict: one real scaling issue (unbounded, unindexed `psa_nonce` now written per login start); one latent full-table filter. Migration and token lookups are fine.

## P2 1 - `psa_nonce` grows without bound and is scanned on every login start and callback

With social-auth-core 6.2.0, every OAuth2 authorization start calls `PSANonce.use` (SELECT + INSERT + COMMIT) and every callback calls `PSANonce.consume` (DELETE), both filtering on `(server_url, timestamp, salt)`. `psa_nonce` has only a PK index, so both are sequential scans. Rows for logins that never complete the callback are never removed; Galaxy has no cleanup for this table. Before this PR `PSANonce.use` was not exercised, so this PR turns `psa_nonce` into a live per-login table.

Evidence: sqlite micro-benchmark with the same columns - 0.26 ms per lookup at 10k rows, 25 ms at 1M rows (`SCAN psa_nonce`); 0.002 ms with an index on `salt`. Postgres not measured.

Fix: add an index on `salt` (random per-state value, near-unique) or `(server_url, salt)` in a migration next to `ddd0f036e070`; and prune expired OAuth2 state nonces, e.g. a bounded `DELETE ... WHERE server_url LIKE 'social_core.oauth2.%' AND timestamp < now - STATE_LIFETIME` inside `PSANonce.use`, following the existing bounded cleanup in `FlowState._cleanup` (`lib/galaxy/authnz/flow_state.py`), or a periodic task.

## P3 1 - `get_social_auth_by_extra_data` filters all of a provider's associations in Python

`UserAuthnzToken.get_social_auth_by_extra_data` loads every row for `(provider, id_key)` and JSON-decodes `extra_data` per row to find a match - load-then-filter over one row per user. Nothing in social-auth-core 6.2.0 or Galaxy calls it yet, so impact is speculative, but any future caller on the login-miss path would pay O(users) per new-user login. Push the match into SQL, or leave it unimplemented (`NotImplementedError`) until something needs it. Optional.
