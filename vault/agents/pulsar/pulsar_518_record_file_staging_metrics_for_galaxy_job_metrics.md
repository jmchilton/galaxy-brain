# PR 518 — Record file staging metrics for Galaxy job metrics

Reviewed local `pulsar-transfer-metrics` at `392c870` against its PR branch point `3e455c8`. The implementation reuses the existing job metrics filename convention and `ResultsCollector`; imports are at module scope. I found two counting defects.

## Findings

1. **Count only output actions that actually transfer a file** (`pulsar/managers/staging/post.py:152–173`). `PulsarServerOutputCollector.collect_output` calls `metrics.record_file` after `execute` even when `action.staging_needed` is false. For an `output` mapped to `none` on a shared filesystem, `BaseAction.write_from_path` returns without copying, but the file and its full size are still reported as a Pulsar stage out. Check `staging_needed` (and successful execution) before recording; add a `none` action test.

2. **Do not count an output skipped on cancellation** (`pulsar/managers/staging/post.py:153–173`). `action_if_not_cancelled` returns early when `was_cancelled()` is true, but the unconditional `record_file` still increments `files` and `bytes` if the local source exists. Have the callback report whether it transferred, then record only on success; cover cancellation in `staging_metrics_test.py`.

## Test status

## Resolution

Both findings are fixed on the PR branch. Transfer metrics now require a staging action and a completed, uncancelled callback. Regression tests cover shared filesystem and cancelled outputs. The new test files pass (15 tests), as do the existing client staging tests (12 tests); Ruff and `git diff --check` pass.
