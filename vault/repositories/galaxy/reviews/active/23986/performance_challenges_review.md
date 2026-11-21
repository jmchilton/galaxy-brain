# Performance review — galaxy#23986

- Profile: gx_performance_challenger
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `ae37e517ebc3e8acbbd2225848f4b896511375f1`
- Debrief and measurement plan: [performance_challenges_debrief.md](performance_challenges_debrief.md)

## Flag off (default): no findings

With `crypt4gh_enabled: false`, no new queries, rows or response bytes reach job dispatch, finish or fail, tool submission, the job cache, dataset serialization, upload sniffing or the history panel.
Every new path is gated on `protection.enabled`, `registry.crypt4gh_enabled` or `job.protection_scheme`.
The migration adds a nullable, unindexed, default-less column, which is metadata-only on PostgreSQL.

All findings below apply only when the feature is enabled.

## P2 1 — Grant recording does one SELECT per protected output at job finish

`DatasetProtectionManager._record_output_grants` calls `_get_or_create_grant` → `get_grant` for every protected output. A protected job writing a 10k-element collection makes 10k grant lookups in the handler's finish path, and nearly all of them miss on fresh datasets.
Galaxy's session doesn't autoflush, so a grant created earlier in the loop is also invisible to a later lookup. Two output instances of one dataset would insert duplicate rows that then fail on the unique constraint.

Fix: load the existing grants for the job's user and output dataset ids in one (chunked) `IN` query, create the missing ones and `add_all` them.

## P2 2 — Submission-time `check_job_inputs` walks and re-queries whole collections for every job

With the feature on, `DefaultToolAction.execute` runs `check_job_inputs` → `_protected_inputs` for every non-cached job, encrypted inputs or not.
For a collection input, `_dataset_instances(value)` re-runs the nested-collection query that `_collect_input_datasets` already ran in the same request and materializes every HDA. That is a second 100k-row query for a tool taking a 100k-element list.
`_read_datasets` also computes `find_conversion_destination` for `<conversion>` inputs before checking `is_protected`.
The dispatch path already guards the same work with the in-memory `has_protected_inputs(job)`. Submission has no such guard.

Fix: skip the parameter walk unless `any(is_protected(d) for d in inp_data.values() if d)`. `inp_data` already holds collection elements. Also check `is_protected` before looking up conversions in `_read_datasets`.

## P3 1 — Finish and fail re-walk the outputs, and metadata-file checks may pull whole files into the cache

`purged_outputs(job)` and then `finish_job` / `fail_job` each call `_job_outputs(job)`, which re-runs the full collection query per output collection.
`_is_protected_as_recorded` calls `check_crypt4gh(metadata_file.get_file_name())`. On caching object stores that can download a whole metadata file (e.g. a BAM index) just to read its magic bytes. Primary files are already checked with `get_data_head`.
Verification is serial: one backend request per output, plus one per extra file and metadata file.

Fix: compute the outputs once per finish and pass them to both steps. Read metadata-file headers with `get_data_head`. Consider measuring finish time for large protected collections on an S3 store (see the debrief's measurement plan).

## P3 2 — Enabling the feature doubles the datatype registry and the client mapping payload

Measured on this branch with the sample `datatypes_conf.xml`:

- Registered extensions: 813 → 1627.
- `view_mapping`: 153 KB → 311 KB raw JSON.
- `view_types_and_mapping`: 160 KB → 318 KB.
- `view_edam_formats`: 21 KB → 46 KB.

The client fetches `/api/datatypes/types_and_mapping` on common pages. Remote metadata jobs also rebuild every wrapper class, because `crypt4gh_enabled="true"` is written into the registry XML.
Registry load time stayed small, at 0.07–0.29 s.

Fix: optional. Consider leaving the per-datatype `.c4gh` wrappers out of the mapping payloads (the client only uses `isCrypt4ghExtension`), or document the growth for admins.

## P3 3 — `dataset_protection_grant` grows without bound, and its `user_id` index is redundant

Every output of every protected job writes a grant row with JSON `grant_data`. Nothing removes expired grants, or grants on purged datasets: the `delete-orphan` cascade only fires on ORM deletes of `Dataset`, which purge doesn't do.
`UniqueConstraint("user_id", "dataset_id", "scheme")` already provides a `user_id`-leading index, so the separate `index=True` on `user_id` only adds write and storage cost.

Fix: drop the redundant `user_id` index. Consider a celery-beat cleanup of expired grants and grants on purged datasets, which an `expires_at` index would help.

---

The P2 1, P2 2 and P3 1 magnitudes come from reading the code and are speculative. P3 2's numbers are measured with a Python harness on the branch.
