# Performance challenge debrief: #24719

Reviewed commit `e2c3677d3ae`, diffed against merge-base `ff1608a4d67` with `origin/dev`.

**Result: no performance concerns, no recommendations.** Based on reading the code. Nothing was run: an attempted micro-benchmark of the helper was denied by the agent permission classifier, and the change doesn't justify a Galaxy server or Postgres setup.

## What was checked

| Pattern | Finding |
|---|---|
| Unbounded queries, ORM loops, CTEs, joins | None. The diff adds no database access. |
| Expensive field on a shared endpoint (#23076) | `/api/configuration` gains one field, but it costs two attribute reads and two comparisons on the in-memory config, with no I/O. Opt-in isn't warranted. |
| Payload size | One small integer key, about 50 bytes before compression (estimated, not measured). |
| New client requests or polling (#18969) | None. `useConfig()` calls `store.loadConfig()`, which does nothing once config is loaded or while a load is in flight. `App.vue` already loads the same store, so the dialog adds no request. |
| Reactive cost | `linkLifetime` is a computed over `config`, doing a few comparisons and only recalculating if config changes. |
| Sync DB in async handlers (#22361) | Not applicable, no DB work added. |
| Import cost | `managers/configuration.py` now imports `galaxy.short_term_storage`, which sibling modules already import (`managers/markdown_util.py`, `managers/collections.py`, `managers/model_stores.py`, `webapps/galaxy/services/base.py`). Unlikely to add startup cost, not measured. |
| Target creation path | `ShortTermStorageManager.new_target` now calls the extracted helper. The logic is the same, plus one function call beside filesystem work. |

## Measurement plan

None recommended. The only runtime addition is constant-time arithmetic per `/api/configuration` serialization, with nothing that scales with history, job, or dataset counts.
