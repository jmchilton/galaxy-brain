# Component - Job Completion Lifecycle

Document the job completion lifecycle around `MinimalJobWrapper.finish()`: ordinary and extended-metadata output handling, model-store transaction ownership, output permissions and post-job processing, disk accounting, metric collection, terminal job state persistence, Celery hash dispatch, and collection/invocation-step timestamp notifications. Explain which observers depend on committed results and how workflow scheduling detects progress. Distinguish finish from other `Job.set_final_state()` callers. Keep runner startup and tool submission out of scope. If #24465 has not merged, describe the baseline and label its proposed transaction changes separately; refresh against the merged implementation afterward.

## Why

PR #24465 changes a shared visibility and concurrency contract across outputs, job state, metrics, scheduler wake-ups, and background workers. Existing collection-model, collection-execution, and post-job-action notes cover adjacent structures but do not explain completion transaction ownership or failure boundaries.

## Requested by

- vault/repositories/galaxy/reviews/active/24465: learning review needed a reusable account of job completion commits and cross-process observers.
- vault/repositories/galaxy/reviews/active/24511: `finish()`/`fail()` now charge every output holder via `_charge_outputs`; `total_size is None` marks uncharged outputs.
