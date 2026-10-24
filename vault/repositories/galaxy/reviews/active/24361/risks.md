Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: 57bac72b9a2

Mostly a two-way door: the new source is additive and read-only. The one-way parts are the `hal` plugin/template type name and the `hal://`-style URI path shape `/<halId>v<version>/<filename>`, which get recorded in dataset sources, user file source instances and possibly workflows once deployed.

<details><summary>Risk Details</summary>

- New `hal` value in `FileSourceTemplateType` and the API schema; renaming or removing it later breaks stored user file source instances and admin template configs.
- The path format `/<halId>v<version>/<url-quoted filename>` becomes a persisted identifier; changing the version suffix scheme or filename quoting later invalidates saved URIs.
- Saved paths pin a deposit version, but HAL's search API exposes only the current version, so previously valid URIs for older versions start failing with an error once a deposit is revised. This behavior is established by design and users/workflows will come to depend on it.
- Download host allowlist (`hal.science`, `*.hal.science`, `hal.inrae.fr`, `*.archives-ouvertes.fr`) is hardcoded; HAL infrastructure changes silently hide attachments rather than erroring.
- `api_url` is a user-overridable template variable (default optional); outbound requests go through `validate_non_local` with the admin `fetch_url_allowlist` and per-hop redirect checks, so behavior matches other HTTP sources.
- Listing a record issues up to one HEAD per visible file (4 workers, 5s timeout), adding external latency to directory browsing.
- Template example is opt-in (`production_hal.yml`); no existing deployment changes until an admin enables it.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether the URI path shape (version-pinned record id plus quoted filename) is the identifier Galaxy wants to keep long term, since it will be persisted in dataset provenance and is hard to change. Confirm that failing on non-current versions, rather than resolving older versions some other way, is acceptable.

Also worth a look: whether exposing `api_url` as a user-editable variable is intended (vs. admin-only), and whether the hardcoded HAL host list should be configurable. Everything else is additive and can be rolled back by removing the template.

</details>
