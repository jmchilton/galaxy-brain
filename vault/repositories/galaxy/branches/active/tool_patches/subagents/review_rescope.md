# Review: re-scope

Acted on in `cc4712bc072`: bug 1 (engine version in `token()`, test extended), bug 2 (per-populate deltas, boot-line wording), nits 3 (restart doc) and 4 (WeakKeyDictionary memo; docstring).

Not acted on: nit 5 (patch counts in populator stats) - optional; nit 6 - fine as is. The rolling-restart limitation is recorded in `implementation_rescope_debrief.md`.

<details><summary>Full review</summary>

Normal review of the re-scope (`f2c0bd3526a`, `bff6bdec4df` on `4ec188d7a21`). Run via Claude Opus 5.5.

**Verdict: nearly there. One real bug: `ENGINE_VERSION` is missing from the freshness token, so on cached-toolbox boots item (3) never takes effect. Fix it before hand-off.**

- **Reproduced:** in a scratch test, after monkeypatching `ENGINE_VERSION` to 2, `digest_for` changes but `db.token()` stays the same. Nothing else in `tool_confs_token` hashes a Galaxy version within a series; only `galaxy_series` is there.
- The other three items are correct. Memoizing on the config object is safe in every path I checked.
- **Known limitation the coordinator must carry into the implementation debrief (not a blocker; choice (a) was deliberate):** "restart" now means restart every process sharing the store. During a rolling restart, the store ping-pongs between collection versions. A `populate_store` CLI run after editing the collections is reverted by the next toolbox reload of any process that hasn't restarted. The old disk-read semantics converged in both cases. See nit 3.
- **Tests:** `test_populate_store.py`, `test_toolbox.py` and `test_tool_patches.py` gave 280 passed and 2 xpassed; `test_freshness.py` gave 11 passed.

## Bugs

1. **`ENGINE_VERSION` is in the per-tool digest but not in `token()`.** See `lib/galaxy/tool_util/patches/database.py:182`.
   - `token()` hashes `collections_summary()`, which has no engine version.
   - Under `use_cached_toolbox`, `_index_needs_population` (`cached_toolbox.py:889`) skips the populator whenever `index_is_fresh()` is True.
   - After an upgrade that bumps `ENGINE_VERSION`, the token is unchanged, so the index stays "fresh" and the boot never runs a populate. The new digest that `indexed_patch_is_current` would compare is never consulted. Stored sources patched by the old engine are served until a conf or collection change forces a populate.
   - This is exactly the case item (3) was meant to cover. `test_engine_version_is_in_the_digests` only checks `digest_for`.
   - Fix: `return _sha256(f"{ENGINE_VERSION}\0" + self.collections_summary().model_dump_json())` (or fold `_policy_bytes()` in). Extend the test to check that `db.token()` changes too.

2. **The patch counters accumulate for the whole process.** See `database.py:226` and `:231`, and `populator.py:1010`.
   - The populate-end line reports totals since startup, not for this run. A shed install's one-path partial populate logs "applied N" for every patch ever applied in the process. Each eager or cached reload adds a full re-application.
   - Under `CachedToolBox` with a fresh index, nothing is applied at boot (sources come from the store). The boot line at `app/__init__.py:465` then reads "applied 0 …" while every patched tool is being served patched, which misleads admins.
   - Fix, either:
     - snapshot the `Counter` at populate start and log the delta, adding "since startup" to the boot line; or
     - for the cached boot, count from the index entries' `patch` states instead of from apply calls.
   - At minimum, reword the line to "applied so far in this process".

## Nits / doc

3. **"Restart" really means restart every process sharing the store.** See `config_schema.yml:1068` and `galaxy.yml.sample`.
   - Choice (a) makes each process consistent with itself, but not processes with each other. Two cases:
     - Rolling restart, or a long-lived Celery worker or job handler next to restarted web workers. Each process's token disagrees with the index another process wrote. Any one of them that reloads its toolbox sees "stale" and re-patches the shared store with its own collections. The store ping-pongs until every process runs the same collections.
     - An admin edits the collections, runs `populate_store.py` (new database, new token), and does not restart Galaxy. Running processes serve the new patches after `reload_tool_source_cache`. Their next toolbox reload sees a token mismatch and reverts the store to the old patches.
   - Before this change, the probe and populator read from disk, so these cases converged.
   - This is acceptable for an MVP, but the doc should say: "changes need a restart of all Galaxy processes sharing the tool source store; running `populate_store` alone is undone by the next toolbox reload of a process that has not restarted."
   - Worth a line in the debrief as a known limitation and a pointer to option (b) / phase-2 live reload.

