### P1 1: Containerized upload / data-fetch tools lose `registry.xml` and `upload_params.json` (implementation verified)

`ToolEvaluator` points Galaxy-environment tools at files written to the job directory root, which `$defaults` no longer mounts. `$GALAXY_DATATYPES_CONF_FILE` / `__datatypes_config__` resolve to `<job_dir>/registry.xml`, and `upload1`'s `$paramfile` resolves to `<job_dir>/upload_params.json`. `upload1`, `__DATA_FETCH__` and `data_source` all read them. These tools only get a container when an admin opts in, e.g. with the documented `requires_galaxy_environment` resolver or the `fallback` resolvers. With such a setup, Docker/Singularity uploads and data fetches now fail with file-not-found whenever the job directory isn't reachable through another mount. That covers job directories outside `galaxy_root`, which is typical in production, and setups with `disable_galaxy_root_mount`. Before this PR, `$job_directory:ro` covered them.

<details><summary>Details</summary>

- Writers: `MinimalJobWrapper.prepare` writes `registry.xml` for `requires_galaxy_python_environment` tools (`lib/galaxy/jobs/__init__.py:1418`), and `__prepare_upload_paramfile` copies the paramfile (`:1336`). Both write to the job directory root.
- Paths: `lib/galaxy/tools/evaluation.py:285` and `:308`.
- Consumers: `tools/data_source/upload.xml:12`, `lib/galaxy/tools/data_fetch.xml:13`, `tools/data_source/data_source.py:77`.
- `__DATA_FETCH__`'s `$request_path` is a `configfile`, so it is already under `configs/`.
- No test in the PR covers this. `test_containerized_jobs.py` routes `upload1` to a non-container environment.

</details>

Write both files under `configs/` through the existing abstractions: `ensure_configs_directory` on the writer side and `compute_environment.config_directory()` in the evaluator. That keeps the PR's "only subdirectories are mounted" invariant. Mounting the two files individually would not work well: `registry.xml` only exists for Galaxy-environment tools, and Singularity refuses missing bind sources. Jobs prepared before the upgrade still work, because `__prepare_upload_paramfile` copies the paramfile whenever the stored path differs. The review branch does this, with unit tests that fail on the PR head:

- `test_evaluation.py::test_galaxy_environment_files_in_configs_directory`
- `test_job_wrapper.py::TestJobWrapper::test_prepare_writes_registry_to_configs_directory`

<details><summary>Details</summary>

A `requires_galaxy_environment` Docker integration test, for example `__DATA_FETCH__` with a job directory outside `galaxy_root`, would cover this end to end. It needs Docker and a Galaxy-capable image, so it was not written or run here.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 1: Default-on `require_container_for_user_defined_tools` and Pulsar enforcement are tested only through `SimpleNamespace` fakes (implementation verified)

`driver_util.py` turns the new option off for every test server. `test_require_container.py` builds `SimpleNamespace` wrappers, calls `MinimalJobWrapper.requires_containerization.fget` on them, and drives `BaseJobRunner._find_container` through `__new__`. The "Pulsar" case never touches the Pulsar runner. No test checks that a user-defined tool job actually fails on a destination without a container, and that is the regression this PR fixes for Pulsar. The existing `TestCondaFallBackAndRequireContainer` covers only the local runner with a destination-level `require_container`.

The review branch adds `TestUserDefinedToolRequiresContainerPulsar` and `...Local` to `test_user_defined_tool_job_conf.py`. They turn the option on, route `class: user_defined` to a destination without Docker, and assert the job errors with "Failed to find a container when required". Neither needs Docker, and both pass locally. Two further steps are optional: extract the `requires_containerization` decision into a pure helper and unit-test that instead of the property-`fget` trick, and drop the fake-runner test.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: Pulsar jobs failing `require_container` get no user-facing reason (implementation verified)

Local runners pass the new exception through `prepare_job` → `job_wrapper.fail(unicodify(e))`, so users see "Failed to find a container when required, contact Galaxy admin." In `PulsarJobRunner.__prepare_job`, the generic `except Exception` enqueues `fail_job` without a `fail_message`. On Pulsar, which is the recommended setup for user-defined tools, the same misconfiguration surfaces as plain "Job failed". The new Pulsar integration test from P2 1 confirmed this: its message assertion failed on the PR head.

The review branch adds a dedicated `ContainerRequiredException`, raised in `_find_container`. `__prepare_job` catches it and sets `job_state.fail_message` from it. The generic handler is unchanged, so arbitrary exception text is not shown to users.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: Job-directory visibility test covers only embedded Pulsar and has no positive control

`test_user_defined_cannot_see_job_directory` runs only on the embedded Pulsar destinations. The local-runner `$defaults` branch, which this PR also changes, is covered only by string-level unit tests. The test also proves that hidden files are hidden, but not that `inputs` stays readable under the narrowed mounts.

The review branch moves the test into a mixin and adds `TestUserDefinedToolLocalDocker`, a local runner with `docker_enabled` and `require_container`. It also gives the inspector tool a data input whose contents must appear in the output. These tests need Docker, which was unavailable locally, so they were written but not run. CI will be their first run. On the local runner, `launch_config` and `command.sh` don't exist, so only the `../metadata` check and the input control are meaningful there. Asserting that the local job script (`galaxy_<id>.sh`) is hidden would make this test stronger.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort.

</details>

### P3 3: Mounted-subdirectory list duplicated between job setup and container defaults (implementation verified)

The directories Galaxy creates up front (`("inputs", "configs", "outputs")` in `_setup_working_directory`) must match the ones `_job_directory_subdirectories` mounts. A mount source that doesn't exist breaks Singularity and makes Docker create root-owned directories. Despite that coupling, the two lists are independent literals, and `test_job_wrapper.py` holds a third copy.

The review branch exports `JOB_DIRECTORY_CONTAINER_SUBDIRECTORIES` from `galaxy.tool_util.deps.container_classes`, because `galaxy-tool-util` can't import `galaxy.job_execution`. Job setup, the Pulsar variant (`+ "unstructured"`) and the test all use it.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 4: Read-only mount test is Pulsar-only and never checks that `outputs` is writable (implementation verified)

`test_job_directory_tool_script_mounted_read_only` covers only the Pulsar job directory type, and no test asserts that `outputs` or the working directory stays writable. The review branch folds those mode assertions into the parametrized `test_default_volumes_do_not_expose_job_directory`, which covers both job directory types and both container types.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 5: `mkdir -p` path quoting (implementation verified)

`_create_job_directory_subdirectories_command` wraps the path in literal double quotes. Elsewhere in command assembly, paths go through `shlex.quote` (`command_factory.py:156-158`). The review branch uses `shlex.quote` and updates the unit assertion to match.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>
