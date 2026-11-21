# Test challenges debrief: galaxy#23986, round 0

Profile `gx_test_challenger`, Claude Opus 5.5, effort medium. Reviewed commit `ae37e517ebc3e8acbbd2225848f4b896511375f1`. This was a review only; the PR was not edited.

## What the PR tests

| Layer | Files | Assessment |
| --- | --- | --- |
| Datatypes / registry (unit) | `test/unit/data/datatypes/test_crypt4gh.py` | Mostly sound: real registries (`example_datatype_registry_for_sample`) and real files. A few tests call private helpers through `Bunch` datasets. |
| Grant manager (unit) | `test/unit/app/managers/test_dataset_protection.py` (774 lines) | The weakest layer. Hand-rolled `_FakeDataset`/`_FakeOutput`, `Bunch` jobs/users/tools, a `MagicMock` session, `mock.patch("galaxy.managers.dataset_protection.DatasetProtectionGrant", Bunch)` in 9 tests, assertions on `sa_session.add.call_args`, and manager methods replaced on the instance (`get_grant`, `inputs_needing_decryption`, `get_usable_grant`). Several cases repeat integration tests. |
| Compute side (unit) | `test/unit/job_execution/test_protection_crypt4gh.py`, `test_protection_destination.py` | Good: real crypt4gh encryption, a real in-process `MockRecryptorService`, real files and BAM test data. Only small `Bunch` stand-ins remain. Keep. |
| Job script (unit) | additions to `test/unit/app/jobs/test_command_factory.py` | Good where it runs the generated script under bash with a fake `galaxy-protected-stage`. One test asserts substring positions in the command string, which mostly repeats the script-running tests. |
| Small unit additions | `test_clear_working_directory.py`, `test_runner_output_collection.py`, `test_model_store.py`, `test_post_job_actions.py`, `test_container_classes.py`, `test_output_checker.py` | Acceptable, and they follow each file's existing style. |
| API / integration | `test/integration/test_crypt4gh_grants.py`, `test_crypt4gh_execution.py`, `test_pulsar_embedded_crypt4gh.py` | Strong behavioral coverage: real jobs, real encryption, a mock recryptor, refusal paths, Pulsar embedded and MQ, and destination refusals. Helper use is uneven, and the Pulsar subclasses repeat runner-independent tests. |
| Client (Vitest) | `client/src/composables/datasetProtection.test.ts` | Reasonable composable test that uses `useServerMock` for Galaxy routes. It mocks `axios` only for the external user service. |
| E2E | none | Missing. See P2 2. |

## Challenges and test plan

### 1. Client-to-API contract for the user header (P2)

`useDatasetProtection.authorize` sends `getCrypt4ghHeader(item)`, which reads `metadata_crypt4gh_header` from the HDA detailed view. No test checks that the API exposes this field, or that its value is the header the user service needs:
- Integration `_authorize` (`test_crypt4gh_execution.py:102`) builds the header from the test's own ciphertext (`service.user_recrypt(encrypted, ...)` calls `split_header(encrypted)`).
- The Vitest test passes the literal `"user-header"`.
- The only check on the serialized metadata is negative: `test_grant_makes_dataset_ready_and_is_never_returned` asserts that no `metadata_crypt4gh_compute*` keys appear.

Plan:
- Make `MockRecryptorService.user_recrypt` also accept a base64 header, or add `user_recrypt_header(header_b64, user, key_ref)`.
- Have `_authorize` fetch `get_history_dataset_details(...)["metadata_crypt4gh_header"]` and recrypt that, as the browser does.
- In the grants test, assert that the field equals `base64(split_header(encrypted)[0])` after upload.

### 2. E2E for the key icon (P2)

The user-facing flow has no browser test: upload `.c4gh`, expand it, see the key icon, click it, see the check mark, and run a tool. The flow covers the `showAuthorizeCompute` conditions, the use of `crypt4gh_user_service_url` from config, the browser-to-user-service call, the PUT, and the status refresh.

