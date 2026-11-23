# galaxy-brain research follow-up from #24635 (UDT container allowlist)

Source: learning review of galaxyproject/galaxy#24635 at `64dad7223ea`, compared against `origin/release_26.2`.

## Stale against the current baseline

1. **[[Component - User-Defined Tools]]: containerization timeline.** The comparison table, security model layer 2, the status list and "Recommended next steps" #1 all say #21161 is "still draft, slated for 25.1" or "landing in 25.1". #21161 is still an open draft against `release_25.1`, while current work targets 26.2.
   - Containers are already required in the model, through `UserToolSource._require_container` and `_reject_blank_container`.
   - Reword these passages so they state what is enforced today and treat #21161 as stalled, not as imminent.
2. **[[Component - Tool Linters]]: caller of `lint_user_tool_source`.** The note says "`ToolsService` create and edit (`managers/tools.py:207`)". At base, the server-side caller is `DynamicToolManager.create_unprivileged_tool` (`managers/tools.py:209`), plus the custom-tool agent. There is no edit path: editing a UDT saves a new one.

## Post-merge activities (if #24635 merges)

- **[[Component - User-Defined Tools]]:**
  - Add a fourth defense layer, the admin image allowlist (`user_defined_tool_allowed_containers`, default `quay.io/biocontainers/*`). Note that it is checked at creation and again at job prep, against declared images.
  - The `container: busybox` example will be rejected on a default config. Switch it to a biocontainers image, or note that it needs the allowlist.
  - Add the stated limit: this is not network-level isolation.
- **[[Component - User-Defined Tool Source Validation]]:**
  - The "Container image shape (quay.io/biocontainers, docker://, oras://, docker-hub)" paragraph is replaced. `ContainerImageShape` now parses with `image_references.parse_image_reference`, accepts registry ports and digests, and leaves only `oras://` unchecked. Point out that the policy check is separate from lint.
  - The quoted MCP `create_user_tool` docstring example (`python:3.12-slim`) and the agent prompt's fallback both now point to biocontainers.
- **[[Component - Dynamic Tool Manager and Toolbox Lifecycle]]:**
  - The new `__init__` builds `container_allowlist`, and a bad entry raises `ConfigurationError` at startup.
  - `create_unprivileged_tool` gains an `ensure_container_allowed` step after lint.
  - Update the "Entry check" row in the overview table.
  - Optionally note that `app/__init__.py` builds the manager twice (`:427` and `_register_singleton` at `:806`).
- **[[Component - Tool Linters]]:** the containers linter now delegates to the shared image-reference parser, so it no longer uses a module-local regex.
- **Queued research `gx_research/todo/tool_containers_volumes_and_enforcement.md`:** already extended to cover this PR's `_find_container` allowlist check, the Pulsar refusal path and `image_references.py`. The note should be written against a commit that includes both #24561 and #24635.
