# Component - Galaxy Tool Shed Install Layout and Changesets

Cover how an installed Tool Shed repository lands on a Galaxy server: `ToolShedRepository` (install model) fields (`changeset_revision`, `installed_changeset_revision`, `ctx_rev`, `tool_shed`, `owner`, `name`), the on-disk layout under the shed tool directory (`<shed>/repos/<owner>/<name>/<installed_changeset_revision>/` containing the `.hg` directory), how the changeset actually checked out on disk can differ from `installed_changeset_revision` after updates (`.hg/dirstate` parent, `hg update`), tool GUID assembly (`<host>/repos/<owner>/<name>/<tool_id>/<version>`) and how it is carried in `shed_tool_conf.xml` entries and `Tool.guid`, and where each is read at tool load. Leave out Tool Shed server-side models (see `Component - Tool Shed Data Model`) and install YAML request format (see `Component - Tool Install YAML`).

## Why

Work keyed by guid plus the on-disk changeset needs to know which identifier is authoritative at load time; existing notes cover the shed side and the request YAML but not the Galaxy-side install layout.

## Requested by

- vault/repositories/galaxy/branches/active/tool_patches/brain_research.md: per-changeset override lookup uses the changeset checked out on disk, not `installed_changeset_revision`.