Plan:
- Extend `MockRecryptorService` with a user-side `POST /recrypt_header` route that recrypts to a compute keypair it creates, plus `do_OPTIONS` and `Access-Control-Allow-*` headers for the browser's CORS preflight. Serving plain HTTP on 127.0.0.1 is fine for an HTTP Galaxy under test.
- Add an `integration_selenium` test with `crypt4gh_enabled` and `crypt4gh_user_service_url` set to the mock's URL.
- Smart components: add an `authorize_compute` selector under the history dataset actions (`.authorize-compute-btn`) and an `authorized_check` selector (`.authorized-check`).
- Assertions: the key icon is shown on the expanded `fastqsanger.c4gh` dataset and absent on a plain one; after the click the check mark appears; `GET datasets/{id}/protection` reports `ready`; optionally `cat` then succeeds.
- Read `vault/research/Component - E2E Tests - Writing.md` and `Component - E2E Tests Smart Components.md` first.

### 3. Grant manager unit tests (P2)

Tests to rewrite on real models:
- `test_finish_job_*` (verification, purging, grant recording)
- `test_failed_job_*`
- `test_grants_*` (renewal and copied extra files)
- `test_concurrent_authorizations_replace_the_grant`
- `test_jobs_refuse_extra_files_*`
- `test_grant_status_*`
- `test_conversions_*`

The fakes stand in for things Galaxy's test utilities already provide. `galaxy.model.unittest_utils.data_app.GalaxyDataTestApp` gives a real mapped model, a session and a disk object store. Those tests can then build real `Dataset`/`HistoryDatasetAssociation`/`Job`/`User` rows and query real `DatasetProtectionGrant` rows, instead of patching the ORM class with `Bunch` and reading `sa_session.add.call_args`.

Design changes that would remove the remaining stubs:
- Split `finish_job` into a pure step that classifies the outputs and a step that acts on the result. Today it classifies outputs into protected/missing/unprotected and also purges them and writes grants. With a pure `classify_outputs(outputs, sidecar, purged_outputs, verify) -> OutputClassification`, the tests assert on the classification, and the purge and grant steps get real-DB tests.
- Extract `Crypt4GHGrantData` construction from `_record_output_grants` into `output_grant_data(record, key_ref, expires_at) -> Crypt4GHGrantData`, a pure function. The extra_files_key and copied_extra_files cases then become tests of plain values.
- Exercise `check_job_inputs` refusals through real grants on a real dataset, or test `_grant_refusal(grant, dataset_instance, margin)` directly with a real `DatasetProtectionGrant`. Either removes the instance monkeypatching of `inputs_needing_decryption` and `get_usable_grant`.
- With a real session, the concurrent-authorization test can insert a competing grant from a second session before the commit instead of scripting `commit.side_effect`.

### 4. Integration helpers (P2)

- `GET/PUT datasets/{id}/protection` is called through raw `_get`/`_put` in both modules, with different helpers (`_protection`/`_grant` in grants; `_ready`/`_authorize` in execution), and inline at `test_crypt4gh_grants.py:237,264,265`. Add `DatasetPopulator.get_dataset_protection(dataset_id)` and `DatasetPopulator.set_dataset_protection_raw(dataset_id, payload)` (or a small `Crypt4GHPopulator` in `galaxy_test/base/crypt4gh.py`) and use them everywhere.
- `_copy_to_history` (grants) and the inline POST in `test_shared_copy_is_refused_before_any_service_call` repeat `DatasetPopulator.copy_hda`.

### 5. Unit tests repeating integration coverage (P3, drop)

| Unit test | Already covered by |
| --- | --- |
| `test_invalid_grants_are_rejected` and `test_expiration_dates_without_timezone_are_rejected` (manager) | Integration `test_invalid_grants_are_rejected`, which posts the same payloads (bad base64, not a header, header with body, naive date, too short, too long) through the API. |
| `test_finish_job_records_grants_for_protected_outputs` | `test_authorized_job_outputs_are_encrypted_for_the_user` (`_ready(output)`) and `test_outputs_can_be_used_in_further_jobs`. |
| `test_finish_job_grants_the_metadata_files_of_protected_outputs` | `_check_tools_read_bam_indexes`: the second job decrypts the BAM index with the output grant, which shows up as two `recrypt_header_to_job_key` calls. |

