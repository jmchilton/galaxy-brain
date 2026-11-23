<!-- gx_risk_assessment via Opus 5.5 (claude-opus-5-5) at low effort; reviewed commit 64dad7223ea -->
This is a one-way door for admins and tool authors. It adds a new admin config option, `user_defined_tool_allowed_containers`, whose name, matching rules and restrictive default (`quay.io/biocontainers/*`) become a contract on a release branch. It also stops existing user-defined tools with other images from being created or run.

<details><summary>Risk Details</summary>

- It targets `release_26.2` with a breaking default. User-defined tools that use busybox, python, ubuntu and similar images fail at creation and at job time until an admin lists their images. This includes tools already saved and workflows that reference them.
- Once released, the option name, the entry grammar (`ns/*`, bare image, `:tag`, `@digest`, lone `*`, empty list = none, null = default) and the rule that a tag entry never matches a reference with a digest are hard to change without breaking admin configs again.
- Canonicalization (dropping `docker://`, implicit `docker.io/library/`, host aliases) now decides what is allowed. A bug here could let an image through or block a legitimate one. Podman's unqualified-search-registries can resolve a name to a different registry than the one checked (documented, not enforced).
- The job-time check runs only for `tool_type == "user_defined"` and checks declared containers, not resolved ones. Admin container resolvers that map images are trusted.
- A malformed entry now stops Galaxy from starting (`ConfigurationError` raised in the `DynamicToolManager` constructor).
- The new shared parser `image_references.py` replaces last-`:` splitting in the shape linter and in `biocontainer_tag_built`. The linter now accepts digest and registry-port references it used to reject, so lint results change for all tools, not just user-defined ones.
- The default tool examples in the MCP and agent prompts change to biocontainers images, which changes what LLM agents generate.
- On Pulsar a refused job fails directly and skips resubmission rules, unlike other preparation failures.
- Test infrastructure (driver, BioBlend CI) sets `*`, so CI does not exercise the restrictive default except in the dedicated tests.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether a breaking, default-restrictive allowlist belongs in a 26.2 point release or should land default-open there and become restrictive in 27.0. The PR milestone is already 27.0, and the feature is beta and not on usegalaxy.org. They should also agree on the option name and entry grammar now, because admin configs will depend on them.

On the code side, look closely at `image_references.py` canonicalization and the tag-vs-digest matching, since this is the security boundary. Confirm that every creation path goes through `create_unprivileged_tool` and that both Pulsar container paths call `_find_container`. Also check that the linter change (it now accepts more references) is acceptable for non-user-defined tools on a release branch.

</details>
