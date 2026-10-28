```yaml
documents:
  - path: vault/research/Component - Object Store Cache and Direct Access.md
    why: Cache config, shards, eviction and "Who runs eviction" (celery vs InProcessCacheMonitor, enable_cache_monitor gate); the exact bug, test locations and gotcha 1.
    load_when: Implementing the default flip, deciding which caches are "sized", and picking unit-test seams. Verified against dev 7761eeb3256, not release_26.2; its gotcha 1 becomes stale once this lands.
  - path: vault/repositories/galaxy/issues/queued/24546/proposal.md
    why: Full proposal, alternatives, #16110/#16052 history and the resolution table the unit tests should cover.
  - path: vault/repositories/galaxy/reviews/archived/23722/review.md
    why: UserObjectStoreCache review; says user stores never start monitors only because templates don't set enable_cache_monitor, so defaulting the gate to True changes that.
    load_when: Reviewing side effects on user-defined (template) object stores and soft_shutdown/shutdown.
  - path: vault/research/Component - Private Object Stores.md
    why: User-defined store construction and Distributed dispatch; doesn't cover cache/monitor lifecycle, so pair with the 23722 review.
    load_when: Checking whether user-store instances would now each start an InProcessCacheMonitor thread.
research_requests: []
```
