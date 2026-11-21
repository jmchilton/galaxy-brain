# Test challenges review: galaxy#23986, round 0

- Profile: `gx_test_challenger` (`_shared/reviewers/gx_test_challenger.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `ae37e517ebc3e8acbbd2225848f4b896511375f1`
- Debrief and full test plan: [test_challenges_debrief.md](test_challenges_debrief.md)

The PR's tests are strongest at the integration layer, which runs real jobs with real Crypt4GH encryption against a mock recryptor and covers both local and Pulsar runners. The compute-side unit tests (`test_protection_crypt4gh.py`) also use real crypto and a real HTTP mock, and are fine as they are. The weak spots are:
- The grant-manager unit tests, which fake the ORM.
- The missing browser coverage of the authorization flow.
- Uneven helper use in the API tests.

## P2 1: No test checks the header the browser sends when authorizing

The key icon sends `metadata_crypt4gh_header`, which the client reads from the HDA detailed view (`getCrypt4ghHeader` in `client/src/composables/datasetProtection.ts`), to the user service. No test checks that the API exposes this field or that its value is the dataset's user header:
- The integration helper `_authorize` (`test/integration/test_crypt4gh_execution.py:102`) builds the header from the test's own ciphertext instead (`MockRecryptorService.user_recrypt` calls `split_header(encrypted)`).
- The Vitest test passes the literal `"user-header"`.

If the serialized metadata changed, every test would still pass while the key icon broke.

**Fix:** let `MockRecryptorService.user_recrypt` take the base64 header. Have `_authorize` read `metadata_crypt4gh_header` from `get_history_dataset_details` and recrypt that, as the browser does. In `test_crypt4gh_grants.py`, assert that the field equals `base64(split_header(encrypted)[0])` after upload.

## P2 2: No E2E test for authorizing a dataset with the key icon

The feature's only user interaction has no browser test. That interaction is the key icon on an expanded encrypted dataset, which calls the user-side service, PUTs the grant, and then shows a check mark. Untested pieces:
- The `showAuthorizeCompute` conditions in `DatasetActions.vue`.
- Reading `crypt4gh_user_service_url` from the config.
- The browser-to-service call.
- The status refresh after the PUT.

**Fix:** extend `MockRecryptorService` with a user-side `POST /recrypt_header` route and CORS preflight handling (`do_OPTIONS`, `Access-Control-Allow-*`). Then add an `integration_selenium` test with `crypt4gh_user_service_url` pointing at the mock that:
1. Uploads `reads.fastqsanger.c4gh` and a plain dataset.
2. Asserts the key icon (`.authorize-compute-btn`) appears only on the encrypted one.
3. Clicks it, and asserts that `.authorized-check` appears and that `GET datasets/{id}/protection` reports `ready`.
4. Optionally runs `cat` successfully.

Add the selectors to the history dataset smart components.

## P2 3: Grant-manager unit tests fake the model instead of using Galaxy's test app

`test/unit/app/managers/test_dataset_protection.py` builds hand-rolled fakes and swaps out real code:
- Fake objects: `_FakeDataset`/`_FakeOutput`/`_FakeObjectStore`, plus `Bunch` jobs, users and tools.
- A `MagicMock` session.
- In 9 tests, the ORM class itself is patched with `mock.patch("galaxy.managers.dataset_protection.DatasetProtectionGrant", Bunch)`, and the grant is read back from `sa_session.add.call_args`.
- Several tests replace manager methods on the instance (`get_grant`, `inputs_needing_decryption`, `get_usable_grant`), and `test_concurrent_authorizations_replace_the_grant` scripts `commit.side_effect` to simulate a unique-constraint race.

These tests can't catch mapping or relationship errors, and they are tied to which methods `finish_job`, `check_job_inputs` and `register_user_grant` happen to call.

**Fix:** build real `User`/`Dataset`/`HistoryDatasetAssociation`/`Job` rows on `galaxy.model.unittest_utils.data_app.GalaxyDataTestApp`, and assert on queried `DatasetProtectionGrant` rows. Two design changes would remove most of the remaining stubs:
- Split the pure classification in `finish_job` (protected, missing or unprotected, given the sidecar and `purged_outputs`) from the steps that purge outputs and write grants.
- Extract the `Crypt4GHGrantData` construction in `_record_output_grants` into a pure `output_grant_data(record, key_ref, expires_at)`.

The `check_job_inputs` refusal cases can then use real grants, or call `_grant_refusal` directly. With a real session, the race test can insert a competing grant from a second session before the commit.

## P2 4: Protection API calls bypass populators and duplicate `copy_hda`

`datasets/{id}/protection` is called through raw `_get`/`_put`:
- In `test_crypt4gh_grants.py` through `_protection`/`_grant`, and inline at lines 237, 264 and 265.
- In `test_crypt4gh_execution.py` through separate `_ready`/`_authorize` helpers.

Separately, `_copy_to_history` and the inline POST in `test_shared_copy_is_refused_before_any_service_call` repeat `DatasetPopulator.copy_hda`.

**Fix:** add `get_dataset_protection` / `set_dataset_protection_raw` to `DatasetPopulator`, or to a small populator next to `MockRecryptorService` in `galaxy_test/base/crypt4gh.py`, and use them in both modules. Use `copy_hda` for the copies.

## P3 1: Unit tests that repeat integration tests

These unit tests repeat integration coverage and can be dropped:

| Unit test | Already covered by |
| --- | --- |
| `test_invalid_grants_are_rejected` and `test_expiration_dates_without_timezone_are_rejected` | Integration `test_invalid_grants_are_rejected` (same payloads, through the API) |
| `test_finish_job_records_grants_for_protected_outputs` | `test_authorized_job_outputs_are_encrypted_for_the_user` and `test_outputs_can_be_used_in_further_jobs` |
| `test_finish_job_grants_the_metadata_files_of_protected_outputs` | `_check_tools_read_bam_indexes`, where the second job decrypts the index through the output grant |

Keep the failure-mode unit tests that the API can't easily reach, such as a stale cached copy, plaintext behind a record, or a sidecar missing or invalid. Rewrite those per P2 3.

## P3 2: Pulsar subclasses repeat runner-independent refusal tests

`TestCrypt4GHPulsarEmbeddedIntegration` and `TestCrypt4GHPulsarEmbeddedMQIntegration` inherit all of `TestCrypt4GHExecutionIntegration`. That includes tests refused before any job reaches a runner:
- `test_unauthorized_input_is_refused_before_any_service_call`
- `test_unauthorized_input_is_refused_through_tool_requests`
- `test_shared_copy_is_refused_before_any_service_call`
- `test_keypair_expiring_before_a_job_could_finish_is_refused_when_authorizing`

Each therefore boots and runs in three Galaxy configurations. Move them to a local-only class and share only the execution tests through a mixin.

## P3 3: "Plaintext not served" checks are weak and repeated

`self._get(f"datasets/{output['id']}/display")` followed by `assert PLAINTEXT_1.decode() not in response.text` appears three times (`test_crypt4gh_execution.py:324, 731, 751`). Any error page satisfies it. Add one helper that asserts the expected outcome (the dataset is purged, the response has an error status, or the content starts with `crypt4gh`) as well as the plaintext's absence.

## P3 4: Command factory tests repeat each other and loop instead of parametrizing

`test_protected_job_stages_inputs_around_the_tool` checks the order of substrings in the command string. Two tests already prove the same order by running the generated script under bash: `test_protected_job_skips_tool_when_staging_fails` and `test_protected_job_stages_in_galaxy_environment_without_changing_the_tools`. Fold the metadata-line check into one of the script-running tests and drop the substring test. `test_protected_job_skips_tool_when_staging_fails` loops over two cases with manual cleanup between them; use `@pytest.mark.parametrize` instead.

## P3 5: Unit tests of private helpers built on `Bunch`

- `test_inner_ext_inferred_from_the_uploaded_name` calls `Crypt4GH()._infer_inner_ext`. Upload and file-name detection tests already cover the same behavior, so drop it or run it through `set_meta` on a real file.
- `test_only_tools_keeping_decrypted_data_in_galaxy_decrypt_inputs` calls `_can_decrypt_inputs` with `Bunch` tools. Prefer an API refusal test with a test tool that declares a `file_sources` config file, or at least use real `Tool` objects.

## P3 6: No API test for "auto" redetection on encrypted datasets

The celery `change_datatype` task and the legacy edit-attributes controller now redetect through `registry.redetect_ext` so that an encrypted dataset keeps its inner type. Only registry unit tests on `Bunch` datasets cover this. Add a case to `test_crypt4gh_grants.py`: upload `reads.fastqsanger.c4gh`, change it to `c4gh`, change it to `auto`, wait, and assert the extension is `fastqsanger.c4gh` again.
