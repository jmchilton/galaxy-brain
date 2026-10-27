# Implementation debrief

Pulsar #541 is reproduced and fixed: cancellation sends TERM, waits up to five seconds by default, and kills surviving processes. Callers may choose a finite, nonnegative grace period. The stock POSIX path uses the same grace setting; Windows retains forceful termination.

Process snapshots retain original descendants and discover cleanup children before escalation. Ancestors receive TERM first to prevent a later signal interrupting EXIT cleanup already triggered by child termination.

## Validation

- Base `00a9e8c`: psutil EXIT cleanup regression fails at the missing marker using the original API.
- Focused cancellation and manager tests: 20 passed; `make lint` passed.
- Broader `make tests`: 453 passed, 136 skipped, 11 failures from missing optional pycurl/kombu/pykube dependencies in the reused local environment; none involve the changed helper. Log: `/private/tmp/pulsar-541-tests.log`.
- Normal review findings addressed; hardening completed.

## Limits

No real Docker daemon or Windows runtime was tested. Discovering late descendants remains best effort if their ancestor has already exited and reparented them; cleanup work beyond the configured grace is intentionally killed. The grace period bounds waiting, not process enumeration time.

## Galaxy coordination

The mirrored helper and regressions are being synchronized on Galaxy branch `pulsar-term-first-cancellation` against fetched dev `fd43a3c6ce8`, following the Galaxy implementation handoff.

## Differential review snapshot

```text
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/pulsar/branches/active/term-first-cancellation/differential-review/snapshots/20261027T042354Z-implementation-d87e08f38b44.json
  implementation @ d87e08f38b44 vs origin/master (merge-base 00a9e8c0b1a9)
  first snapshot: 2 commits, 2 files, 6 hunks
```
