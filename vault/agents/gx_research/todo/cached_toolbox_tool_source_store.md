# Component - Cached Toolbox and Tool Source Store

Cover `CachedToolBox` (`lib/galaxy/tools/cached_toolbox.py`) and the tool source store package (`lib/galaxy/tools/source_store/`): the `ToolSourceStore` interface, `SqlAlchemyToolSourceStore` (SQLite default, remote URLs), `CompositeToolSourceStore` layering of named/read-only stores (e.g. CVMFS-published) over the writable default, the `ToolIndex` and its freshness/trust gates, the populator paths (inline at boot/reload, `populate_store.py`, shed-install partial populate, `reconcile_index`, watch mode), and how the toolbox decides between index-backed panel init and the eager fallback. Include the multi-process story: schema creation, the `tool_source_populate_lease` populate lease (`source_store/coordination.py`, from #24666 if merged), and which write paths do and do not coordinate. Leave out per-tool parsing details covered by the YAML tool parser note and the dynamic tool manager lifecycle covered by its own note.

## Why

Review of #24666 reshapes how processes sharing a store populate it, and galaxy-brain has no note on the cached toolbox or source store; `Component - Dynamic Tool Manager and Toolbox Lifecycle` only mentions `CachedToolBox` in passing.

## Requested by

- vault/repositories/galaxy/reviews/active/24666/: needed a baseline of the cached toolbox/source store architecture to explain the populate lease
