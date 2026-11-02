# Test challenges review — PR #24647

Profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md), claude-opus-5-5, low effort, reviewed commit 7247fea9983. Full plan: [test_challenges_debrief.md](test_challenges_debrief.md).

### P2 1: No end-to-end test shows a real job's tampered `outputs_populated` being rejected

All the rejection coverage is in `test/unit/data/model/test_model_store.py` and calls the import directly with a hand-built `EditableObjects`. Nothing tests the wiring in `MinimalJobWrapper.finish`: the `EditableObjects(job, ...)` construction, the `GalaxyUserTool` detection, `_can_add_to_library_folder` with a real `WorkRequestContext`, and the job failing via `fail()`. If someone dropped `editable_objects=` from `finish`, every new test would still pass. The new `TestUserDefinedToolExtendedMetadata` only checks that legitimate jobs still succeed.

Suggested fix: add `TestExtendedMetadataEditRestrictions` to `test/integration/test_extended_metadata.py` (extended metadata, `retry_metadata_internally=False`). Wrap `galaxy.model.store.get_import_model_store_for_directory` with `mock.patch.object` in the test. Galaxy runs in-process, and `galaxy.jobs` resolves the function through the module attribute. For directories ending in `metadata/outputs_populated`, the wrapper rewrites `datasets_attrs.txt` so the output's `id` is the decoded id of an HDA uploaded in `_different_user_history()`, with `name` set to `pwned`. Run `cat1` and `wait_for_job(..., assert_ok=False)`, then assert:

- the job state is `error`,
- as the other user, the victim's name and content are unchanged.

Add similar cases for `jobs_attrs.txt` (another job's id), `collections_attrs.txt` (another user's HDCA), and a library folder the user can't add to. Confirm the test fails with the `editable_objects=` argument reverted.

### P3 1: The `metadata_strategy` class attribute in `TestUserDefinedToolRecommendedJobSetup` adds a subclass without a user-defined-tool negative case

The extended-metadata subclass re-runs the positive tests only. Add one tampering case that sets `dataset.external_filename` (or `object_store_id`) on a user-defined tool's output, using the same hook as P2 1, and assert the job errors. That covers `allow_dataset_file_edit=not user_defined_tool` end to end.

Unit tests: no drops recommended. They use real model objects, have no mocks, and give useful matrix coverage of each forge path.
