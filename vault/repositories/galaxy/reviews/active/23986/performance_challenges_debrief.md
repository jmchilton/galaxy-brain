# Performance challenge debrief — galaxy#23986

- Profile: gx_performance_challenger (N.O.T. M.A.R.I.U.S.)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `ae37e517ebc3e8acbbd2225848f4b896511375f1`
- Mode: REVIEW_DIRECTORY (recommendations only; the PR was not edited)

## Summary

With `crypt4gh_enabled: false` (the default) every hot path checked is guarded by a cheap in-memory test.
None of the patterns below adds a query, a row or response bytes with the flag off:

- Job dispatch: `MinimalJobWrapper._authorize_protected_job` returns early on `protection.enabled`.
- Job finish and fail: every protection step is gated on `job.protection_scheme`.
- Tool submission: `DatasetProtectionManager._protected_inputs` returns at once when disabled.
- Job cache: `Tool._may_reuse_job` only runs on a cache hit from another user, and returns at once when disabled.
- Conversions: `retire_unusable_conversion` checks `is_protected` first.
- Registry: wrapper datatypes are only registered when the flag is on, and `_crypt4gh_inner_ext` short-circuits.
- Upload sniffing: `check_crypt4gh` is guarded by `registry.crypt4gh_enabled`.
- Dataset serialization: no new serialized field (the client derives "encrypted" from `extension`).
- History panel: the client fetches `/api/datasets/{id}/protection` once, only when an `ok` `.c4gh` dataset is expanded. No polling.

The `job.protection_scheme` column is nullable with no default and no index, so the migration is metadata-only on PostgreSQL 11+.
With the flag off, the costs left are the one extra column per `job` row read and the attribute writes `job.protection_scheme = None` / `job_io.protection_plan_path = None` during prepare.
Both ride on UPDATEs that already happen. This is negligible.

The remaining concerns apply when the feature is **on**. They scale with the size of protected jobs and of collection inputs.

## Findings and recommendations

### 1. Per-output `SELECT` when recording grants at job finish (flag on, protected jobs)

`DatasetProtectionManager._record_output_grants` calls `_get_or_create_grant` → `get_grant` once per protected output.
That is one `SELECT … FROM dataset_protection_grant WHERE user_id=? AND dataset_id=? AND scheme=?` per output, inside the job handler's finish path.
A protected job writing a 10k-element output collection issues 10k round trips. Almost all of them miss, because outputs are fresh datasets.
Galaxy's session has `autoflush=False`, so there is no per-row flush on top of that. But a pending grant is also invisible to a later `get_grant` in the same loop. If two output instances share a dataset, the result is a duplicate insert that fails at commit on the unique constraint. That is a correctness edge, flagged and not chased.

Recommendation: load the existing grants in one query, `select(DatasetProtectionGrant).where(user_id == job.user_id, scheme == ..., dataset_id.in_(ids))`, chunked if needed.
Build a dict, create the missing rows, and `add_all` them. This follows the #18970 flush/commit-hygiene lesson.

### 2. Output verification work is linear in outputs and re-walks the outputs (flag on, protected jobs)

For each protected job, `purged_outputs(job)` and `finish_job()` (or `fail_job()`) each call `_job_outputs(job)`.
Each call re-runs `collection.dataset_instances`, a full nested-collection query that materializes every HDA, for every output collection.
For each output, `_is_protected_as_recorded` then does the following, all serially on the handler thread:

- One `object_store.get_data_head` (a ranged GET against S3/iRODS backends, by design).
- One `check_crypt4gh` per extra file.
- One `check_crypt4gh(metadata_file.get_file_name())` per metadata file. For caching object stores this may pull the whole metadata file (e.g. a BAM index) into the cache just to read its magic bytes.

Reading the stored header from the backend is the point of the design, so that read is not the problem.
The cost is a 10k-element protected collection doing 10k+ sequential backend requests in finish.

Recommendations:

- Compute `_job_outputs(job)` once per finish and pass it to `purged_outputs` and `finish_job`.
- Read metadata-file magic with `get_data_head` too, not `get_file_name()`, so no full file is pulled into the cache.
- Document, or measure, the per-output verification cost for large protected collections. A small thread pool for `get_data_head` is an option if it matters.

### 3. Submission-time `check_job_inputs` re-queries whole collections without a cheap guard (flag on, every tool request)

