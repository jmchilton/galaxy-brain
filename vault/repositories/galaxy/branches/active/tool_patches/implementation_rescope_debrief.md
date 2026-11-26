# Re-scope debrief

```
created .../tool_patches/differential-review/snapshots/20261126T024853Z-revision-cc4712bc0720.json
  revision @ cc4712bc0720 vs origin/dev (merge-base ce63095e7a8a)
  since 20261126T013729Z-implementation-8d09587db633:
    commits: 8 same, 0 rebased, 0 changed, 12 new, 0 dropped
```

The first scope evaluation (now `earlier_drafts/1/scope_evaluation.md`) recommended a modest expansion. The original scope is kept as `tool_patches_alt_original_scope` at `4ec188d7a21` (see `alts/original_scope.md`).

## What changed

- **`f2c0bd3526a`, `cc4712bc072`: one patch database per process.**
  - `tool_patch_database_from_config` memoizes per config object and settings, in a `WeakKeyDictionary` guarded by a lock.
  - `app.tool_patches`, the in-process populator and the freshness token therefore share one database. Collection changes take effect on restart everywhere.
  - With patches configured, the eager toolbox parses and patches from disk instead of serving store rows, which have no patch state. This was phase C/D bug 3.
  - `ENGINE_VERSION` is folded into the per-entry digests and the freshness token.
  - `ToolPatchDatabase.summary()` and its counters are logged at boot and per populate. The populate line counts only that run.
- **`bff6bdec4df`, `cc4712bc072`: config docs.** A restart means every process sharing the tool source store. Running `populate_store.py` alone is undone by the next toolbox reload of a process that hasn't restarted.
- **`76b348f58bc`: level rename** (John, 2026-11-25). `special_inputs` became `unusual_inputs` and `all_inputs` became `ordinary_inputs`. The default is `ordinary_inputs`, and there are no aliases.

## Review

- **`subagents/review_rescope.md`:**
  - Bug 1: the engine version was missing from the freshness token. Fixed.
  - Bug 2: the counters accumulated across the process. Fixed with per-populate deltas and boot-line wording.
  - Nits 3 and 4 fixed (the docs, and a weak memo).
  - Nit 5 not taken: patch counts aren't added to the populator's returned stats.

## Known limitation

The design chose restart-only semantics. During a rolling restart, or with long-lived handler or Celery processes beside restarted web workers, processes running different collections disagree on the token. The shared store then flips between collection versions until every process runs the same ones. Live reload (phase 2) is the fix.

## Tests

- Unit suites: 566 passed, 2 xpassed.
- `test/integration/test_tool_patches.py`: 12 passed.
- New red-to-green tests:
  - the toolbox skips store rows with patches configured;
  - summary counts and per-run deltas;
  - the engine version changes both the digest and the token;
  - populate tests model a restart with a fresh config, and assert the same config keeps its database.
