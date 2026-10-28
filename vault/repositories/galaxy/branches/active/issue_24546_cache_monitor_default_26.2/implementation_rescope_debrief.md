# Implementation re-scope debrief

The scope evaluation (`earlier_drafts/1/scope_evaluation.md`) recommended a modest expansion. iRODS and pithos subclass `CachingConcreteObjectStore` and build cache shards, but they never called `enable_cache_monitor()` or started the monitor, so they hit the same bug in sibling stores. `config_schema.yml` names iRODS as a store this driver controls.

- The original scope is kept as alt `issue_24546_cache_monitor_default_26.2_alt_original_scope` at `827116eff06` (`alts/original_scope.md`).
- `381fb819572`: iRODS and pithos resolve `enable_cache_monitor()`, start the monitor (iRODS at the end of `__init__`, pithos at the end of `_initialize`, like s3), and stop it in `shutdown()`. pithos gained a `shutdown()` that calls `super()`. Red→green tests mock the iRODS/kamaki clients so they always run.
- `5a46ed80bcc`: the post-rescope review found that iRODS `soft_shutdown()` didn't stop the monitor. Fixed red→green.
- The shared lifecycle helper on `CachingConcreteObjectStore` that the scope eval suggested was not done. Per-store calls match the 6 existing sites on a release branch; the helper is a dev follow-up.
- The normal review after the re-scope is at `subagents/normal_review_2_rescope.md`.

Next: re-harden. The earlier hardening debriefs moved to `earlier_drafts/1/`.
