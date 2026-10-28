# galaxy#24546 — Caching object store caches never evict without Celery

[Issue](https://github.com/galaxyproject/galaxy/issues/24546)

`auto` driver promises in-process eviction w/o Celery but per-store `enable_cache_monitor` gate (default False since #16110) blocks it. Filed 2026-10-28, assigned jmchilton, queued.

Next: red unit test on `enable_cache_monitor()` (Celery off, sized cache → in-process), then drop gate + startup warning. Docs: [proposal](proposal.md), [debrief](debrief.md), [raw](raw.md).
