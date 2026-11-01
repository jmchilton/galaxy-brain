Run via Opus at low effort.

# Test challenges debrief

No changes this round, so no new commits. I challenged the current tests independently (`bf1ec9728a6`, after the re-scope) and reached the same verdicts as round 1 (`earlier_drafts/1/test_challenges_debrief.md`). The re-scope commit `bf1ec9728a6` only edits sample job conf comments and needs no new test.

## Unit tests (`test/unit/app/jobs/test_pulsar_compute_environment.py`)

| Test | Commit | Verdict |
|---|---|---|
| `test_rewrite_action_rewrites_extra_files_beside_dataset` | baseline (`f728652f009`) | **Keep.** It runs the real Pulsar `PathMapper`/`FileActionMapper`, so it doesn't test the implementation directly. No integration module uses the `rewrite` action. Writing one isn't easy: `rewrite` needs a second mount path for Galaxy's per-run `file_path`, set in the job conf. |
| `test_unchanged_rewrite_action_leaves_extra_files_in_place` | fix (`bf8723a0b9d`), trimmed in `4d18da26fee` | **Keep.** It reaches the same `is None` branch as the `none` integration module, but by another Pulsar route (a `rewrite` that maps a path to itself). It pins the general contract ("if Pulsar doesn't rewrite the dataset, the extra files stay in place"). A fix keyed on `default_file_action == "none"` would pass the integration test and fail this one. It's fast and needs no server. |

Mocks and fakes:
- There are no `mock`/`SimpleNamespace` objects. `FakeDataset` and `FakePulsarClient` are dataclasses. `FakeLocalComputeEnvironment` and `FakeJobWrapper` are small classes. No reusable Pulsar client fake exists elsewhere in `test/unit` (grep for `FileActionMapper`/`PulsarComputeEnvironment`/`pulsar_client` finds only this file).
- Restructuring: not worth it. Pulling the `None` fallback into a free function would test a two-line `if` and drop the real Pulsar mappers, which are the point of these tests. It would also be out of place in a 25.1 fix. Same conclusion as round 1.

Red/green, re-run this round. I reverted the fix with `git show f728652f009:lib/galaxy/jobs/runners/pulsar.py` and restored it afterwards; the worktree is clean.
- With the fix: 2 passed.
- Without the fix: the baseline `rewrite` test passes, as a baseline test should. The unchanged-`rewrite` test fails at the bug itself: `TypeError: 'NoneType' object is not subscriptable` in `dataset_path_to_extra_path` (`compute_environment.py:16`), not at a missing API.
- ruff, black, isort and mypy are clean on both test files.

Baseline caveat (carried over): `4d18da26fee` changed the baseline file (dataclass fakes, transfer test dropped) and dropped the fix commit's `none` unit test. When the PR is cut, squash those parts into `f728652f009` and `bf8723a0b9d` respectively.

Small correction to round 1: `test_pulsar_embedded.py` uses `embedded_pulsar_job_conf.yml`, which sets no `default_file_action`, so it stages with Pulsar's default `transfer`, not `copy`. The coverage argument for dropping the transfer unit test still holds (`composite`, `composite_output`, `composite_output_tests` run there). The unit module docstring says "transfer/copy", which is accurate enough.

## Integration test (`test/integration/test_pulsar_embedded_none_local_metadata.py`)

- It follows the sibling `test_pulsar_embedded_none.py` pattern (`integration_module_instance` + `integration_tool_runner`). It makes no direct HTTP calls, so no populator or helper applies.
- A separate module is needed: one Galaxy config per module, and `test_pulsar_embedded_none.py` uses `remote_metadata: true`, which breaks these tools for an unrelated reason (queued in `issues_incubator/incubating/pulsar_none_remote_metadata_unstaged/`).
- The tool choice is tight: `composite` covers `$input.extra_files_path`, and `composite_output_tests` covers `$output.files_path`/`$output.extra_files_path`.
- Red/green, re-run this round. With the fix: 2/2 passed (179s). Without the fix (same `git show` revert): 2/2 failed with `Job in error state`, and the server log shows `TypeError: 'NoneType' object is not subscriptable`, which is the bug. They fail at the tool assertion, not at a missing fixture.

## Sample job conf commit (`bf1ec9728a6`)

Comment-only edits plus restoring a `#` on `default_file_action`. `test/unit/app/jobs/test_job_configuration.py` already loads both samples (the re-scope confirmed it passes). A dedicated test would be silly.

## E2E

None needed. This is job-runner path handling with no UI. Tool tests through the embedded Pulsar runner are the right top layer.
