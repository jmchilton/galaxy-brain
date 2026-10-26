Profile gx_risk_assessment, Claude Opus 5.5 at low effort, reviewed commit 890d6f7ab98.

Mostly a two-way door (no API, schema-hash or index-format change), but it lands on `release_26.2` a startup policy change: a cached toolbox with a missing or unloadable read-only store (CVMFS/`external_store_directory`/URL store) now refuses to boot with `ConfigurationError` instead of degrading to eager parsing, and admins will build operational expectations around whichever behavior ships.

<details><summary>Risk Details</summary>

- Hard-fail on boot: a transient CVMFS mount gap or a bundle published with a mismatched schema cohort now takes Galaxy down rather than slowing it. On reload the current toolbox is kept, so the failure surfaces only at the next restart.
- Tool-version visibility changes: storage-only versions that sit beside a configured version are hidden from `get_tool`, `has_tool`, lineages and the version registry. Workflows or job reruns that pinned such a version (and worked by accident on 26.x cached mode) now resolve to the configured default or miss.
- Published indexes are rewritten in memory on load (`select_configured_defaults`), and the composite merge now prefers `in_panel` entries. Read-only bundles therefore get default selection their publisher did not choose. Reversible, but this is a second source of truth for defaults.
- Re-indexing on reload (`_reindex_edited_sources`) checks mtime and md5 per writable-store entry. On large local stores that adds I/O to every `PUT /api/configuration/toolbox`. Edits made only in macro files are not detected, and errors are swallowed with a warning.
- Multi-process reconciliation (`_remove_versions_in_memory`, proxy re-keying on a surviving version) is new, subtle state handling that is only partly exercised: the Postgres queue-worker tests were not run locally.
- Milestone is 27.0 but the base is `release_26.2`; confirm the intended target.

</details>

<details><summary>Risk Review Advice</summary>

The decision that most needs a human is whether refusing to start is the right 26.2 release-branch behavior for a missing read-only store, or whether it should be opt-in or a loud warning with fallback. Usegalaxy-style CVMFS deployments are the ones affected. Check that the error message and `tool_source_storage.rst` give admins a clear recovery path.

Also confirm that hiding storage-only sibling versions matches the eager toolbox for pinned-version workflow and rerun lookups, and look at `_remove_versions_in_memory` and the peer `reload_tool_source_cache` path for races between concurrent reloads.

</details>
