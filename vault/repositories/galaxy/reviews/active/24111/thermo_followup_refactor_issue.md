# Consolidate post-login redirect handling

Follow-up to #24111 (release_26.1). Not for the release branch.

## Problem
Post-login destination validation is applied separately in `controllers/root.py` (single-provider OIDC), `controllers/authnz.py::login_destination` (OIDC callback + create_user), and `controllers/user.py::__get_redirect_url` (password login), each reading `allowed_login_redirect_hosts`, logging its own warning, and (in user.py) re-implementing authority hygiene in `_is_absolute_url_to`. The OIDC controller also infers "pipeline stopped" from URL prefixes that `PSAAuthnz.callback` already knows.

## Plan
1. In `galaxy.util`, share one authority-hygiene helper (strip/control chars/backslash/`@`) used by `is_safe_login_redirect` and a same-origin check; move `_is_absolute_url_to` there (or add `base_url=` to `is_safe_login_redirect`).
2. Add one helper (e.g. `resolve_login_redirect(trans, target) -> str`) that validates, logs once, applies `galaxy_url_prefix` for local paths, re-quotes (via `requests.utils.requote_uri`), and rejects logout targets; use it from root.py, authnz.py and user.py.
3. Have `PSAAuthnz.callback` return whether the pipeline stopped (or a small dataclass), and drop the `startswith(url_for('/login/start'))` / `== url_builder("/")` comparisons in the controller and backend.
4. Tests: existing `test/unit/util/test_safe_local_redirect.py`, `test/unit/webapps/test_authnz_login_next.py`, `test_login.py` cover behavior; retarget them at the shared helper rather than adding new per-controller cases.
