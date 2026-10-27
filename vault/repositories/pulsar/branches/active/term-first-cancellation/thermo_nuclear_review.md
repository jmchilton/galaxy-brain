# Hardening review

No blocking structural findings. Addressed the optional recommendation to validate the grace period before signaling.

No recommendations were deferred.

<details><summary>Full review</summary>

Refreshed descendants cover cleanup commands started during the grace period while a captured ancestor survives. Per-process NoSuchProcess handling preserves cancellation of other processes. Windows retains forceful termination semantics. The implementation remains small and direct; no worthwhile structural simplification was found.

The initial cancellation suite passed six tests. A negative grace period previously signaled before wait_procs rejected it; the public entry point now rejects negative/nonfinite values before signals, covered by three tests against real running jobs.

A subsequent runtime check exposed child-first TERM interrupting EXIT cleanup. The final code signals ancestor shells first. A follow-up review covers this correction and the Galaxy mirror.

</details>

## Final follow-up

Final ancestor-first TERM ordering and grace validation approved with no new concerns. Final cancellation suite: 9 passed. Galaxy implementation is byte-identical; tests differ only by import.

## Differential review snapshot

```text
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/pulsar/branches/active/term-first-cancellation/differential-review/snapshots/20261027T042356Z-hardening-d87e08f38b44.json
  hardening @ d87e08f38b44 vs origin/master (merge-base 00a9e8c0b1a9)
  since 20261027T042354Z-implementation-d87e08f38b44:
    commits: 2 same, 0 rebased, 0 changed, 0 new, 0 dropped
    hunks:   6 carried, 0 changed, 0 new, 0 dropped
```
