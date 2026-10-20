# Consolidate post-login redirect resolution

This follows up on #24111 (`release_26.1`). It targets `dev`, not the release branch.

## Problem

All three login paths (`root.login`, `authnz.login_destination` and the password login in `user.__get_redirect_url`) validate the post-login target. If the `pr_24111_review_0` changes land, they share one check: `is_safe_login_redirect(target, allowed_hosts, base_url=None)` in `galaxy.util`, called through `authnz.is_allowed_login_redirect`. Otherwise, the first step is to move `user.py`'s `_is_absolute_url_to` into that check and drop the three copies of the validate-and-log code. Either way, what happens after the check still differs between the paths:

- `login_destination` re-quotes the target and applies `galaxy_url_prefix` to local paths.
- The password login leaves the prefix for the client to add and rejects logout targets. The OIDC paths do not reject logout targets.
- The OIDC controller works out that the pipeline stopped by checking whether the URL starts with `url_for('/login/start')` and differs from `login_next`. `PSAAuthnz.callback` already knows this, because `do_complete` returned something other than a `Redirect`. The backend also decides whether the user had a destination by comparing `login_redirect_url == trans.url_builder("/")`. The PR's "Known limitations" section notes that this string matching lets a crafted `next` show an error in place of the linking prompt.

## Plan

1. Add one helper that turns a raw target into the final destination, for example `resolve_login_redirect(trans, target, *, qualified_base=None) -> str`. It would:
   - validate the target;
   - quote it with `URL_SAFE_CHARACTERS`;
   - apply `galaxy_url_prefix` to local paths;
   - reject logout targets on every path.

   Use it from `root.py`, `authnz.py` and `user.py`.
2. Have `PSAAuthnz.callback` return whether the pipeline stopped, either as a flag or as a small result dataclass. Then remove the `startswith(url_for('/login/start'))` and `== url_builder("/")` comparisons from the controller and the backend.
3. Point the existing tests (`test/unit/util/test_safe_local_redirect.py`, `test/unit/webapps/test_authnz_login_next.py`, `test_login.py`, and the Keycloak and password-login integration tests) at the shared helper, rather than adding new tests for each controller.
