# `finish()` drops earlier outputs' bytes from the quota charge when one output is purged

- Area: lib/galaxy/jobs/__init__.py (MinimalJobWrapper.finish disk accounting)
- Found while: [[Component - Job Completion Lifecycle]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

The disk-accounting loop in `finish()` (`lib/galaxy/jobs/__init__.py:2484-2496`) sums `dataset.set_total_size()` over `job.output_datasets` into `collected_bytes`, but sets `collected_bytes = 0` whenever an output is purged:

```python
collected_bytes += dataset.set_total_size()
if dataset.purged:
    dataset.full_delete()
    collected_bytes = 0
```

Resetting the accumulator discards the bytes of every non-purged output that came before the purged one in iteration order. Outputs after it are still counted. The user is undercharged by an amount that depends on output order, and a later recalculation is needed to correct it.

The same block also:

- Charges only `job.user` (`:2521-2523`). Owners of copies made while the job ran are not charged.
- Uses the quota source of the last output for the whole sum (`:2490-2491`, "assume all datasets in a job get written to the same objectstore").
- Writes the default-source charge as a Python read-modify-write (`self.disk_usage = (self.disk_usage or 0) + amount`, `lib/galaxy/model/__init__.py:1149-1150`), so concurrent finishes for the same user on different handlers can lose an update.

## Evidence / repro

Code read only. Repro idea: a two-output tool where the user purges the second output while the job runs. After finish, compare `user.disk_usage` with the first output's `total_size`.

## Suggested fix

Skip purged outputs (`continue`) instead of resetting the sum. Open PR #24511 (`[25.1]`, not merged at this SHA) removes the accumulator altogether: `finish()` calls `set_total_size()` on each output and then `_charge_outputs(...)`, which charges every holder per quota source with increment-style writes. Once it merges forward, this issue should be closed against it.

## Related

- `vault/repositories/galaxy/reviews/active/24511/`
- [[Component - User Disk Usage Accounting]] (from the `user_disk_usage_accounting` request, now in `vault/agents/gx_research/archive/`)
