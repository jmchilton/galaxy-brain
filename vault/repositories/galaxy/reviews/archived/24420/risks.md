Profile: gx_risk_assessment · Model: claude-opus-5-5 · Effort: low · Reviewed commit: 8faff364290

The one-way risk is small but real: this adds a new public query parameter (`exact`) to `GET /api/tools/{tool_id}`, and whatever "exact" means for ids at merge time (including how it treats lineage/short ids and versionless Tool Shed GUIDs) becomes a contract clients will depend on.

<details><summary>Risk Details</summary>

- New API surface: once clients (e.g. workflow tooling, BioBlend, planemo) send `exact=true`, removing or renaming it is a breaking change.
- `exact` compares `tool.id != id` literally. Requests by a versionless Tool Shed GUID, short id, or lineage alias that resolve today will 404 under `exact`, even when `tool_version` matches. That strict reading gets locked in.
- `exact` is silently ignored when `tool_uuid` is given. That exemption also becomes part of the behavior.
- Version comparison is a plain string match (`tool.version != str(tool_version)`), so `1.0` and `1.0.0` count as different versions.
- The parameter lives on the legacy controller's `kwd`, not a typed FastAPI query model, so it won't appear in the OpenAPI schema or generated client types. Discoverability depends on the docstring.
- The 404 message names the closest installed tool id and version. Tool existence and versions are already exposed by this endpoint, so this is not a new disclosure, but the message wording becomes something clients may parse.
- Default behavior is unchanged (opt-in), so existing callers face no regression risk.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide what "exact" should mean before it ships. Should it match on the resolved tool's id and version, or literally on the id string the caller sent? Should a versionless GUID plus `tool_version` count as exact? Should `tool_uuid` interact with it? Those semantics are the part that's hard to walk back.

Consider whether the parameter should be declared on a typed query model so it shows up in the OpenAPI schema and client types. Also consider whether sibling endpoints that do the same version fallback (e.g. tool build/run lookups) should get the same opt-in for consistency. Rolling back the code itself is trivial.

</details>