Keep the failure-mode unit tests for paths the API can't easily reach, such as a stale cached copy, plaintext behind a record, or a sidecar missing or invalid. Rewrite them per item 3.

### 6. Pulsar subclasses repeat runner-independent tests (P3)

`TestCrypt4GHPulsarEmbeddedIntegration` and `TestCrypt4GHPulsarEmbeddedMQIntegration` subclass `TestCrypt4GHExecutionIntegration`, so they repeat tests that are refused before any job reaches a runner:
- `test_unauthorized_input_is_refused_before_any_service_call`
- `test_unauthorized_input_is_refused_through_tool_requests`
- `test_shared_copy_is_refused_before_any_service_call`
- `test_keypair_expiring_before_a_job_could_finish_is_refused_when_authorizing`

Move them into a local-runner-only class, and keep the execution tests in a shared mixin.

### 7. Weak "plaintext not served" checks (P3)

`self._get(f"datasets/{output['id']}/display")` followed by `assert PLAINTEXT not in response.text` appears three times (`test_crypt4gh_execution.py:324,731,751`). On a purged dataset an error page passes this trivially. Add one helper that asserts the expected status (or that the content starts with `crypt4gh`, or that the dataset is purged) and that the plaintext is absent.

### 8. Command factory tests (P3)

- `test_protected_job_stages_inputs_around_the_tool` asserts the order of substrings in the command string. `test_protected_job_skips_tool_when_staging_fails` and `test_protected_job_stages_in_galaxy_environment_without_changing_the_tools` already prove the order by running the script. Fold the metadata-line ordering into a script-running test and drop the substring test.
- `test_protected_job_skips_tool_when_staging_fails` loops over two cases inside one test and cleans up by hand between them. Use `@pytest.mark.parametrize("staging_status,tool_runs", [(1, False), (0, True)])` instead.

### 9. Private-helper unit tests (P3)

- `test_inner_ext_inferred_from_the_uploaded_name` calls `Crypt4GH()._infer_inner_ext` on a `Bunch`. Upload detection already covers this behavior (`test_upload_detects_crypt4gh`, `test_file_names_give_the_same_encrypted_datatype`, and integration uploads of `reads.fastqsanger.c4gh`). Drop it, or run it through `set_meta` on a real file.
- `test_only_tools_keeping_decrypted_data_in_galaxy_decrypt_inputs` calls `_can_decrypt_inputs` with `Bunch` tools. Prefer an API refusal test with a test tool that declares a `file_sources` config file. Failing that, use real `Tool` objects from the tool test utilities.

### 10. Missing API test: "auto" redetection keeps the encrypted type (P3)

The PR routes redetection in both the celery `change_datatype` task and the legacy edit-attributes controller through `registry.redetect_ext`, so an encrypted dataset keeps its inner type. Only registry unit tests (`_redetect` with `Bunch`) cover this. Add to `test_crypt4gh_grants.py`:
1. Upload `reads.fastqsanger.c4gh`.
2. Change it to `c4gh`, then to `auto`, through `histories/{id}/contents/{id}`.
3. Wait, and assert the extension is back to `fastqsanger.c4gh`.

## Not challenged

- `test_protection_crypt4gh.py`. Real crypto with a real HTTP mock is the right layer for stage-in, cleanup, segmenting and log redaction.
- `test_protection_destination.py`. It is small and tests a pure function of the destination parameters.
- The `SimpleNamespace` additions to `test_find_container_home.py`/`test_require_container.py` and the MagicMock count bump in `test_datasets_service.py`. These follow existing patterns and are not new design.
- The Vitest composable test. It uses `useServerMock` and mocks only the external user service. It is not a prop-only test.

No security-sensitive findings from the test review.