`DefaultToolAction.execute` calls `check_job_inputs` for every non-cached job when the flag is on, whether or not any input is encrypted.
`_protected_inputs` walks the parameters, and for a `data_collection` input `_dataset_instances(value)` calls `value.dataset_instances`.
That repeats the nested-collection query `_collect_input_datasets` has already run in the same request, returning every HDA (entities, not just extensions).
For a tool consuming a 100k-element collection, that is a second 100k-row query per job submission, on servers where the feature is enabled.
The dispatch path already has the right shape: `has_protected_inputs(job)` is an in-memory check that skips the parameter walk for most jobs.
`_read_datasets` also calls `_existing_conversion` (`find_conversion_destination`) for inputs with `<conversion>` tags before checking `is_protected`. Encrypted datasets are the rare case, so check `is_protected` first.

Recommendation: guard `check_job_inputs` with an in-memory check over the already collected `inp_data` values, for example `any(protection.is_protected(d) for d in inp_data.values() if d)`.
`inp_data` already contains the elements of collection inputs. Only walk the parameters when that check is true.
Also check `is_protected(input_instance)` before computing conversions in `_read_datasets`.

### 4. Enabling the feature doubles the datatype registry and the datatype mapping payload (flag on)

Measured with `example_datatype_registry_for_sample` on this branch (sample `datatypes_conf.xml`):

| | extensions | `view_mapping` JSON | `view_types_and_mapping` JSON | `view_edam_formats` JSON |
|---|---|---|---|---|
| flag off | 813 | 153 KB | 160 KB | 21 KB |
| flag on | 1627 | 311 KB | 318 KB | 46 KB |

Registry load time stayed small (0.07–0.29 s warm in both modes). `view_index(extension_only=True)` is unchanged.
`/api/datatypes/types_and_mapping` is fetched by the client datatypes stores (tool forms, upload, history filters), so every client page load roughly doubles that payload.
Gzip shrinks it a lot, but JSON parse and memory still grow. The registry is also reloaded, with all wrapper classes, in every remote metadata job: `crypt4gh_enabled="true"` is written into the registry XML.

Recommendation: consider not exposing every `<ext>.c4gh` wrapper in the mapping or `class_to_classes` payloads, since the client only needs `isCrypt4ghExtension()`.
Alternatively, register wrappers only for datatypes that can be uploaded or produced, and document the payload growth for admins.

### 5. `dataset_protection_grant` growth and a redundant index (flag on)

- A grant row, with JSON `grant_data` (sealed headers per extra file and metadata file), is written for every output of every protected job, as well as for user authorizations.
  Nothing removes expired grants. Grants on purged datasets are not removed either: the cascade only fires on ORM deletes of `Dataset`, which the purge paths don't do.
  The table grows with protected outputs forever. Recommendation: a periodic celery-beat cleanup of expired grants and grants on purged datasets. A `expires_at` index would help that cleanup.
- `UniqueConstraint("user_id", "dataset_id", "scheme")` already creates an index led by `user_id`, so the separate `index=True` on `user_id` is redundant write and storage overhead.
  The `dataset_id` index is needed (`Dataset.protection_grants`, `_lacks_extra_files`).
- `_lacks_extra_files` loads every user's grant on the dataset and `model_validate`s each one's `grant_data`, once per protected input per job.
  This is bounded by the number of users authorized on a dataset, so fine in practice. It could be an `EXISTS` query if popular shared datasets become common.

## Measurement plan

1. Grant recording (finding 1): run an integration-style protected job producing a list of N = 1k / 10k outputs, with a mocked recryptor as in `test_crypt4gh_execution.py`.
   Count SQL statements during `finish()`, e.g. with the `sqlalchemy` `before_cursor_execute` event or `log_sql`. Expect N SELECTs before the fix and about ceil(N / chunk) after.
2. Verification (finding 2): same job against an S3 (minio) object store. Time `finish_job` and count backend GET/HEAD requests, then repeat with outputs that carry metadata files (BAM with `.bai`).
3. Submission (finding 3): with the flag on and no encrypted data, submit a tool taking a 100k-element list on PostgreSQL.
   Compare the request's statement count and wall time with the flag off. Expect one extra 100k-row query with the flag on before the fix and none after.
4. Registry payload (finding 4): `curl -s --compressed -w '%{size_download}' /api/datatypes/types_and_mapping` with the flag on and off, both gzip and raw. The raw numbers above are from a Python harness, not a running server.
5. Flag-off regression check: count SQL statements for `prepare()` / `finish()` of a trivial job and for `GET /api/histories/{id}/contents?v=dev` on `dev` and on this branch with the flag off. The expected delta is zero statements.

Findings 1–3 and 5 are code-reading based and their magnitudes are speculative. Only finding 4's numbers are measured.
