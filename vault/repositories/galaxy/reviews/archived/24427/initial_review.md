# Initial review: galaxy#24427

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Opus 5.5, effort low
- Reviewed commit: `e1124110491` (diffed against merge-base with `origin/dev`)

## Verdict

Approve. Small, well-scoped refactor. `UserManager.by_credentials` is a real reusable abstraction that replaces two copies of the key-then-token lookup. The MCP server now takes the `UserManager` singleton from the container instead of building its own. Header parsing reuses FastAPI's `get_authorization_scheme_param`, the same helper `HTTPBearer` uses on REST. The `user_can_do_run_as(None)` fix is correct: on `origin/dev`, `None or user.bootstrap_admin_user` raised `AttributeError`. Tests pin the credential order at the unit, API and integration layers, and the Keycloak test covers a real token over MCP. No bugs found. Three P3 findings below.

I checked the fastmcp 4.1.0 `get_http_headers(include=...)` source: it strips `authorization` by default and `include` re-adds it, as the PR says. mvdbeek's dannon/galaxy#83 already covers the "Invalid access token" hint and the docstring wording, so they're not repeated here.

## Findings

### P3 1: `enable_mcp_server` config docs don't mention Bearer tokens

`lib/galaxy/config/schemas/config_schema.yml` (`enable_mcp_server.desc`) still says "The MCP server requires API key authentication" and that the `api_key` argument "is ignored when the header is set". After this PR, MCP also accepts an OIDC access token as `Authorization: Bearer`, and that header also overrides the argument. The PR description points out the operator-facing catch: a Bearer header added by a proxy blocks a valid argument key on a server without OIDC. Admins are told about none of this. This is the only admin-facing MCP auth doc (`doc/source/admin/ai_agents.md` doesn't cover MCP auth).

Suggested fix: add a sentence: "On servers with OIDC configured, clients may instead send an OIDC access token as `Authorization: Bearer <token>`; a Galaxy API key is not accepted as a Bearer token. Either header takes precedence over the `api_key` argument." Then regenerate `galaxy_options.rst` / the sample config.

### P3 2: `by_credentials` return annotation leaves out `BootstrapAdminUser`

`by_credentials` is annotated `-> model.User | None`, but it returns `by_api_key(...)`, which returns `schema.BootstrapAdminUser()` for the bootstrap admin key. The PR's own `user_can_do_run_as` annotation (`model.User | schema.BootstrapAdminUser | None`) shows the author knows about this case. Today `by_api_key` is untyped, so mypy doesn't see the mismatch. Because the new method is the shared entry point, this annotation is what callers will rely on. Typed correctly, it would also show that `get_api_user`'s `-> User | None` is too narrow.

Suggested fix: `-> model.User | schema.BootstrapAdminUser | None` (optionally also annotating `by_api_key`). Widen `get_api_user`'s return type if mypy then asks for it.

### P3 3: no API test for the run-as 500 the PR fixes

The PR fixes a user-visible bug: an unmatched Bearer token plus a `run-as` header returned a 500 instead of 403. Only the unit test `test_user_can_do_run_as(None)` covers it. The default API test server already sets `api_allow_run_as="test@bx.psu.edu"` and has no OIDC, so `by_oidc_access_token` returns `None`. That makes the bug reproducible red-to-green with a few lines in `lib/galaxy_test/api/test_framework.py`, next to the new `test_run_as_without_credentials`:

```python
def test_run_as_with_unmatched_bearer_token(self):
    run_as_user = self._setup_user("for_run_as@bx.psu.edu")
    response = self._get(
        "users/current",
        headers={"run-as": run_as_user["id"], "Authorization": "Bearer not-a-real-token"},
        anon=True,
    )
    self._assert_status_code_is(response, 403)
```

(Not run here. It should be 500 on `origin/dev` and 403 on the PR.)

## Observations (not findings)

- The legacy WSGI `_authenticate_api` (`lib/galaxy/webapps/base/webapp.py` ~551) is still a third, separate credential path. It checks key, then session cookie, then OIDC, and matches the Bearer prefix by substring. It can't call `by_credentials` directly because the cookie check sits between the key and the token. That code is pre-existing and untouched, so it's only a possible follow-up.
- MCP precedence (`x-api-key` > Bearer > argument), and a bad header blocking a good argument, are explicit decisions in the PR description. Not re-litigated.
- Imports are at module top in every changed file, including the new `fastmcp.Client` import in the OIDC test.
