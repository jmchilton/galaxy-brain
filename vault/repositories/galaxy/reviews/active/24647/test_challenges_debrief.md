# Test challenges debrief — PR #24647

Profile gx_test_challenger, claude-opus-5-5, low effort, reviewed commit 7247fea9983.

## What the PR tests

- `test/unit/data/model/test_model_store.py`: export a real `cat` job's outputs, forge edits to the exported store (input HDA edit, dataset swap, collection edit, job edit, foreign metadata-file uuid, external_filename, object store move, new dataset in user object store), then import with `EditableObjects` and assert `MalformedContents`. Also positive tests: own outputs, sessionless string ids, library folder callback.
- `test/integration/test_user_defined_tool_job_conf.py`: reruns the existing user-defined-tool job-conf tests with `metadata_strategy = "extended"`. That only shows legitimate user-defined tool jobs still succeed (no false positive on `allow_dataset_file_edit=False`). It never exercises a rejection.

## Challenge

- Unit tests: kept. They exercise the import against real model objects rather than mocks, and the parametrized forge list is a compact matrix. They don't test the `MinimalJobWrapper.finish` wiring (the `EditableObjects(job, ...)` construction, the `GalaxyUserTool` check, `_can_add_to_library_folder` with a real `WorkRequestContext`, the `fail()` path). If someone dropped `editable_objects=` from `finish`, every new test would still pass apart from the job-conf subclass, which would also pass.
- Integration: there is no negative end-to-end test. That's the main gap.

## Test plan: integration test that tampers with a real job's `outputs_populated`

A tool can't write the forged store itself. Under extended metadata `metadata/set.py` runs after the tool command and rewrites `metadata/outputs_populated`. So the test has to tamper between the job script and the import. Integration tests run Galaxy in-process with the local runner, so patching the import entry point in the test works.

File: `test/integration/test_extended_metadata.py`. Add a class such as `TestExtendedMetadataEditRestrictions(integration_util.IntegrationTestCase)` with `metadata_strategy = "extended"` and `retry_metadata_internally = False` (as in `TestExtendedMetadataIntegration.handle_galaxy_config_kwds`). Keep it separate so it doesn't parametrize over `TEST_TOOL_IDS`.

Mechanism (tampering hook):

```python
from unittest import mock
from galaxy.model import store as model_store

@contextmanager
def _tamper_outputs_populated(tamper):
    real = model_store.get_import_model_store_for_directory
    def wrapper(archive_dir, **kwd):
        if archive_dir.endswith(os.path.join("metadata", "outputs_populated")):
            tamper(archive_dir)
        return real(archive_dir, **kwd)
    with mock.patch.object(model_store, "get_import_model_store_for_directory", wrapper):
        yield
```

`galaxy.jobs` calls `store.get_import_model_store_for_directory` through the module attribute, so `patch.object` on `galaxy.model.store` is picked up by the job handler thread. Each `tamper` rewrites `datasets_attrs.txt` / `collections_attrs.txt` / `jobs_attrs.txt` (JSON lists) in place. These helpers can mirror the unit test's `_forge_*` helpers (they already know the store layout), or share them through a small module under `lib/galaxy_test/`.

Test cases (one victim fixture each, all with `wait_for_job(job_id, assert_ok=False)`):

1. Another user's HDA. In `with self._different_user_history() as other_history:`, upload `"victim\n"` and record its encoded id. Decode it with `self._app.security.decode_id`. As the main user, run `cat1` on a fresh upload inside `_tamper_outputs_populated`, where `tamper` sets the output entry's `"id"` to the victim id and `"name"` to `"pwned"` in `datasets_attrs.txt`. Assert:
   - the job state is `error` (the `except Exception` -> `fail(...)` path),
   - as the other user, the victim's `name` is unchanged and its content is still `victim\n` (`get_history_dataset_content`),
   - optionally, `job_details["stderr"]` / info contains "may not edit".
2. Another job's job row. Run a first job, decode its id, then rewrite `jobs_attrs.txt` of a second job to that id. Assert the second job errors and the first job's outputs/state are unchanged.
3. Another user's HDCA/collection. Create a list in the other user's history and rewrite `collections_attrs.txt` id. Assert the job errors and the element identifiers are unchanged.
4. Library folder the user cannot add to. Create a library as admin (`LibraryPopulator`, restricted add permission), run a `__DATA_FETCH__` into a library folder the user may add to, and tamper the folder id to the restricted one. Assert error and that the folder has no new contents. (Positive control: the existing `test_fetch_data_library` already covers allowed folders under extended metadata.)
5. Optional user-defined tool variant: in `test_user_defined_tool_job_conf.py`'s extended subclass, tamper the `dataset.external_filename` to a server path (e.g. a temp file the test creates). Assert the job errors and the output content isn't the server file's.

Sanity check: revert the `editable_objects=` argument in `lib/galaxy/jobs/__init__.py`. Case 1 should then fail at the "victim name unchanged" assertion. That proves the test hits the guard and not some unrelated failure.

Cost: case 1 alone is about 40 lines plus the hook and covers the `finish` wiring. Cases 2-4 are each about 20 lines on top.
