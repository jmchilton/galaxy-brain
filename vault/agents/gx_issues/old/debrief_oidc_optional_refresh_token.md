# Debrief: oidc_optional_refresh_token

Outcome: **reject**. See `reject_oidc_optional_refresh_token.md`.

## Research

- Source: `local/oidc_optional_refresh_token.md`. The draft claimed the PSA pipeline rejects new users who come back with no `refresh_token`, and proposed a per-provider `require_refresh_token` option.
- dev sha: `b62d06dcdce` (origin-https/dev, fetched 2026-10-14; newer than the `36fe2ce8428` noted at handoff). social-auth-core pin on dev is 5.2.0, the same as the venv.
- Code read:
  - `contains_required_data` raises only `if is_new and not response.get("refresh_token")`.
  - social_core's `BaseAuth.authenticate` does `setdefault("is_new", False)`. Only `social_user` sets it, and that step runs after `contains_required_data` in `AUTH_PIPELINE`, so the branch is unreachable with the default pipeline.
  - Origin: `405a08522e8` (vjalili, 2018). The step order was the same then.
- Repro (unit, scratch worktree from dev):
  - Reuses the mocked-IdP fixtures in `test/unit/authnz/test_deferred_user_creation.py`, with the token endpoint returning no `refresh_token`.
  - The direct flow and the `require_create_confirmation` flow both create the user, which is stored with `refresh_token: None`.
  - A spy on `contains_required_data` records `is_new == False`, and a direct call with `is_new=True` raises. Result: 2 passed. The test is in the reject file.
- Config: neither `oidc_backends_config.xsd` nor the sample has a refresh-token requirement option. The sample only mentions `offline_access` in `<extra_scopes>`, as commented-out guidance. The Keycloak rig realm (`test/integration/oidc/galaxy-realm-export.json`) issues refresh tokens; a client attribute `use.refresh.tokens=false` would be the way to test without them, but that's moot now.
- Upstream search (`gh search issues/prs`): "refresh token", "require_session_refresh", "contains_required_data", "Missing refresh token", "refresh_token oidc".
  - No duplicate, and no prior report of a login rejection.
  - Related: #21180 (open; refresh tokens that can't be decoded, AzureAD/PingFed); #18826 and #19385 (`offline_access` / refresh failures); #21234 (Keycloak/CILogon moved to PSA, custos removed; custos also stored `None`); #22449, #22828, #23432 (the `require_session_refresh` series).

## Review round (subagent)

- Rejection held up. The reviewer re-checked social-core 5.1.0 and 5.2.0, Galaxy's `Strategy` and `callback` (no `is_new` passed, no `@partial` steps), and the pipeline order in every revision of `psa_authnz.py` since `405a08522e8`.
- As a sanity check, it forwarded `is_new=True` from the spy, and both repro cases then failed with "Missing refresh token". That shows the test really reaches the check.
- Edits:
  - added the `verify` row to the table, the social-core version note, and the custos and #21234 history;
  - rewrote the #18826 and #19385 descriptions accurately;
  - named the opt-in configs that *would* make the branch fire: a reordered `oidc_auth_pipeline`, or `oidc_auth_pipeline_extra` listing the function again. `config_schema.yml` uses `contains_required_data` as the example path for both;
  - extended the cleanup-PR note.
- Confidentiality grep was clean.

## Leftover

- The opt-in `oidc_auth_pipeline_extra` case is read from the code, not tested. The reviewer noted it would fire only in the direct flow, because the confirmation flow redirects first.
- Optional follow-up: a tiny cleanup PR that removes the unreachable branch and the misleading docstring line, and picks a different example path in `config_schema.yml`. No issue is needed for it.
- Scratch worktree removed after the review.

## Release check (added 2026-10-14)

`release_25.1` (`2ae14b0eac3`, pins social-auth-core 4.7.0), `release_26.0` and `release_26.1` have the same order: `contains_required_data` before `social_user`. social-core 4.7.0's `BaseAuth.authenticate` also does `kwargs.setdefault("is_new", False)`. So the check is unreachable with the default pipeline on every supported release; no backport needed.
