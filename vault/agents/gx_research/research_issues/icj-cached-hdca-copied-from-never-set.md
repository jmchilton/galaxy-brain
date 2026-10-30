# Fully cached map-over never marks its implicit HDCA as copied

- Area: lib/galaxy/tools/execute.py (ExecutionTracker), job cache
- Found while: [[Component - Jobs API and Job Cache]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

`ExecutionTracker` (`lib/galaxy/tools/execute.py:765-806`) is supposed to set `copied_from_history_dataset_collection_association_id` on each implicit output HDCA when every element job of a map-over was an early job cache hit. It does this so later cache queries and provenance treat the HDCA as a copy. The guard compares a set of SQLAlchemy `Row` tuples with a set of ints:

```python
completed_job_ids = {job.id for job in self.completed_jobs.values() if job}
completed_implicit_jobs_copied_from = set(
    self.implicit_collection_jobs.get_job_attributes(["copied_from_job_id"]).all()
)
if completed_implicit_jobs_copied_from <= completed_job_ids:
```

`get_job_attributes` returns `session.execute(select(Job.copied_from_job_id) ...)` (`model/__init__.py:3073-3082`), so `.all()` yields `[(5,), (6,)]`. `{(5,), (6,)} <= {5, 6}` is always `False` for a non-empty ICJ, so `completed_collections` stays `{}` and the copied-from link is never written.

This regressed in `306369f1ab8` ("Optimize /api/invocations/steps/{step_id}", Nov 2025). It replaced `all(job.copied_from_job_id in completed_job_ids for job in ...job_list)` with this set comparison.

## Evidence / repro

- Python check with SQLAlchemy: `set(conn.execute(text("select 5 union all select 6")).all()) <= {5, 6}` is `False`; against `{(5,), (6,)}` it is `True`.
- No test asserts `copied_from_history_dataset_collection_association_id` after a cached map-over. `grep -rn copied_from_history_dataset_collection lib/galaxy_test` is empty.
- Downstream readers: `managers/job_connections.py:35`, `copied_from_history_dataset_collection_association_id_chain` in HDCA serialization (`model/__init__.py:8484`), and model store export/import (`model/store/__init__.py:1106`).

## Suggested fix

Use `.scalars().all()` (or `{row[0] for row in ...}`) so both sides are ints. Add an API test: run a map-over with `use_cached_job` twice, then assert the second implicit HDCA's copied-from id (through the job connections graph or an HDCA show field that exposes it).

## Related

- `306369f1ab8`
- `e9685a29b2e` "Record when an implicit HDCA has effectively been copied" (the original feature)
