# Implementation debrief (re-harden, 2026-10-28)

STATUS: **READY**. Scope: keep.

Run via Opus 5.5 at high effort (coordinator).

Pulsar runner downgrades effective `dependency_resolution` to `none` when the job's container doesn't opt in (`resolve_dependencies`), so Pulsar no longer resolves/installs deps outside the container (#3899). Shared predicate `requires_dependency_resolution()` in `container_classes.py`, used by `command_factory` and Pulsar runner. Previous round archived in `earlier_drafts/1/`.

## Re-harden results
- [Test challenge](test_challenges_debrief.md): no changes; tests hold. New unit tests fail on dev at import (helper is the change) — accepted.
- [Codex review](codex_review.md): no findings.
- [Thermo-nuclear](thermo_nuclear_review.md): approve as-is. Follow-up candidate: named result for `__prepare_job` 6-tuple.
- [Baseline refactor](baseline_refactor.md): split `requires_dependency_resolution` extraction + `MockContainer` into leading commit `96f8c018ad6`; final tree byte-identical to old tip `05e0c26b297`. Coordinator reworded fix commit to match.
- [Scope evaluation](scope_evaluation.md): keep. Opted-in containers with `remote` resolution still resolve on host — pre-existing, needs Pulsar change; follow-up issue candidate.
- Check branch: black/isort/ruff clean; mypy on changed files net-neutral vs base.
- Unit: `test_pulsar_runner.py` + `test_command_factory.py` 77 passed at tip. Docker integration test not run locally; green on old head (run 38430289612), tree unchanged — fresh CI pending on new head.

Head `1b94de12b96` on `jmchilton`. No PR opened.

```
exists .../differential-review/snapshots/20261028T153646Z-hardening-1b94de12b96c.json
  hardening @ 1b94de12b96c vs origin/dev (merge-base b23da2fc8f09)
  since 20261028T152315Z-implementation-05e0c26b297a:
    commits: 0 same, 1 rebased, 3 changed, 1 new, 0 dropped
```

Implementation snapshot: `created .../20261028T152315Z-implementation-05e0c26b297a.json` (implementation @ 05e0c26b297a vs origin/dev; 4 commits, 5 files, 24 hunks).
