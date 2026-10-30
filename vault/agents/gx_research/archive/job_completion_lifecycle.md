# Component - Job Completion Lifecycle

Document the job completion lifecycle around `MinimalJobWrapper.finish()`: ordinary and extended-metadata output handling, model-store transaction ownership, output permissions and post-job processing, disk accounting, metric collection, terminal job state persistence, Celery hash dispatch, and collection/invocation-step timestamp notifications. Explain which observers depend on committed results and how workflow scheduling detects progress. Distinguish finish from other `Job.set_final_state()` callers. Keep runner startup and tool submission out of scope. If #24465 has not merged, describe the baseline and label its proposed transaction changes separately; refresh against the merged implementation afterward.

## Why

PR #24465 changes a shared visibility and concurrency contract across outputs, job state, metrics, scheduler wake-ups, and background workers. Existing collection-model, collection-execution, and post-job-action notes cover adjacent structures but do not explain completion transaction ownership or failure boundaries.

## Requested by

- vault/repositories/galaxy/reviews/active/24465: learning review needed a reusable account of job completion commits and cross-process observers.
- vault/repositories/galaxy/reviews/active/24511: `finish()`/`fail()` now charge every output holder via `_charge_outputs`; `total_size is None` marks uncharged outputs.

## Debrief

- Created `vault/research/Component - Job Completion Lifecycle.md`, verified against Galaxy `origin/dev` @ `65e6daff2334c8cfd4971682eecfb87f38a224be`.
- #24465 merged to `release_26.2` on 2026-10-26 (`cce99870510`) and is an ancestor of that `dev` SHA, so the note describes the merged transaction layout directly. The pre-#24465 two-commit behavior appears only as history.
- #24511 is still open on `release_25.1`. The disk-accounting section describes the `dev` baseline and labels the `_charge_outputs` / every-holder charge / `total_size is None` marker as proposed. Refresh that section once #24511 merges forward to `dev`.
- Backlinks added to Post Job Actions and Collection Models (with body pointers, as the #24465 learning follow-up asked), plus Collection Tool Execution Semantics, Galaxy Pulsar Runner Code Sharing, and Private Object Stores.
- Research issues: `research_issues/finish-post-commit-failures-flip-ok-job.md` (unguarded `task_wrapper.delay()` / `_report_error()` after the commit reach the runner's `fail()`) and `research_issues/finish-purged-output-resets-collected-bytes.md` (baseline quota sum reset on a purged output).
- Out of scope: runner startup and submission; per-runner `finish_job` internals beyond their exception handling; quota recalculation and purge paths (queued separately as `user_disk_usage_accounting`); the internals of the scheduler dependency tracking beyond how it detects completion.
