# Test challenges debrief — #24484

Profile gx_test_challenger, Opus 5.5, medium effort. Reviewed `baeca0d7dc6ce8144de0ca0d95e6b5abb93a9ac4` (merge-base `557e7f327839`). Review-only; nothing edited or run. Tests can't pass as-is anyway: the runner passes `url=` to `ClientInput`, and the pinned `pulsar-galaxy-lib==0.16.0` doesn't accept it (PR description acknowledges the pending pin bump).

## Inventory

| File | Layer | Verdict |
|---|---|---|
| `test/unit/data/security/test_staging_signer.py` | unit | Keep. Pure, real behavior, no mocks, frozen dataclass for cases. Good model. |
| `test/unit/app/managers/test_job_object_staging.py` | unit (GalaxyDataTestApp, real disk store) | Mostly keep; drop 4 that duplicate integration or restate the URL layout. |
| `test/unit/app/jobs/test_pulsar_runner.py` (staging block) | unit | Rewrite: `object.__new__` + `SimpleNamespace` + spy `_RecordingJobIO`; restructure code into pure helpers. |
| `test/unit/objectstore/test_objectstore.py` | unit | Keep non-boto3 presign-lifetime tests (azure/s3/cloud/distributed have no integration coverage). boto3 ones overlap docker integration. |
| `test/integration/test_job_object_staging.py` | integration | Keep; extract running-job + GET helpers (duplicated, and an existing helper exists). |
| `test/integration/objectstore/test_pulsar_object_staging.py` | integration (docker/SeaweedFS) | Strong end-to-end. Redirect subclass's job runs don't prove the redirect path was taken. |

No E2E/Selenium needed: backend-only, no UI.

## Unit test challenges

### Runner (`test_pulsar_runner.py`)

- Fixture builds `PulsarJobRunner` and `PulsarComputeEnvironment` via `object.__new__` and hand-assigned attributes, plus `SimpleNamespace` for job wrapper, compute environment, `local_path_config`, `path_mapper`. Fragile: any new attribute read in `_client_inputs` / `input_path_rewrite` breaks the fakes silently or loudly.
- Design fix: `_client_inputs` only needs `security`, `galaxy_url`, `job_id`, staging mode, pulsar version, and the input/metadata path data. Split into:
  - `object_store_staging_url_issuer(staging, pulsar_version, security, galaxy_url, job_id) -> Callable[[kind, id], str] | None` — validates the mode (raises `ConfigurationError`) and applies the 0.15.16 redirect gate.
  - `client_inputs(input_paths, extra_paths, metadata_paths, metadata_file_ids, issue_url) -> ClientInputs` — pure assembly.
  Then tests become: issuer mode/version table (parametrized), assembly with a trivial lambda issuer. No `object.__new__`, no `SimpleNamespace`.
