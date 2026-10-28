# Normal review 2 (post re-scope)

Run via Claude Opus 5.5 (general-purpose subagent, default effort).

Acted on: iRODS `soft_shutdown()` didn't stop the new cache monitor. Fixed red→green in `5a46ed80bcc`.

Not acted on:
- **Duplicated `if irods is None` check** (`irods.py:284-288`): already on base. Leave it on a release branch.
- **Base `CachingConcreteObjectStore.shutdown/soft_shutdown` stopping the monitor:** a dev follow-up, not a 26.2 change.
- **Reviewer's claim that iRODS user stores start a monitor per store:** wrong. User stores are pinned to `external` (`GalaxyConfigAdapter`), so the soft_shutdown gap only affected admin-built stores. It's still fixed.

<details><summary>Details</summary>

Verdict: needs one small fix. Expansion `381fb819572` is the right size and matches the 6 existing stores.

- **Bug:** `IRODSObjectStore.soft_shutdown` (`irods.py:343`) overrides the base, which calls `shutdown()`, and stops only the connection-pool monitor. A retired store keeps its daemon `CacheMonitorThread`. Reproduced with a scratch script. Fix: call `_shutdown_cache_monitor()` in `soft_shutdown`.
- **Domain checks OK:**
  - iRODS starts its monitor last and stops it first.
  - pithos `shutdown()` calls `super()`, so the default `soft_shutdown` stops it.
  - pithos is not a template type.
  - Per-store calls are fine for 26.2.
  - The new tests fail without the change, shut down in `finally`, mock the client libraries so they always run, and keep imports at the top.
- **Nits:** duplicated `irods is None` check (pre-existing). Test placement is consistent.
</details>
