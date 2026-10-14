# Implementation debrief

## Change

- `doc/source/admin/authentication.md`: new "Authorization request parameters" subsection after PKCE. Covers `acr_values`, `login_hint`, `max_age`, `ui_locales`, `display` via `oidc_config.xml` Setters; per-provider prefix rule plus the five providers whose prefix differs; `azure`/`tapis` excluded; `MAX_AGE` needs `Type="int"`; social-auth-core >= 4.7.0; `acr_values` is a request, Galaxy doesn't verify the `acr` claim.
- `lib/galaxy/config/sample/oidc_config.xml.sample`: commented example Setters pointing at the doc section.
- Pre-commit prettier reformatted the rest of `authentication.md` (list bullets `*` → `-`, a blank line after a heading). Unrelated churn, ~12 lines, kept because the hook enforces it.

## Evidence

- Prefix table computed from `BACKENDS` on dev with social-auth-core 5.2.0 (each class's `name`, upper-cased, `-` → `_`). `azure` and `tapis` aren't `OpenIdConnectAuth` subclasses.
- social-core `OpenIdConnectAuth.auth_params` reads the same settings in 4.7.0, 5.2.0 and 6.1.1, so the doc survives the planned social-auth-core 6 upgrade (#23941).
- The gx_issues repro test (5 tests, through `AuthnzManager.authenticate`), with the doc's `OIDC_MAX_AGE=3600` example, passed in this worktree; not committed. Sample XML still parses.

## Not done

- No regression test committed (docs-only). The repro in the reject note could become one if reviewers want the documented behavior pinned.
- `prompt` left documented via its existing `<prompt>` element. A `PROMPT` Setter also works, but two ways to set it would confuse.
- Non-standard hints (Azure `domain_hint`, broker IdP hints behind the generic `oidc` provider) are not covered; no supported path exists.
