# Performance challenge debrief - PR #25081 (social-auth-core 6.2.0)

- Profile: gx_performance_challenger (`_shared/reviewers/gx_performance_challenger.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `975fd1a7ad0551b4b1c7f79084499d97e75f7ca5`
- Mode: REVIEW_DIRECTORY - recommendations only, PR untouched.

## Scope

Storage-layer changes in `lib/galaxy/model/__init__.py` (`PSANonce`, `UserAuthnzToken`), the `ddd0f036e070` id_key migration, and how social-auth-core 6.2.0 (`backends/oauth.py`, `pipeline/social_auth.py`, read from the 6.2.0 wheel) drives them per login.

## Findings

### 1. psa_nonce now written on every OAuth2 login start, never pruned, no lookup index (data-backed, micro-benchmark)

social-auth-core 6.2.0 `BaseOAuth2.get_or_create_state()` calls `storage.nonce.use(f"social_core.oauth2.{name}", timestamp, state)` on every authorization begin, and `validate_state()` calls `storage.nonce.consume(...)` on callback. In 5.x Galaxy's `PSANonce.use` was effectively dead code (its `where(server_url=...)` kwargs call could not have worked), so this PR is what makes `psa_nonce` a live, per-login table.

- `PSANonce.use` = SELECT + INSERT + COMMIT; `consume` = DELETE + COMMIT. Both filter on `(server_url, timestamp, salt)`.
- `psa_nonce` has only the PK (model declares no index; no migration adds one) -> both are full scans.
- Rows for abandoned logins (user closes the IdP tab, IdP error, double-clicks producing a second state, crawlers following the login link) are never consumed. Nothing in Galaxy prunes `psa_nonce`: no celery task, no `pgcleanup` action, no inline cleanup.
- So the table grows monotonically and each login start/callback gets linearly slower.

Measurement (sqlite in-memory, same columns, standalone script, not Galaxy): lookup 0.26 ms at 10k rows, 25 ms at 1M rows, `SCAN psa_nonce`; with an index on `salt`, 0.002 ms, `SEARCH ... USING INDEX`. Postgres seq-scan behavior will be similar in shape; not measured on a production-size DB.

Recommendation:
- Add an index (on `salt`, or `(server_url, salt)` - `salt` alone is a random 32-char state and near-unique) via a migration alongside `ddd0f036e070`.
- Bounded prune of expired rows, reusing the existing pattern in `FlowState._cleanup` (`lib/galaxy/authnz/flow_state.py`): in `PSANonce.use`, `DELETE FROM psa_nonce WHERE server_url LIKE 'social_core.oauth2.%' AND timestamp < now - STATE_LIFETIME` (limit/bounded), or a periodic cleanup task. Scope by prefix so non-OAuth2 nonce users are untouched. An index on `timestamp` (or composite `(server_url, timestamp)`) keeps the prune cheap.

### 2. `get_social_auth_by_extra_data` loads every association for a provider into Python (latent)

Implementation selects all `oidc_user_authnz_tokens` rows for `(provider, id_key)`, deserializes each `extra_data` JSON blob, and filters in Python - the "load everything then filter" pattern (#22831, #22361). On a large server that is one row per user per provider.

Mitigating: in 6.2.0 nothing calls it (only the abstract in `storage.py`; Galaxy doesn't call it; `_legacy_social_auth` uses indexed `get_social_auth`). So no current hot path. It'd become per-login cost the moment a backend's `get_legacy_social_auth` or a future social-core uses it on the login-miss path, which is hit by every new user's first login.

Recommendation: push the key/value filter into SQL (JSON extraction differs PG vs sqlite, so maybe `MutableJSONType` text match prefilter plus Python check, or DB-specific branch), or leave it raising `NotImplementedError` until a caller exists. Speculative impact; P3.

### Checked, no finding

- `get_social_auth(provider, uid, id_key)`: served by `UniqueConstraint("provider", "uid")`; `id_key` is a residual filter on at most one row. Fine.
- `_legacy_social_auth` extra lookups on miss: a handful of indexed point lookups per new-user login. Fine.
- `migrate_social_auth`: `SELECT ... FOR UPDATE` by PK + conflict check by `(provider, uid)` (indexed); runs once per legacy association. Fine.
- Migration `ddd0f036e070`: `ADD COLUMN ... NOT NULL DEFAULT ''` is metadata-only on PG 11+; backfill is ~16 `UPDATE`s, each can use the `(provider, uid)` index's leading column, one transaction. Table is one row per linked identity (well under millions even on usegalaxy.*). Could be a single `UPDATE ... CASE`, but not worth it. Fine.
- `create_social_auth` rollback-on-error: no perf impact.

## Measurement plan (if the author wants numbers on PG)

1. Postgres container, `psa_nonce` with 1M rows (`server_url='social_core.oauth2.oidc'`, random 32-char salts, timestamps spread over 90 days).
2. `EXPLAIN ANALYZE` the `use` SELECT and the `consume` DELETE as generated (`echo=True` on the session) before/after adding the index.
3. Count rows left after N begin-only requests to `/authnz/<provider>/login` on a dev Galaxy to confirm growth; re-run with the prune to confirm bounded size.
