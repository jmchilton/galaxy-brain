Profile: gx_risk_assessment, Opus 5.5 at low effort, reviewed commit a55b237469afdcf9af7ab9f19ff09ac9007b3268.

The one-way door is part B: a new admin-facing config option, `allowed_login_redirect_hosts`, with fixed matching semantics, exposed through `/api/configuration` and shipped on a release branch (`release_26.1`), so deployments will start relying on its name and behaviour in a point release; the OIDC URL fixes in part A are a two-way door.

<details><summary>Risk Details</summary>

- `allowed_login_redirect_hosts` becomes public config once it ships: name, comma-list format, exact-authority matching, `:443` stripping, https-only, and no wildcards. Changing any of these later (for example, adding wildcards or http) changes what admins already rely on.
- A new feature lands on a release branch. Admins on 26.1.x get a new option between point releases, and it has to be kept going forward into `dev`/27.0.
- The allowed host list is returned by `/api/configuration`, so it becomes part of the configuration API response that clients may read.
- The server (`galaxy.util.is_safe_login_redirect`) and the client (`safeLoginRedirect` in `client/src/utils/redirect.ts`) check redirects separately and must agree. Any later change has to update both, or the guard and the server will disagree about what is allowed.
- Changed landing page: after a first OIDC login from a deep link, users now land on that page instead of `user/external_ids`. Users and docs may come to expect this. The PR says reverting it is a one-line change.
- Password login (`user.__get_redirect_url`) now refuses some absolute URLs back to this Galaxy that it accepted before (backslash and userinfo spellings). Existing links in that form will stop working.
- Detecting a stopped login now depends on the PSA `do_complete` return type (`Redirect` versus a plain string). If a social-auth upgrade changes that, this check could break quietly.

</details>

<details><summary>Risk Review Advice</summary>

Maintainers should decide whether part B (the new option) belongs on `release_26.1` or on `dev`. Part A stands on its own and is low risk to roll back. If part B ships, the main decision is the option's contract: its name, the entry format, and the strict exact-authority, https-only rules. These are hard to loosen or tighten later without surprising admins. Also confirm that it is acceptable for `/api/configuration` to expose the list.

Reviewers should read `is_safe_login_redirect` next to `safeLoginRedirect` to make sure they match, and confirm with the author the account-linking landing decision (deep-link destination versus `user/external_ids`). The `isinstance(redirect, Redirect)` stopped-login check depends on an internal PSA detail that is worth noting.

</details>
