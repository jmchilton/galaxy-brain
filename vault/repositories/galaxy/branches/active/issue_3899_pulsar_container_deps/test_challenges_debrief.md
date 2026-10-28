Run via Opus 5.5 at high effort.

# Test challenge debrief (round 2): issue_3899_pulsar_container_deps

Head `05e0c26b297`. Re-challenged every test on the branch after the rebase. Nothing changed: no test or library edits, so no new commit.

## Unit tests (`test/unit/app/jobs/test_pulsar_runner.py`)

| Test | Verdict | Why |
|---|---|---|
| `test_dependency_resolution_skipped_for_containers` | keep | Decision table for the pure function `effective_dependency_resolution`. The integration test covers only the default `remote` with host vs. opted-out container. The `local`+container, opt-in container, and explicit `none` rows have no other coverage. |
| `test_unknown_dependency_resolution_rejected` | keep | Guards the ordering: validation runs before the container short-circuit. Reproducing it in an integration test would need a misconfigured Galaxy, which is too costly. |
| `MockContainer` dataclass | keep | Already a plain dataclass stub, as the process asks for. It replaced `SimpleNamespace` for the touched rewrite tests. There is no shared container stub in `test/unit` to reuse. |
| `test_rewrite_container_*` | unchanged | Only the stub was swapped; their logic is outside the branch's scope. |

No mocks to replace. The policy is already pulled out of `PulsarJobRunner` into a module-level function, which is the restructuring the process asks for.

## Red/green

- **Unit:** on `origin/dev` the new tests fail at import, because `effective_dependency_resolution` doesn't exist there. The process normally wants a failure at the test's own assertion, but the extracted function is the design change itself, so this is an accepted exception. The rows that guard the behavior (container → `none` under `remote`/`local`) would fail at their assertion against the old inline logic.
- **Integration** (`TestEmbeddedDockerPulsarRemoteDependencyResolution`): red on dev by reasoning. Under the default `remote`, the old runner always sent a `DependenciesDescription`. Pulsar then sourced `env.sh` on the host before `docker run`, so the marker count goes up. The host-job control means the negative test can't pass vacuously. Not run locally because it needs docker; CI has to confirm it.

## API/integration helper use

The integration test uses `DatasetPopulator.run_tool`, `wait_for_job` and `get_history_dataset_content`, and has no raw HTTP calls. Round 1 explained why it doesn't reuse `MulledJobTestCases._run_and_get_contents` (its container-metrics asserts would fail the host control); that still holds.

## E2E

Not applicable. This is a job-runner backend change with no UI.

## Results

- `test_pulsar_runner.py` + `test_command_factory.py`: **77 passed**. Run with an existing Python 3.13 venv (`ag_grid_36/.venv`, pulsar-galaxy-lib 0.16.0) and `PYTHONPATH=lib`.
- Integration test not run locally.

## Status

Not BLOCKED.
