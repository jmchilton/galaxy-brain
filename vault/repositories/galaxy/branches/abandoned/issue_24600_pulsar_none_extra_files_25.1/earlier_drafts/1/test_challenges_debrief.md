Run via Opus at low effort.

# Test challenges debrief

One change, commit `4d18da26fee` ("Trim PulsarComputeEnvironment unit tests to the rewrite action"). It drops two of the four unit tests and replaces the `SimpleNamespace` fakes with dataclasses. The integration module is unchanged. No E2E test is needed.

## Unit tests (`test/unit/app/jobs/test_pulsar_compute_environment.py`)

| Test | Commit | Verdict |
|---|---|---|
| `test_transfer_rewrites_extra_files_into_job_directory` | baseline | **Dropped.** `test_pulsar_embedded.py` already runs `composite`, `composite_output` and `composite_output_tests` under a staging action (`copy`), so staged extra files are covered end to end. |
| `test_rewrite_action_rewrites_extra_files_beside_dataset` | baseline | **Kept.** No integration test uses the `rewrite` file action with extra files. It runs the real `PathMapper`/`FileActionMapper`. |
| `test_none_action_leaves_extra_files_in_place` | fix | **Dropped.** The new `test_pulsar_embedded_none_local_metadata.py` covers it end to end; it fails 2/2 without the fix. Its `path_rewrites_input_extra == {}` check is not worth a separate test: the only alternative was a crash. |
| `test_unchanged_rewrite_action_leaves_extra_files_in_place` | fix | **Kept.** This is the other way the bug is reached (a `rewrite` that maps a path to itself), and no integration test covers it. |

Fakes:
- `pulsar_client` and `job_wrapper` were `SimpleNamespace`. They are now a `FakePulsarClient` dataclass, which lists the fields `FileActionMapper` reads, and a small `FakeJobWrapper` class. `FakeDataset` is now a dataclass.
- `FakeLocalComputeEnvironment.input_path_rewrite`/`output_path_rewrite` now return `dataset.get_file_name()` instead of `None`. That matches `SharedComputeEnvironment` and was the review's realism nit. Both tests behave the same either way.
- A shared `_rewrite_compute_environment(destination_directory)` helper builds the environment, replacing the per-test file-action dicts.

Restructuring the production code to drop the fakes: not done. `PulsarComputeEnvironment.__init__` needs a client, a job wrapper and a remote job config to build its `PathMapper`. Pulling the extra-files fallback out into a free function would test a two-line `if` and nothing more (testing the implementation), and the real value here is running the real Pulsar mappers. A refactor would also be out of place in a 25.1 bug fix.

Red/green (fix reverted by `git show f728652f009:lib/galaxy/jobs/runners/pulsar.py`):
- With the fix: 2 passed.
- Without the fix: the rewrite baseline test passes. The unchanged-rewrite test fails with `TypeError: 'NoneType' object is not subscriptable` in `dataset_path_to_extra_path`, which is the bug itself.
- ruff, black, isort and mypy are clean on the file.

Baseline caveat: the dropped transfer test was in the "Baseline tests" commit (`f728652f009`), and history can't be rewritten here. When the branch is turned into a PR, squash `4d18da26fee`'s baseline-file changes (dataclass fakes, transfer test removal) into the baseline commit, and its `none` test removal into the fix commit (`bf8723a0b9d`). Otherwise the split-out baseline PR would carry a test that the fix PR then deletes.

## Integration test (`test/integration/test_pulsar_embedded_none_local_metadata.py`)

- It uses `integration_util.integration_tool_runner` and the `integration_module_instance` pattern of the sibling `test_pulsar_embedded_*` modules. It makes no direct HTTP calls, so it needs no populator or helper.
- A separate module is justified: one Galaxy config per module, and the existing `none` module uses `remote_metadata: true`, which is broken for other reasons (see `initial_implementation_debrief.md`).
- Red/green comes from the implementer (fails 2/2 without the fix, passes 2/2 with it). This challenge left the module unchanged and didn't re-run it.

## E2E

None needed. This is job-runner path handling with no UI surface. Tool tests through the embedded Pulsar runner are the right top layer.
