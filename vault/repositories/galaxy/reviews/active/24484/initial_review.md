# Initial review: #24484 (default profile)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5, medium effort
- Reviewed commit: `baeca0d7dc6ce8144de0ca0d95e6b5abb93a9ac4` (merge-base `557e7f327839`)
- Method: static review of the diff plus surrounding code, and of the client-side changes in galaxyproject/pulsar#553 (`~/projects/worktrees/pulsar/pr/553`). No tests run.

## Verdict

The design holds up: inputs are addressed by identity, the HMAC key is derived for this purpose only, URLs are bound to the job and object, and the manager checks that the object is an input of a job that is still active. The PR is blocked on the pulsar-galaxy-lib pin (P1 1). The main correctness gap is that input metadata files are still pulled into the handler's cache (P2 1). The rest are reuse and validation points.

## P1 1: `ClientInput(url=...)` breaks every rewrite_parameters Pulsar job on the pinned pulsar-galaxy-lib

`_client_inputs` (`lib/galaxy/jobs/runners/pulsar.py`) now always passes `url=` to `ClientInput`, including `url=None` when `object_store_staging` is unset. `lib/galaxy/dependencies/pinned-requirements.txt` still pins `pulsar-galaxy-lib==0.16.0`, and `pyproject.toml` and `packages/app/pyproject.toml` still require `>=0.16.0`. The PR description says 0.16.0 does not accept `url`. So with the current pin, every Pulsar job with `rewrite_parameters: true` fails at submission with a `TypeError`, even on destinations that never enable staging. Several `Test (...)` checks are red on the head; I did not check whether this is the cause.

Suggested fix: bump the pin and both `>=` floors to the pulsar-galaxy-lib release that ships galaxyproject/pulsar#553 before merging. Also consider passing `url` only when it is set, so that destinations without staging don't depend on the new keyword.

## P2 1: Input metadata files are still pulled into the handler's cache

The PR says the handler "no longer pulls those inputs [datasets and input metadata files] into its cache". For metadata files, that does not hold. When a tool references `$input.metadata.<file>`, `MetadataWrapper.__getattr__` (`lib/galaxy/tools/wrappers.py:337`) calls `FileParameter.to_safe_string` → `to_string` → `value.get_file_name()` (`lib/galaxy/model/metadata.py:607-610`), which uses the default `sync_cache=True`. That pulls the metadata file into the handler's cache before `input_metadata_rewrite` is reached. The signed URL is issued correctly, but the handler still downloads the index.

`test_bam_input_and_its_index_are_staged` only asserts that the BAM dataset's cache path is absent. It doesn't check the `bam_index` metadata file's cache path, so the test passes anyway.

The same flow also explains why `_metadata_file_with_path` has to exist. The wrapper holds the `MetadataFile` object, turns it into a path string, and the runner then searches the metadata spec to map the path back to an object. That search calls `get_file_name(sync_cache=False)`, which still makes `object_store.exists` (and possibly `create`) calls for each FileParameter spec. The PR description avoids this kind of path-to-object mapping for datasets, but it is reintroduced here for metadata files.

Suggested fix (red to green): in the integration test, also assert that `hda.metadata.bam_index.get_file_name(sync_cache=False)` does not exist after the job. That assertion should fail on the current head. Then pass the `MetadataFile` itself to the compute environment before it is stringified, for example by giving `input_metadata_rewrite` the metadata value or having `FileParameter.to_string` honor a no-sync path when a compute environment rewrites it. Record the id from that object and drop `_metadata_file_with_path`.

## P3 1: Duplicates `JobFilesManager`'s active-job and purged-input checks

`JobObjectStagingManager.staged_input` re-implements `JobFilesManager._active_job` (`lib/galaxy/managers/job_files.py:119`: same `Job.non_ready_states` test) and its purged-input `ItemDeletionException` (`readable_path`, same message). These are the two runner-facing job file endpoints, and they should not drift on what counts as an active job or how a purged input is reported. Suggested fix: move `_active_job` into a small shared helper (or a base used by both managers) and call it from both.

## P3 2: Misconfigured `object_store_staging` is ignored or fails per job instead of at load time

- An unknown value raises `ConfigurationError` from `_client_inputs` at queue time, so every job sent to that destination fails, instead of being rejected when the destination is configured.
- The sample config says staging "Requires rewrite_parameters", but if `rewrite_parameters` is false, `compute_environment` is `None` and the setting is silently ignored.
- With a non-remote-transfer `default_file_action` (for example `transfer` or `remote_copy`), Galaxy skips the cache sync. Pulsar#553 then refuses the missing local path with "non-existent file", so the job fails at runtime.

Suggested fix: validate these combinations once, when the runner reads the destination params (for example next to `__rewrite_parameters` and `check_job_config`), and reject `object_store_staging` without `rewrite_parameters` and `remote_transfer`.

## P3 3: Unused `path` dimension in `StagingUrlSigner`

`sign` and `verify` take a `path` argument that every caller passes as `""`. The module docstring and PR description present it as future use for extra files and `.loc` files. Suggested fix: drop it until the stacked extra-files PR needs it, and add it there with `v2` in the message prefix if the format changes. As written, it accretes an unused parameter and the matching docs.

## P3 4: Runner unit tests are mock-shaped and overlap the integration tests

`test/unit/app/jobs/test_pulsar_runner.py` builds runners and compute environments with `object.__new__` and `SimpleNamespace` and asserts on `sync_cache` flags recorded by a fake `JobIO`. For example, `test_input_path_rewrite_keeps_the_local_path_without_object_store_staging` asserts `sync_cache is None` to prove which branch ran. These tests pin implementation details that `test/integration/objectstore/test_pulsar_object_staging.py` already covers end to end, and they will break on refactors that preserve behavior. The redirect-mode subclass inherits the job tests but never asserts that a redirect was actually taken (the version gate could silently fall back to streaming). `_running_job_with_input` is also duplicated between the two integration test files.

Suggested fix: keep the pure URL and signer unit tests and drop the `object.__new__` rewrite tests in favor of the integration coverage. In redirect mode, assert the redirect was used, for example by counting requests seen by the store or by checking that the staging endpoint returned 302. Share the job fixture helper between the two integration files.
