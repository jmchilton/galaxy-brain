(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile: gx_risk_assessment · Model: Opus 5.5 · Effort: low · Reviewed commit: `baeca0d7dc6ce8144de0ca0d95e6b5abb93a9ac4`

The one-way risks are a new unauthenticated-by-session, signature-authorized route (`/api/jobs/{job_id}/staging/inputs/...`) and URL/signature format that Pulsar deployments will start depending on, plus widened `ObjectStore.get_data_stream` / `get_direct_download_url` signatures that third-party object stores must follow; the feature itself is opt-in per destination, so default deployments are unaffected.

<details><summary>Risk Details</summary>

- New route outside the documented API (`include_in_schema=False`) authorized only by an HMAC in the query string; once Pulsar 0.16.x clients rely on it, changing path shape, `exp`/`sig`/`redirect` params, or the `v1|job|kind|id|path|exp` message requires versioning (`KEY_PURPOSE` already carries `v1`).
- Signing key is derived from `id_secret`; rotating `id_secret` invalidates in-flight staging URLs for queued/running Pulsar jobs.
- Staging URLs are issued at submit with a 7-day lifetime, bounded earlier only by the job leaving `non_ready_states`; bearer credentials in query strings can leak through proxy/access logs (sample config warns, but nothing enforces it).
- Abstract `ObjectStore` method signatures change (`write_cache`, `extra_dir`, `extra_dir_at_root`, `alt_name`, `expires_in`); out-of-tree object store plugins overriding `_get_direct_download_url` / `_get_data_stream` without `**kwargs` will break when called by this path.
- `MetadataFile.get_file_name` refactor (`object_store_path_kwargs`) touches every metadata file path lookup, not just Pulsar staging.
- Hard dependency on unreleased Pulsar (galaxyproject/pulsar#553): `ClientInput(url=...)` fails on the pinned `pulsar-galaxy-lib==0.16.0`, so merge order and the pin bump must be coordinated.
- Redirect mode is gated on Pulsar >= 0.15.16, a version gate that must be kept in sync with Pulsar's actual curl redirect behavior.
- Metadata file ids are matched back from paths (`_metadata_file_with_path`); a mismatch silently falls back to the job files API rather than failing.
- Composite-input extra files are explicitly deferred to a stacked PR, so `object_store_staging` users still need shared disk/cache for those inputs.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should focus on the endpoint and signer as a long-lived contract: confirm the authorization model (job must be active, object must be one of the job's inputs, purged inputs refused) is what Galaxy wants to commit to, whether a 7-day URL lifetime is appropriate, and whether the route/param naming is one Galaxy is happy to keep stable with Pulsar. Security-minded review of `lib/galaxy/managers/job_object_staging.py` and `lib/galaxy/security/staging_signer.py` is warranted.

Object store maintainers should confirm the widened abstract signatures are acceptable for all in-tree backends and plugins, and that skipping the cache (`write_cache=False`) has no side effects on cache accounting. Merge should be sequenced with the Pulsar release and the `pulsar-galaxy-lib` pin bump.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24484_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24484_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24484_review_0) is based on the reviewed commit `baeca0d7dc6`. It does four things. First, Pulsar jobs without staging work again on the pinned pulsar-galaxy-lib 0.16.0, because `url` is passed to `ClientInput` only when staging issued one. Second, input metadata files stay out of the handler's cache: the wrappers hand the `MetadataFile` itself to the compute environment, which replaces the reverse path lookup. Third, `object_store_staging` is parsed once into a typed mode before tool evaluation, staging URL construction moves next to the signer, and both runner-facing managers share one active-job check. Fourth, the tests are tightened: redirect mode is proven to redirect, the runner unit tests use pure helpers instead of fakes, integration tests share one static-job helper, and unit tests that duplicate integration coverage are dropped. Nothing changes the pulsar-galaxy-lib pin. Tests on the staging path ran against galaxyproject/pulsar#553 by putting it first on `PYTHONPATH`. Tests without staging ran on the pinned 0.16.0.

- [`b1ea1389707`](https://github.com/jmchilton/galaxy/commit/b1ea1389707) Pass url to ClientInput only when staging issues one: adds `_client_input`, so destinations without staging no longer hit `TypeError` on 0.16.0.
- [`33f1cd304b9`](https://github.com/jmchilton/galaxy/commit/33f1cd304b9) Don't pull staged input metadata files into the handler cache: adds `ComputeEnvironment.input_metadata_file_path`, which Pulsar overrides with `sync_cache=False` to record the file id, drops `_metadata_file_with_path`, and asserts in the BAM integration test that `bam_index` stays out of the cache.
- [`54bdaf9283f`](https://github.com/jmchilton/galaxy/commit/54bdaf9283f) Validate object_store_staging once, before tool evaluation: adds the `ObjectStoreStagingMode` Literal and `_object_store_staging()`, which rejects unknown modes and a missing `rewrite_parameters` before `prepare`.
- [`d8f1ee01516`](https://github.com/jmchilton/galaxy/commit/d8f1ee01516) Share the active-job and purged-input checks with JobFilesManager: adds `get_active_job` and `INPUTS_PURGED_MESSAGE` in `galaxy.managers.job_files`, used by both managers.
- [`5d63cc56cf2`](https://github.com/jmchilton/galaxy/commit/5d63cc56cf2) Keep staging URL construction beside the signer: moves `input_url`, `INPUT_ROUTE`, `INPUT_URL_LIFETIME_SECONDS` and `StagedInputKind` to `galaxy.security.staging_signer`.
- [`3d9b7bc4603`](https://github.com/jmchilton/galaxy/commit/3d9b7bc4603) Assert redirect-mode Pulsar jobs were served by redirect: the redirect class records `staged_input` redirects and asserts them for the dataset and `bam_index`.
- [`732ada1fce6`](https://github.com/jmchilton/galaxy/commit/732ada1fce6) Share one static-job helper across job file integration tests: adds `integration_util.create_static_job`, used by the staging endpoint, Pulsar staging and job files tests.
- [`e7e3198234b`](https://github.com/jmchilton/galaxy/commit/e7e3198234b) Test Pulsar staging inputs through pure helpers, not runner fakes: splits out `_staging_url_issuer` and a pure `_client_inputs`, and rewrites the unit tests without `object.__new__`, `SimpleNamespace` or the `sync_cache` spy.
- [`5f8a06328ff`](https://github.com/jmchilton/galaxy/commit/5f8a06328ff) Drop unit tests the staging integration tests already cover: removes 3 manager and 3 boto3 unit tests and keeps the presign lifetime bound test.

</details>

</details>

### P2 1: Every existing Pulsar job fails on the pinned pulsar-galaxy-lib, staging or not (implementation verified)

`_client_inputs` always passes `url=` to `ClientInput`, including `url=None` when `object_store_staging` is unset. `pulsar-galaxy-lib==0.16.0` (still the latest on PyPI; galaxyproject/pulsar#553 is open) doesn't accept that keyword. So every `rewrite_parameters` Pulsar job fails with a `TypeError` at submission, not only jobs on staging destinations. The PR description covers the pin bump that staging needs. It doesn't say that destinations without staging break too, and they're what most of the red CI checks on this head are.

<details><summary>Evidence</summary>

Integration (`Test (3.10, default, 0)`) reports `TypeError: ClientInput.__init__() got an unexpected keyword argument 'url'` 30 times. It fails existing tests that never set `object_store_staging`: `test_pulsar_embedded_none.py::test_tools[simple_constructs]`, `test_pulsar_embedded_remote_metadata.py::test_tools[metadata_bam]`, `test_pulsar_embedded_extended_metadata.py` (5 tools), `test_job_files_remote_transfer.py`, and `test_data_manager_pulsar.py::test_bundle_chaining`. Both unit test jobs fail the 6 new runner tests with the same error.

</details>

Build the `ClientInput` keyword arguments and add `url` only when staging issued one. Pulsar jobs without staging then work on any pulsar-galaxy-lib, and the PR's CI is no longer red for reasons unrelated to staging. When the release lands, bump the `>=0.16.0` floors in `pyproject.toml` and `packages/app/pyproject.toml` along with the pin.

<details><summary>Details</summary>

Review branch commit `b1ea1389707` adds `_client_input(path, input_type, url, **kwds)`. On pulsar-galaxy-lib 0.16.0, `test_inputs_keep_path_staging_without_object_store_staging` and `test_materialized_inputs_keep_path_staging` go from `TypeError` to passing. `test_pulsar_embedded_none.py::test_tools[simple_constructs]` and `test_pulsar_embedded_remote_metadata.py::test_tools[metadata_bam]` pass locally on 0.16.0 with the branch.

</details>

Fixed on the review branch in [`b1ea1389707`](https://github.com/jmchilton/galaxy/commit/b1ea1389707).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 2: Input metadata files are still pulled into the handler's cache (implementation verified)

The PR says the handler no longer pulls inputs or input metadata files into its cache, but metadata files still get pulled. `MetadataWrapper.__getattr__` (`lib/galaxy/tools/wrappers.py`) calls `FileParameter.to_safe_string`, which calls `MetadataFile.get_file_name()` with the default `sync_cache=True`. That happens before the compute environment sees the value. Pulsar then has only a path string, so `_metadata_file_with_path` scans the dataset's metadata spec and matches `get_file_name(sync_cache=False)` paths to recover the object it was just handed. The scan costs object store `exists` calls, and the match silently fails if the path string is ever rewritten. `test_bam_input_and_its_index_are_staged` checks only the BAM's cache path, so it passes anyway.

<details><summary>Evidence</summary>

After the job, this assertion in `test_bam_input_and_its_index_are_staged` fails on the reviewed head (stream mode, SeaweedFS):

```python
bam_index = session.scalars(select(model.MetadataFile).filter_by(hda_id=..., name="bam_index")).one()
assert not os.path.exists(bam_index.get_file_name(sync_cache=False))
# AssertionError: .../object_store_cache/_metadata_files/2/2/e/metadata_22e6....dat exists
```

</details>

Give the `MetadataFile` to the compute environment before it is stringified, and drop the reverse path lookup.

<details><summary>Details</summary>

Review branch commit `33f1cd304b9` adds `ComputeEnvironment.input_metadata_file_path(metadata_file)`, which by default returns `get_file_name()`. The wrapper calls it for `MetadataFile` values, and `input_metadata_rewrite` keeps its signature. When staging is on, `PulsarComputeEnvironment` overrides it to use `sync_cache=False` and records the file's id under that path. `_metadata_file_with_path` is removed. With the assertion above added, the BAM test passes in both stream and redirect modes. `test_pulsar_embedded_remote_metadata.py::test_tools[metadata_bam]` (no staging) still passes.

</details>

Fixed on the review branch in [`33f1cd304b9`](https://github.com/jmchilton/galaxy/commit/33f1cd304b9).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 3: `object_store_staging` is validated late and re-checked as a raw string (implementation verified)

`object_store_staging` is read as an untyped `destination_params.get(...)` and checked with `in OBJECT_STORE_STAGING_MODES` in three places. Only `_client_inputs` validates it, and that runs after tool evaluation. So a typo such as `strem` is treated as "off" during path rewriting and then fails each job at submission. With `rewrite_parameters: false`, no compute environment is built, so the setting is silently ignored, even though the sample config says staging requires `rewrite_parameters`.

Parse the mode once, before job preparation, into a typed value: reject unknown modes and a missing `rewrite_parameters` there, and have the rewrites test `is not None`.

<details><summary>Details</summary>

Review branch commit `54bdaf9283f` adds `ObjectStoreStagingMode = Literal["stream", "redirect"]` and `_object_store_staging(destination_params, rewrite_parameters)`. It is called in `__prepare_job` before `job_wrapper.prepare`, and its result is passed to `PulsarComputeEnvironment`. Parametrized unit tests cover the valid modes, an unknown mode, and staging without `rewrite_parameters`. Destinations can be chosen per job, so this still fails per job, but up front and with a clear error. The branch does not reject a non-`remote_transfer` `default_file_action`: per-path `file_actions` can override it, and pulsar#553 already refuses inputs that local actions can't read.

</details>

Fixed on the review branch in [`54bdaf9283f`](https://github.com/jmchilton/galaxy/commit/54bdaf9283f).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 4: Redirect-mode Pulsar job tests don't prove the redirect was used (implementation verified)

`TestPulsarObjectStagingRedirect` inherits `test_tool_input_is_staged_from_the_object_store` and `test_bam_input_and_its_index_are_staged`, but nothing checks that Pulsar was redirected. If the 0.15.16 version gate, the `redirect=1` flag, or Pulsar's redirect handling broke, Galaxy would fall back to streaming and both tests would still pass. The two direct-HTTP redirect tests don't involve Pulsar.

In the redirect class, record which inputs `JobObjectStagingManager.staged_input` answered with a `redirect_url`. Assert that the dataset was redirected, and for the BAM test, the `bam_index` metadata file too.

<details><summary>Details</summary>

Review branch commit `3d9b7bc4603` wraps `staged_input` in a `_redirected_kinds()` context manager and overrides both tests in the redirect class. Both pass. With the redirect version gate temporarily raised to `99`, `test_tool_input_is_staged_from_the_object_store` fails.

</details>

Fixed on the review branch in [`3d9b7bc4603`](https://github.com/jmchilton/galaxy/commit/3d9b7bc4603).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 5: Runner staging unit tests are built on `object.__new__` and `SimpleNamespace` fakes (implementation verified)

The new block in `test/unit/app/jobs/test_pulsar_runner.py` builds `PulsarJobRunner` and `PulsarComputeEnvironment` with `object.__new__` and hand-set attributes. It also uses `SimpleNamespace` job wrappers, compute environments and path mappers, plus a `_RecordingJobIO` spy. Several assertions check call arguments, not behavior (`job_io.sync_cache is False`, and `sync_cache is None  # the local path config was used`). The real outcome, inputs kept out of the handler cache, is already asserted end to end in `test_pulsar_object_staging.py`.

Split `_client_inputs` into pure helpers and test those directly: one helper issues URLs (mode and redirect version gate), the other assembles `ClientInputs`. Drop the spy and the fake-based rewrite tests.

<details><summary>Details</summary>

Review branch commit `e7e3198234b` adds `_staging_url_issuer(staging, pulsar_version, security, galaxy_url, job_id)`, which replaces the `functools.partial` and its `# Called with (kind, object_id).` comment, and a pure `_client_inputs(...)`. The unit tests are now a parametrized issuer table (stream, redirect on 0.15.16, redirect on 0.15.15, none) plus assembly tests on real `DatasetPath`s. No runner or compute environment fakes remain. The rewrite tests are dropped because the SeaweedFS tests now assert that both the dataset and its metadata file stay out of the handler cache (P2 2).

</details>

Fixed on the review branch in [`e7e3198234b`](https://github.com/jmchilton/galaxy/commit/e7e3198234b).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 6: Duplicated static running-job helper in integration tests (implementation verified)

`_running_job_with_input` is copied between `test/integration/test_job_object_staging.py` and `test/integration/objectstore/test_pulsar_object_staging.py`. `test/integration/test_job_files.py::create_static_job_with_state` already builds the same job on an `unknown-handler`. The Pulsar test also repeats its `input_url(...)` call.

Extract one shared helper and use it from all three files.

<details><summary>Details</summary>

Review branch commit `732ada1fce6` adds `integration_util.create_static_job(sa_session, history, state, input_hda=None)`. All three files now use it, and the Pulsar test builds its redirect URL once in `_redirect_staging_url`.

</details>

Fixed on the review branch in [`732ada1fce6`](https://github.com/jmchilton/galaxy/commit/732ada1fce6).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: `JobObjectStagingManager` duplicates `JobFilesManager`'s active-job and purged-input checks (implementation verified)

`staged_input` re-implements `JobFilesManager._active_job` (the same `Job.non_ready_states` test) and repeats the purged-input `ItemDeletionException` message from `readable_path`. These are the two job file endpoints that runners use. They shouldn't drift on what counts as an active job or how a purged input is reported.

Share one helper between them.

<details><summary>Details</summary>

Review branch commit `d8f1ee01516` adds `get_active_job(sa_session, job_id)` and `INPUTS_PURGED_MESSAGE` to `galaxy.managers.job_files` and uses them from both managers. A missing job now returns 404, as it does on the job files API. That can only be reached with a valid signature.

</details>

Fixed on the review branch in [`d8f1ee01516`](https://github.com/jmchilton/galaxy/commit/d8f1ee01516).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: The runner imports URL construction from `galaxy.managers` (implementation verified)

`pulsar.py` imports `input_url` and `INPUT_URL_LIFETIME_SECONDS` from `galaxy.managers.job_object_staging`, which pulls the DB-backed manager, the scoped session and object store types into the runner's import graph. The route path is also written twice: as `INPUT_PATH` in the API module and as an f-string in `input_url`.

Move `input_url`, the lifetime, `StagedInputKind` and one route constant next to `StagingUrlSigner`.

<details><summary>Details</summary>

Review branch commit `5d63cc56cf2` moves them into `galaxy.security.staging_signer`. `input_url` formats `INPUT_ROUTE`, and the API decorates its routes with the same constant.

</details>

Fixed on the review branch in [`5d63cc56cf2`](https://github.com/jmchilton/galaxy/commit/5d63cc56cf2).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: `staged_input` switches modes with `head`/`redirect` flags and returns a "one field set" dataclass

`JobObjectStagingManager.staged_input` handles authorization, lookup, size and three transfer strategies in one method, selected by the `head` and `redirect` booleans. `StagedInput` has four optional fields, and its rule that exactly one is set (none for HEAD) lives only in a docstring. The API then re-derives the variant with `is not None` checks and `assert staged.path is not None`.

Split out a shared `_authorized_input(...)`, a `size(...)` for HEAD, and a `transfer(..., redirect)` that returns a small tagged union (`Redirect | Stream | LocalFile`) for the route to match on. Not changed on the review branch: it's a design choice that rewrites most of the manager tests, so it's left to the author.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort.

</details>

### P3 4: Unit tests that duplicate the integration tests (implementation verified)

Several unit tests restate what the endpoint and SeaweedFS integration tests cover for real:

- Manager: `test_input_url_addresses_the_staging_endpoint` restates the URL template. `test_redirect_mode_answers_with_a_presigned_url` is a mocked copy of `test_staging_url_redirects_to_the_object_store`. `test_request_for_a_finished_job_is_refused` duplicates the integration test `test_input_of_a_finished_job_is_refused`.
- boto3 store: `test_get_data_stream_reads_an_object_at_a_path_within_the_object`, `test_get_direct_download_url_for_a_path_within_the_object` and `test_get_direct_download_url_lasts_as_long_as_asked` are covered by the BAM index being staged in both modes and by the presign expiry test, now that redirect mode is proven (P2 4).

Drop these.

<details><summary>Details</summary>

Review branch commit `5f8a06328ff` drops these 6 tests. It keeps `test_redirect_mode_asks_for_a_presigned_url_that_lasts_minutes`, because nothing else checks that redirects stay short-lived (the integration test patches the lifetime to 1 second). It also keeps the azure, s3, cloud and distributed presign lifetime tests, which are the only coverage for those stores.

</details>

Fixed on the review branch in [`5f8a06328ff`](https://github.com/jmchilton/galaxy/commit/5f8a06328ff).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>
