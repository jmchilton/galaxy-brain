Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: 06ab66dce072328c6e161b8153823b6e78d93b06

The one-way risks are small and additive: a new `dspace` plugin type in the API schema and template enums, plus a URI path layout (`/bitstreams/<uuid>/<name>`, `/communities|collections|items/<uuid>`) that gets saved in dataset source URIs and user template instances, so it must stay stable after release.

<details><summary>Risk Details</summary>

- The `dspace` value joins the public `FileSourceTemplateType` / plugin-type enums in the API schema. Renaming or removing it later breaks clients and stored user file source instances.
- The `dspace://` URI path scheme ends up in dataset provenance and in workflows or requests that reference remote files. Changing the path layout (e.g. dropping the trailing file name, or switching from bitstream UUID to handle) would break re-fetching existing URIs.
- The template `production_dspace.yml` (id `dspace`, version 0) fixes the variable/secret names (`api_url`, `token`). User instances store these names, so renaming them needs a template version upgrade path.
- The behavior choices become user expectations: read-only, only the `ORIGINAL` bundle exposed, MD5 hashes skipped for PDFs, unpaged listings capped at the first 100 objects, and offsets that are not a multiple of the limit rounded down to a page. These can all be changed later, but changes would be visible to users.
- The plugin does its own redirect following and private-address checks in addition to the shared `validate_non_local` / `fetch_url_allowlist`. It is a second copy of outbound-fetch policy that has to be kept consistent with the shared one.
- The sample `file_sources_conf.yml.sample` points at `demo.dspace.org`, which resets its content. This is two-way but may confuse admins who copy it as-is.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide that the URI path layout is the one they want to keep, since it is the main thing that persists in user data: especially whether to keep the bitstream UUID as the key and the trailing name only for display. They should also check that the template's variable and secret names match conventions in sibling templates (e.g. NOMAD, ARC), because renaming them later needs a template version upgrade.

The custom `_open_url` redirect and SSRF handling should be checked against how other HTTP-based file sources fetch URLs. If a shared helper exists or should exist, it is cheaper to adopt it now than to keep a separate outbound-fetch policy going. Everything else (pagination shortcuts, PDF hash skipping, client icon/message) can be undone.

</details>
