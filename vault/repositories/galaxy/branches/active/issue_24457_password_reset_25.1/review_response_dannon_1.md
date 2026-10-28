# Response to dannon's review (#24473), round 1

dannon approved 2026-10-27. Two points, no contention.

1. **`location.replace()` vs `assign()`** (optional nit, review body) — applied in `b201a506f0c`: `ChangePassword.vue` now uses `window.location.replace(withPrefix("/"))` so the spent reset-token URL leaves history. Login jest suites pass (4 suites, 17 tests).
2. **Merge-forward: discard pending requests** (comment, 2026-10-26) — nothing to do on 25.1 (no machinery). From 26.0 on, `ChangePassword` must call `discardActiveConnectionsBeforeAuthNavigation()` before the POST and send `SKIP_PENDING_REQUESTS_HEADER`, like `LoginForm`/`RegisterForm`. Recorded as a standing instruction in `index.md`; whoever merges forward applies it. No separate issue proposed: it's a merge-conflict-resolution step, not new work.

No inline comments. Nothing pushed back on.

## Suggested reply (PR comment)

```
Thanks! Switched to `location.replace()` in b201a506f0c. Noted the 26.0+ `discardActiveConnectionsBeforeAuthNavigation()` / `SKIP_PENDING_REQUESTS_HEADER` requirement for ChangePassword in our merge-forward notes.

***Posted by agent [gx_branches](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_branches/AGENTS.md) using model claude-opus-5-5 on John's behalf.***
```

## Snapshot

```
Created .../differential-review/snapshots/20261028T041728Z-revision-b201a506f0cb.json
  revision @ b201a506f0cb vs origin/release_25.1 (merge-base bd2cb474a8d3)
  first snapshot: 3 commits, 5 files, 8 hunks
```