4. **Settings key vs. mutating the config** (`tools/patches.py:46-49`). The key tracks `paths`, reproducibility and requirement changes. Mutating any of them on the same config object gives a second database, whose token diverges from `app.tool_patches`. Nothing in Galaxy does this:
   - none of the three options is `reloadable`;
   - `reload_config_options` only touches reloadable options;
   - no code copies or pickles `GalaxyAppConfiguration` or iterates `vars()`/`__dict__` (a wide grep for `deepcopy(`, `copy.copy(`, `pickle.`, `ProcessPoolExecutor`, `multiprocessing` and spawn contexts found no config reaching any of them).

   So it only matters for tests, like `test_freshness_token_tracks_collection_changes` mutating `tool_patch_reproducibility`, and they rely on it. Fine. Optional: make the "per settings" part of the docstring explicit ("mutated settings load a new database; the app keeps the one it booted with").

   Related: the memo now puts a `ToolPatchDatabase`, with its two `threading.Lock`s, in `config.__dict__`, so any future pickle or deepcopy of the config would raise. If that is a worry, a module-level `weakref.WeakKeyDictionary` keyed on the config avoids it.

5. **The scope evaluation asked for the counts in populator `stats` and the load summary** (`tools/__init__.py:719`, `cached_toolbox.py:621`). The code logs a separate summary line instead. That's fine, but `populate_store_inline`'s returned stats (and the CLI output) carry no patch counts, so tests and the CLI can't assert them. Optional.

6. **The global `_databases_lock` is held during `load_tool_patch_database`** (file hashing and YAML parse). It only blocks the first call per config, so the watcher probe and the boot populate wait once. Fine. A load failure isn't cached and retries on every probe tick, as before.

## Checked, no issue

- **`vars(config)` on `GalaxyAppConfiguration`.** `HasDynamicProperties` is `object` at runtime (`util/dynamic.py`). The config has no `__slots__` and no `__getattr__`/`__setattr__`, so `vars()` is the real instance dict.
- **Forks, Celery and threads.**
  - A fork (gunicorn preload) inherits a dict that already matches `app.tool_patches`.
  - Celery workers build their own app and config, so they get their own consistent database.
  - The populator pool is `ThreadPoolExecutor`, and the counter is lock-guarded.
- **The `populate_store` CLI with `--tool-patch-path`.** It builds new properties and a new `GalaxyAppConfiguration`, so it gets a fresh database. Its `--watch` mode keeps its database for the CLI's lifetime, which is consistent with "restart".
- **In-process populate.** `populate_store_inline(self.app.config, app=self.app)` and the probe pass the same config object as `app.tool_patches`, so the store, index token and eager path share one database. No path inside the server builds a second `GalaxyAppConfiguration`.
- **Can the token mark an index fresh while its stored sources were patched by a different database?** Not within one series, except via bug 1. Every other input to the per-tool digest is either in the token or forces re-population:
  - the collection content digests, the policy and the series are in `collections_summary`;
  - the shed changeset for an override only affects the per-tool digest, and a shed change alters the confs, which changes the token.
- **The store skip in `get_expanded_tool_source`** (`tools/__init__.py:843-846`).
  - `_get_tool_source_from_store` only answers when `use_cached_toolbox` is set and a store exists, which is exactly when `_use_cached_toolbox()` builds a `CachedToolBox`.
  - The eager store lookup is therefore reachable only from `CachedToolBox.create_tool`'s last-resort fallback, after an ad-hoc populate miss.
  - `CachedTool` materialisation goes through `_create_tool_from_stored_source` with `entry.patch` and is unaffected. There is no performance cost on the normal cached path.
  - In the fallback, parse plus patch from disk is the correct result. A fallback tool listed by a read-only conf gets local patches, but it isn't in that store's index anyway.
- **Tests.**
  - The restart modelling in `TestToolPatches._config` is sound: it asserts that the same config keeps the old database (`unchanged == 3`, token unchanged) before the fresh config picks up the change.
  - The new toolbox test asserts `get_by_source_path` isn't called and `patch_state` is applied. That is a direct red-to-green for phase C/D bug 3.

</details>
