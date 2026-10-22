# thermo_review — galaxyproject/galaxy#24111

Profile: thermo_review. Model: Claude Opus 5.5, low effort. Reviewed commit: a55b237469afdcf9af7ab9f19ff09ac9007b3268 (diff vs merge-base dbe4f2f7e41, base `release_26.1`).

Overall: the PR adds a good reusable primitive (`galaxy.util.is_safe_login_redirect` + `normalize_https_authority`, mirrored by client `safeLoginRedirect`) and removes the hand-built `f"{login_redirect_url}login/start?..."` strings in `psa_authnz.py` in favor of `url_builder` — a real improvement. Remaining issues are about the policy being re-applied by hand at each entry point rather than owned in one place.

### P2 1: Post-login redirect policy is reimplemented at three call sites; `_is_absolute_url_to` duplicates `is_safe_login_redirect` guards

`root.py` (`login_next = redirect if is_safe_login_redirect(...) else "/"` + warning), `authnz.py::login_destination` (same check + warning + quoting/prefixing), and `user.py::__get_redirect_url` (same check + same warning text + logout-loop check) each read `trans.app.config.allowed_login_redirect_hosts`, validate, and log "Ignoring post-login redirect target that is not allowed". `user.py` also adds a private `_is_absolute_url_to`/`_origin`/`DEFAULT_PORTS` that repeats the backslash / `CONTROL_CHARACTERS` / `@`-in-netloc refusals from `is_safe_login_redirect` (its own comment says "as in is_safe_login_redirect"). These are the same trust decision and should live together in `galaxy.util` (e.g. a `same_origin`-aware `is_safe_login_redirect(target, allowed_hosts, base_url=None)`) plus one `trans`-level helper returning the resolved destination, so the next entry point can't drift. For a release-branch fix, moving `_is_absolute_url_to` next to `is_safe_login_redirect` and sharing the authority-hygiene check is the minimal step; the full consolidation is in [thermo_followup_refactor_issue.md](thermo_followup_refactor_issue.md).

### P3 1: OIDC "login stopped" signal is recovered by URL-string matching

`PSAAuthnz.callback` now knows exactly when the pipeline stopped (`stopped = not isinstance(redirect, Redirect)`), but the controller re-derives it with `redirect_url != login_next and redirect_url.startswith(f"{url_for('/login/start')}?")`. Similarly the new-association branch decides "user had no destination" by `login_redirect_url == trans.url_builder("/")`, and notification params are added only when `redirect_url in (url_builder("/"), url_builder("/user/external_ids"))`. Returning the stopped flag (or a small result type) from `callback` would drop the string sniffing on both sides. Fine to defer — included in the follow-up plan.

### P3 2: `URL_SAFE_CHARACTERS` copies `requests.utils.requote_uri`'s safe set

`authnz.py` hard-codes the safe set with a comment pointing at `requests.utils.requote_uri`. Calling `requote_uri` (already a Galaxy dependency) would avoid the copy, or keep it but put it in `galaxy.util` alongside the redirect helpers rather than a controller module.
