# Implementation handoff

Synchronizes the cancellation fix from [Pulsar #541](https://github.com/galaxyproject/pulsar/issues/541). `kill_pid` sends TERM to ancestors before descendants, waits up to a configurable five-second default, refreshes descendants of surviving captured processes, then kills survivors. Grace periods must be finite and nonnegative; Windows remains forceful.

Pushed `c20d1f345ce` on `jmchilton/pulsar-term-first-cancellation`, based on fetched dev `fd43a3c6ce8`. The helper is byte-identical to Pulsar; nine tests are identical except for import.

## Validation and review

`PYTHONPATH=lib .../.venv/bin/python -m pytest test/unit/app/jobs/test_kill.py -q`: 9 passed using the main Galaxy checkout's Python 3.13 environment. Changed-file ruff and Black checks pass; commit hooks also pass black, ruff, flake8, prettier, whitespace/conflict checks. No server-backed backend tests were necessary for this standalone helper.

Normal and hardening reviews of the shared logic addressed cleanup descendants, ancestor-first signal ordering, and grace validation. Final follow-up confirmed the Galaxy mirror and approved it without concerns. See [Pulsar review materials](../../../../pulsar/branches/active/term-first-cancellation/index.md).

## Limits

No real Docker daemon or Windows runtime tested. Descendants reparented after their captured ancestors exit remain a best-effort limitation. No PR or description created; branch waits for the Galaxy branch-management workflow.

## Differential review snapshot

```text
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/pulsar-term-first-cancellation/differential-review/snapshots/20261027T042402Z-implementation-c20d1f345cef.json
  implementation @ c20d1f345cef vs origin/dev (merge-base fd43a3c6ce80)
  first snapshot: 1 commit, 2 files, 3 hunks
```
