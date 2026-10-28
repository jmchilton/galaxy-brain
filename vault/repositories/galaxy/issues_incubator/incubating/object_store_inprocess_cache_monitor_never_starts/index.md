# Caching object store caches never evict without Celery

`auto` driver promises in-process eviction w/o Celery but per-store `enable_cache_monitor` gate (default False since #16110) blocks it; recommend post, assign John.
