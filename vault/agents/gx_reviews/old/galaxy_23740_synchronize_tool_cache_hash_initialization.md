# galaxy#23740 - [26.1] Synchronize tool cache hash initialization

https://github.com/galaxyproject/galaxy/pull/23740 · mvdbeek · head a87754fb269 · base release_26.1 · reviewed 2026-09-27

## Summary

Two fixes in `lib/galaxy/tools/cache.py`, plus a new `test/unit/app/tools/test_tool_cache.py`:

1. `ToolCache.assert_hashes_initialized()` now holds `self._lock` while it iterates `_hash_by_tool_paths`. Without it, a concurrent `cache_tool`/`cleanup`/`expire_tool` could raise `dictionary changed size during iteration` and kill the watcher thread (Sentry GALAXY-TEST-394 and others). This backports the change #23465 made on dev, and dev's `assert_hashes_initialized` matches it exactly.
2. `cache_tool` reads `lazy_hash = not self._hashes_initialized` inside the lock instead of before it. This one is new and not on dev yet; forward-merge will carry it, and the diff should apply cleanly because dev still has the old lines. The old race: an insertion reads `False` and waits on the lock while init runs, then inserts a lazy `ToolHash` after init has finished. That hash is computed later from the *edited* file inside `_should_cleanup`, so it matches and the edit goes unnoticed.

The only caller of `assert_hashes_initialized` is the watcher thread (`lib/galaxy/tool_util/toolbox/watcher.py:95`).

## Findings

### Blocker
None.

### Major
None.

### Minor
- The lock is held for the whole startup hash pass, which reads and hashes every tool and macro file. On a large toolbox, `cache_tool`/`cleanup`/`expire_tool` block until it finishes. Dev already works this way, and the other options (snapshot, hash outside the lock, then re-check) would make fix 2 harder. Acceptable. No deadlock risk: `Lock` is non-reentrant, but nothing inside the critical section takes the lock again. The lock is per instance and taken in the watcher thread after startup, so it is fork-safe.
- The `macros.xml` param: `_should_cleanup` invalidates macros on mtime alone and never checks the macro hash. The final `cleanup() == ["tool"]` would pass for macros even with the bug. That param only catches the regression through the private `_tool_hash == md5` assertion. Fine, just less meaningful than it looks.

### Nits
None worth raising. The new comment in `cache_tool` explains a real ordering constraint, so it is not an obvious comment. Imports are at module top.

## Reuse

The PR uses the existing per-instance `ToolCache._lock`, with no new primitive. Nothing more to reuse here.

## Tests

- `test_tool_cache.py`: 3 passed in 0.8s at HEAD. `test_toolbox.py`: 38 passed, 2 xpassed (the author reports the same xpasses).
- Red check:
  - Reverting only fix 2 fails both params on `_tool_hash == md5` (None).
  - Reverting both fixes fails both params (the `lock.locked()` assert fires in the init thread, then the 5s event wait times out).
- The test is deterministic. `ObservedLock` records when the insertion attempts the lock, events gate each step, and there are no sleeps. Waits have 5s timeouts, so a regression fails instead of hanging. It pokes private attributes (`_lock`, `_tool_hash`), which is reasonable for a concurrency unit test.
- `test_hash_initialization_is_lazy` is small but not trivial: it pins the deferred-startup behavior that fix 2 must keep.

## Suggested verdict

Approve.

## Draft GitHub review

*Posted by Claude (AI assistant) on behalf of @jmchilton — not authored by them personally.*

Looks good. Holding the lock across init matches dev (#23465), and reading `_hashes_initialized` under the lock in `cache_tool` closes a real hole: a lazily created `ToolHash` would otherwise take its baseline from the already-edited file.

Checked locally: the new tests pass, and they fail with either fix reverted (only the flag-under-lock change reverted, or both). They're event-driven with no sleeps, so they should be stable in CI.

One minor note, no action needed: the `macros.xml` param only catches the regression through the `_tool_hash` assertion, because macro invalidation in `_should_cleanup` is mtime-only. The final `cleanup()` check would pass either way for macros.
