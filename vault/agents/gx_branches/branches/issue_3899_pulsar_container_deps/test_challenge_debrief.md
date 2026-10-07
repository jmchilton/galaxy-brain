# Test challenge debrief: issue_3899_pulsar_container_deps

Process: `vault/agents/_shared/GX_CHALLENGE_TESTS.md`. Changes are uncommitted in the worktree.

## Unit tests (`test/unit/app/jobs/test_pulsar_runner.py`)

| Test | Verdict | Why |
|---|---|---|
| `test_dependency_resolution_skipped_for_containers` | keep | Decision table for `effective_dependency_resolution`, the policy function's contract. The new integration test covers only default `remote` with host vs. opted-out container. These rows have no other coverage: `local`+container → `none`, a `resolve_dependencies=True` container keeping `remote`/`local`, and explicit `none` being respected. Pure function, no mocks beyond a data stub. |
| `test_unknown_dependency_resolution_rejected` | keep | The `MockContainer()` case checks that validation runs before the container short-circuit, a real ordering guard for the refactor. An integration test would need a deliberately misconfigured Galaxy, which isn't worth it. |
| `MockContainer` dataclass | keep | The user asked for it. There's no reusable container stub in `test/unit` (`test_command_factory.py` uses an ad-hoc `Bunch`). It's a plain data stub, not a behavior mock. |
| `test_rewrite_container_*` (only switched to `MockContainer`) | unchanged | Out of scope; the branch didn't change their logic. |

## Integration test: added

Added `TestEmbeddedDockerPulsarRemoteDependencyResolution` in `test/integration/test_pulsar_embedded_containers.py`.

- **Setup:** an inline `job_config` with an embedded Pulsar runner. Its `pulsar_app_config` uses a temp `tool_dependency_dir` and `dependency_resolvers: [{type: galaxy_packages}]`, with conda off. Galaxy-side resolution is still off via `disable_dependency_resolution`, and `dependency_resolution` stays at its default `remote`.
- **Fixture:** `write_fake_bwa_package` creates `bwa/0.7.15/env.sh`, which appends a line to a marker file each time it's sourced and puts a fake `bin/bwa` on PATH.
- **Two environments:**
  - `pulsar_docker` (docker, `require_container`) is the default and runs `mulled_example_explicit`.
  - `pulsar_host` (no docker) runs `mulled_example_simple`, routed via `tools:`.
- **`test_host_job_resolves_dependencies_in_pulsar`:** the positive control. The output is the fake bwa sentinel and the marker count goes up. This proves the fixture is reached under remote resolution, so the negative test can't pass vacuously.
- **`test_container_job_skips_dependency_resolution_in_pulsar`:** the output contains the real `0.7.15-r1140`, which proves the container ran, and the marker count is unchanged.
- **Why it's red on origin/dev:** under default `remote`, the runner sent a `DependenciesDescription` regardless of container. Pulsar's `_expand_command_line` then prepends `. env.sh` on the host before the `docker run` command, so the marker would increment.
- **Skips without docker:** uses `skip_if_container_type_unavailable`. It doesn't need the metadata image build because `remote_metadata` runs on the host, same as the `user_defined` env in `embedded_pulsar_job_conf.yml`.
- **Not run locally** (dev machine load rule). I verified the following:
  - `--collect-only` collects both tests.
  - A scratch check that builds a real `pulsar.core.PulsarApp` with the same `pulsar_app_config` starts fine. The old "filelock problem" note didn't bite with conda off. `dependency_shell_commands` for bwa 0.7.15 returns `PACKAGE_BASE=...; . .../env.sh`.
  - CI needs to confirm it end to end.

## E2E / Selenium

Not appropriate. This is a job-runner backend change with no UI surface, and the integration test checks the actual behavior.

## Changes

- `test/integration/test_pulsar_embedded_containers.py`: new class, `write_fake_bwa_package` helper, `FAKE_BWA_OUTPUT` constant, and an `EXTENDED_TIMEOUT` import.
- No changes to unit tests or library code.

### Review suggestion not acted on

- Did not move the run, wait and fetch steps from `MulledJobTestCases._run_and_get_contents` into a shared helper. That method has container-metrics assertions built in, and the host control job would fail them. The overlap is three populator calls.
- Kept `remote_metadata: True` on both environments. This matches the CI-exercised `user_defined` env in `embedded_pulsar_job_conf.yml` (docker, no metadata container, run by `cat_user_defined` in `test_pulsar_embedded.py`).

## Results

- Unit: `test_pulsar_runner.py` + `test_command_factory.py`, 64 passed.
- ruff, isort, black: clean.
- mypy: no errors in changed files (23 errors, all pre-existing in untouched files).
