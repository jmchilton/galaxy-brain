# Test challenges review — #24484

- Profile: gx_test_challenger
- Model: Opus 5.5, medium effort
- Reviewed commit: `baeca0d7dc6ce8144de0ca0d95e6b5abb93a9ac4` (merge-base `557e7f327839`)
- Detail: [test_challenges_debrief.md](test_challenges_debrief.md)

Overall coverage is strong: real HMAC signer tests, manager tests on a real `GalaxyDataTestApp`, HTTP endpoint integration tests, and an end-to-end docker test (embedded Pulsar + auth-enforcing SeaweedFS) asserting the handler cache stays empty. No E2E/Selenium needed (backend only). Tests not run; they can't pass until the `pulsar-galaxy-lib` pin bump (runner passes `url=` to `ClientInput`), which the PR description already notes.

### P2 1: Redirect-mode Pulsar job tests don't prove the redirect was used

`TestPulsarObjectStagingRedirect` inherits `test_tool_input_is_staged_from_the_object_store` and `test_bam_input_and_its_index_are_staged`, but nothing checks that Pulsar was actually redirected. If the 0.15.16 version gate, the `redirect=1` flag, or Pulsar's redirect following broke, Galaxy would fall back to streaming and both tests still pass. The two direct-HTTP redirect tests don't involve Pulsar.

In the redirect class, make the streaming path unavailable during the job (e.g. patch the object store's `get_data_stream` to raise) or spy on `JobObjectStagingManager.staged_input` and assert a `redirect_url` was issued for both the dataset and the `bam_index` metadata file.

### P2 2: Runner staging unit tests are built on `object.__new__` and `SimpleNamespace` fakes

The new `test_pulsar_runner.py` block constructs `PulsarJobRunner` and `PulsarComputeEnvironment` with `object.__new__` and hand-set attributes, plus `SimpleNamespace` job wrappers, compute environments, path mappers, and a `_RecordingJobIO` spy. Several assertions check call arguments rather than behavior (`job_io.sync_cache is False`, and `sync_cache is None  # the local path config was used`); the real outcome, inputs never pulled into the handler cache, is already asserted end-to-end in `test_pulsar_object_staging.py`.

<details><summary>Details</summary>

`_client_inputs` only needs security, `galaxy_url`, job id, staging mode, Pulsar version, and the input/metadata path data. Suggested split:

- `object_store_staging_url_issuer(staging, pulsar_version, security, galaxy_url, job_id)` returns a `(kind, object_id) -> url` callable or `None`, validates the mode (`ConfigurationError`), and applies the redirect version gate. Validating here also lets an invalid mode fail when the compute environment is built rather than mid-submission.
- `client_inputs(input_paths, extra_paths, metadata_paths, metadata_file_ids, issue_url)` builds `ClientInputs` purely.

Then: a parametrized table for the issuer (stream / redirect >= 0.15.16 / redirect < 0.15.16 / invalid / None), and assembly tests with a lambda issuer (materialized input with no dataset id gets no URL; metadata paths get URLs by id). Retarget `test_input_metadata_rewrite_records_*` at `_metadata_file_with_path(hda, path)` directly. Drop the `sync_cache` spy assertions.

</details>

### P2 3: Duplicated running-job fixture and staging GET calls in integration tests; reuse the existing helper

`_running_job_with_input` is copy-pasted in `test/integration/test_job_object_staging.py` and `test/integration/objectstore/test_pulsar_object_staging.py`, and `test/integration/test_job_files.py::create_static_job_with_state` already creates a static job on an "unknown-handler" for the same reason. `requests.get(input_url(self._app.security, self.url.rstrip("/"), job.id, "dataset", ..., expires, ...))` is also repeated across both files.

Extract one shared helper for a static job with given input and state (and move `test_job_files.py` onto it), plus one helper that builds/fetches a staging URL for a job input.

### P3 1: Manager unit tests that duplicate integration coverage or restate constants

Drop from `test/unit/app/managers/test_job_object_staging.py`:
- `test_input_url_addresses_the_staging_endpoint`: restates the URL template; every integration test routes through `input_url`.
- `test_redirect_mode_answers_with_a_presigned_url`: mocked version of the real SeaweedFS `test_staging_url_redirects_to_the_object_store`.
- `test_redirect_mode_asks_for_a_presigned_url_that_lasts_minutes`: asserts the constant's range; `test_presigned_url_soon_expires_but_the_staging_url_keeps_working` proves the lifetime reaches the store.
- `test_request_for_a_finished_job_is_refused`: same as integration `test_input_of_a_finished_job_is_refused`.

The remaining manager tests (other object, expired, not an input, purged, non-input metadata, stream fallback with `write_cache=False`, HEAD not opening the object, metadata path kwargs) cover authorization branches cheaply; keep them.

### P3 2: boto3 object store unit tests overlap docker integration

`test_get_direct_download_url_lasts_as_long_as_asked`, `test_get_direct_download_url_for_a_path_within_the_object`, and `test_get_data_stream_reads_an_object_at_a_path_within_the_object` (boto3 store, mocked client) are covered for real by the SeaweedFS tests (presign expiry, BAM index staged in both modes), which run in CI's docker-enabled integration job. Can be dropped once P2 1 proves the redirect path. Keep the azure/s3/cloud/distributed lifetime tests; they're the only coverage for those stores.
