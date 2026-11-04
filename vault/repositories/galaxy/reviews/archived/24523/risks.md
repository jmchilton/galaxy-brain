Profile gx_risk_assessment, model Opus 5.5, effort low, reviewed commit 55b681c1fa9.

Mostly a two-way door: the shared credential lookup is a refactor, but accepting OIDC Bearer tokens on the MCP endpoint and raising the `fastmcp` floor to 4.0 on a release branch are behaviors deployers and MCP clients may start depending on.

<details><summary>Risk Details</summary>

- MCP now authenticates `Authorization: Bearer` OIDC access tokens; once clients are configured this way, removing it would break them.
- Credential precedence on MCP (`x-api-key` header, then Bearer, then the model-supplied `api_key` argument) becomes de facto contract; a Bearer header now silently overrides the `api_key` argument.
- An invalid Bearer token now raises `AuthenticationFailed` instead of `ValueError`, changing the error shape MCP clients see.
- `fastmcp>=4.0.0` (from `>=2.13.0`) in `pyproject.toml` and `packages/web_apps` on `release_26.2` forces a major-version upgrade on anyone installing the 26.2 packages; this is the hardest part to walk back for downstream deployers.
- REST `get_api_user` behavior is intended to be unchanged (API key still wins over Bearer; anonymous `run-as` still ignored), now pinned by new API tests.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether a `fastmcp` major-version floor bump is acceptable in a point release, and confirm `get_http_headers(include={"authorization"})` is the 4.x API the code needs (4.0 is presumably required for it, since fastmcp strips `authorization` by default).

They should also confirm Bearer-on-MCP is wanted in 26.2 as a supported feature rather than a dev-only addition, since deployers with OIDC will start relying on it.

</details>
