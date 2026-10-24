# planemo#1745 — Support collection name assertions (`metadata: {name:}`) in workflow tests

[Issue](https://github.com/galaxyproject/planemo/issues/1745)

## Status

Blocked on galaxyproject/galaxy#24224 (open, unmerged as of 2026-10-24) and a galaxy-tool-util release with it.

## Triage (2026-10-24, WORK_HORSE run)

- **Routing:** already fixed by open PR [#1723](https://github.com/galaxyproject/planemo/pull/1723) (issue [#1705](../../wip/1705/index.md)): `for_collections()` routes on `class: Collection`. Don't duplicate.
- **`name` in collection dict:** no change needed. `_collect_collection_output` passes the `show_dataset_collection` API response, which includes `name`.
- **Docs:** only remaining work. Add `metadata: {name:}` to `docs/test_format.rst` `class: Collection` section once galaxy#24224 lands. Add an end-to-end workflow test then (needs the new galaxy-tool-util).

Posted blocked note on the issue 2026-10-24: https://github.com/galaxyproject/planemo/issues/1745#issuecomment-6386589393