- `job_io.sync_cache` spy assertions (`test_inputs_are_staged_from_signed_urls_without_pulling_them`, `test_input_path_rewrite_does_not_pull_an_input_staged_by_identity`, `test_input_path_rewrite_keeps_the_local_path_without_object_store_staging` asserting `sync_cache is None`) test the implementation's call arguments. The real behavior ("handler cache holds no inputs") is asserted end-to-end by `test_pulsar_object_staging.py` (`assert not os.path.exists(self._cache_path(hda))`). Drop the spy assertions; the `is None  # the local path config was used` check is especially implementation-bound.
- `test_input_metadata_rewrite_records_*`: exercises `_metadata_file_with_path` through a hand-built compute environment. Retarget at `_metadata_file_with_path(hda, path)` directly (real model, no `object.__new__`). Positive case is also covered by the BAM integration test; keep the negative case at least.
- Keep (after rewrite): redirect requested for >=0.15.16, not for 0.15.15; materialized inputs (no dataset id) keep path staging; invalid mode is a `ConfigurationError`; no staging → no URLs. These are real branches not reachable from integration (old Pulsar can't be simulated there).
- Side note: invalid mode is only rejected at job submission, per job. Validating at destination/compute-environment construction would fail earlier; the issuer helper above is a natural place.

### Manager (`test_job_object_staging.py`)

Uses real `GalaxyDataTestApp` and disk store — good. Challenges:
- `test_input_url_addresses_the_staging_endpoint`: restates the URL template. Every integration test GETs a URL from `input_url` and gets 200 — proves routing. Drop.
- `test_redirect_mode_answers_with_a_presigned_url`: mocks `get_direct_download_url`; `test_staging_url_redirects_to_the_object_store` covers it for real (302 to SeaweedFS, body fetched). Drop.
- `test_redirect_mode_asks_for_a_presigned_url_that_lasts_minutes`: asserts `0 < expires_in <= 900`, i.e. restates the constant. `test_presigned_url_soon_expires_but_the_staging_url_keeps_working` proves the lifetime is passed through to the store. Drop.
- `test_request_for_a_finished_job_is_refused`: duplicated by integration `test_input_of_a_finished_job_is_refused`. Drop one (keep the integration one).
- Keep: other-object signature, expired signature, not-an-input, purged, metadata of non-input, redirect-falls-back-to-stream (`write_cache=False`), no-redirect-never-presigns, HEAD with redirect doesn't open the object, metadata file disk path, metadata presign path kwargs. These cover authorization branches cheaply.
- `mock.patch.object(app.object_store, ...)` repeated 5 times: a tiny `PresigningDiskObjectStore`/fake wrapper could replace them, but the mocks are narrow and readable. Not worth a finding.

### Object store (`test_objectstore.py`)

- boto3 `test_get_direct_download_url_lasts_as_long_as_asked`, `test_get_direct_download_url_for_a_path_within_the_object`, `test_get_data_stream_reads_an_object_at_a_path_within_the_object` overlap docker integration (SeaweedFS presign expiry test; BAM index staged in stream and redirect modes). Integration runs with docker in CI, so these are redundant if the redirect path is proven (see below). Low value either way; minor.
- Azure/S3(boto)/cloud/distributed lifetime tests: only coverage for those stores; follow existing file conventions (heavy SDK patching is already the norm there). Keep.
- `test_get_data_stream_can_leave_the_cache_untouched`: real behavior on boto3 tee config; keep.

## Integration test challenges

- `_running_job_with_input` is copy-pasted between `test_job_object_staging.py` and `test_pulsar_object_staging.py`, and `test/integration/test_job_files.py::create_static_job_with_state` already does the same ("unknown handler so state won't change"). Extract one shared helper (e.g. a mixin or function in `galaxy_test.driver.integration_util` / a small `test/integration/_job_helpers.py`) taking `hda` and `state`, and use it from all three.
- `requests.get(input_url(...))` with the same arguments recurs (5+ times across both files, plus `requests.head`). Add a helper (e.g. `_staging_url(job, hda, redirect=False)` once, shared) per the "same HTTP method/URL more than once" rule.
- Redirect class (`TestPulsarObjectStagingRedirect`) inherits the two job-run tests, but nothing proves those jobs were served by redirect: if the version gate, `redirect=1` propagation, or Pulsar's redirect following broke, Galaxy would silently stream and both tests still pass. Only the direct-HTTP tests prove redirect behavior, and those don't involve Pulsar. Fix: in the redirect class, make the streaming path fail (e.g. patch `JobObjectStagingManager`/object store `get_data_stream` to raise for the duration of the job) or record `staged_input` results and assert a `redirect_url` was issued for the dataset and the BAM index metadata file.
- Missing at HTTP level (minor, unit covers): metadata_file kind via the endpoint outside Pulsar, input of another job (403). Not worth adding given unit coverage.

## Test plan (recommendations)

1. Redirect class: assert job inputs (dataset + bam_index) were served via redirect, not stream.
2. Extract pure runner helpers; rewrite runner staging unit tests against them; drop `sync_cache` spy assertions; retarget metadata lookup tests at `_metadata_file_with_path`.
3. Shared integration helper for a static running job with input (reuse/replace `test_job_files.create_static_job_with_state`) and for fetching a staging URL.
4. Drop 4 manager unit tests duplicated by integration or restating constants; drop/accept boto3 objectstore duplicates once (1) lands.
