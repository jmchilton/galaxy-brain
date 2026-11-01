Laying another configuration option that controls containerization across a different axis than the other ones feels conceptually... intricate to me? The actual implementation though looks solid to me so probably this unease is not actionable - and certainly the unease of allowing UDT to run outside of containers feels worse. -John

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md) was run via Claude Opus 5.5 at medium effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Main one-way risk: on a release branch, this changes what tool containers can see and makes deployments start failing jobs that ran before. Tools or admin setups that read files from the job directory root lose access, user-defined tool jobs now fail on destinations that have no container, and Pulsar destinations with `require_container` set now enforce it.

<details><summary>Risk Details</summary>

- `$defaults` for Docker/Singularity tool containers no longer mounts `$job_directory`, only `tool_script.sh` plus `inputs`, `configs`, `outputs` (and `unstructured` for Pulsar). Any tool, wrapper or container setup that reads other paths under the job directory (e.g. `../metadata`, other files at the job directory root) breaks silently inside the container with "file not found".
- New `require_container_for_user_defined_tools` defaults to `true`. Deployments that ran user-defined tools on uncontainerized destinations now get failed jobs after a minor-release upgrade, unless the admin opts out.
- The `require_container` check moved into `BaseJobRunner._find_container`. Pulsar destinations, and any other runner that calls `_find_container`, that set `require_container` but had no container used to run anyway. They now raise.
- Galaxy now always creates `inputs/` and `configs/` in every job directory. That is cheap, but job directory layout is something external tooling might inspect.
- For Pulsar, a `mkdir -p .../unstructured` now runs before the container command. This depends on the remote Pulsar side creating the job directory layout that the PR describes. Older Pulsar versions that lack the other subdirectories would fail at container start, because Singularity refuses missing bind sources and Docker creates them as root.
- Prolog/epilog containers (containerized metadata) keep the full job directory mount. Only the tool container is narrowed.
- Admins with explicit `docker_volumes`/`singularity_volumes` that include `$job_directory` keep the old exposure. Only the sample docs change, and nothing warns them.
- The integration test for the Pulsar + Docker variant could not run locally, because the image build failed (per the PR description). Docker-on-Pulsar coverage therefore depends on CI.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether the narrower default mounts and the new fail-closed default for user-defined tools belong on `release_26.2`, or should land on `dev` with release notes. Both change behavior for running deployments. The security motivation (exposure of Pulsar `launch_config` callback credentials and object store config) argues for backporting. If it is backported, it needs a clear admin-facing release note covering both the opt-out and `$job_directory` in custom volumes.

Look closely at `_job_directory_volumes`. Is the per-runner list of subdirectories complete for real tools, including legacy-profile tools that write into `configs`, tools using `$__tool_directory__` or `unstructured` data, and Kubernetes/TPV setups? Also check whether moving the `require_container` check into `_find_container` changes behavior for runners that call it without building a command line.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24561_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24561_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24561_review_0) is branched from the reviewed commit `e43b2db63a4`. Its main change moves `registry.xml` and `upload_params.json` from the job directory root into `configs/`, so containerized upload and data fetch tools can still read them under the narrowed mounts. It also gives Pulsar users a real error message when a required container is missing, and shares one constant for the mounted subdirectory list. The remaining commits add integration coverage: user-defined tools must fail without a container, on Pulsar and on the local runner, and the job-directory visibility check now also runs on local Docker, with an input-readability control. All of this is one commit per verified finding.

- [`6ef79da8253`](https://github.com/jmchilton/galaxy/commit/6ef79da8253) Write registry.xml and upload_params.json under configs/. Uses `compute_environment.config_directory()` and `ensure_configs_directory`, with evaluator and job-wrapper unit tests (P1 1).
- [`966bb37e26f`](https://github.com/jmchilton/galaxy/commit/966bb37e26f) Share container-mounted job subdirectory list. Adds `JOB_DIRECTORY_CONTAINER_SUBDIRECTORIES` in `container_classes`, used by job setup and tests (P3 3).
- [`b3d8f803b15`](https://github.com/jmchilton/galaxy/commit/b3d8f803b15) Quote Pulsar unstructured mkdir path with shlex.quote. Matches path quoting elsewhere in command assembly (P3 5).
- [`549093b943c`](https://github.com/jmchilton/galaxy/commit/549093b943c) Assert job directory mount modes for both job directory types. Folds the Pulsar-only read-only test into the parametrized test and checks that outputs and working stay writable (P3 4).
- [`741fd47c713`](https://github.com/jmchilton/galaxy/commit/741fd47c713) Test user-defined tools fail without a container on Pulsar and local. Adds new integration classes that need no Docker (P2 1).
- [`1619a6a6715`](https://github.com/jmchilton/galaxy/commit/1619a6a6715) Report missing required container on Pulsar job failures. Adds a `ContainerRequiredException` that Pulsar's prepare path turns into the job's fail message (P3 1).
- [`1f2579830ee`](https://github.com/jmchilton/galaxy/commit/1f2579830ee) Cover local Docker job directory visibility, check inputs stay readable. Adds a mixin-shared visibility test with an input positive control; needs Docker and was not run locally (P3 2).

</details>

</details>

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

Fixed on the review branch in [`6ef79da8253`](https://github.com/jmchilton/galaxy/commit/6ef79da8253).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 1: Default-on `require_container_for_user_defined_tools` and Pulsar enforcement are tested only through `SimpleNamespace` fakes (implementation verified)

`driver_util.py` turns the new option off for every test server. `test_require_container.py` builds `SimpleNamespace` wrappers, calls `MinimalJobWrapper.requires_containerization.fget` on them, and drives `BaseJobRunner._find_container` through `__new__`. The "Pulsar" case never touches the Pulsar runner. No test checks that a user-defined tool job actually fails on a destination without a container, and that is the regression this PR fixes for Pulsar. The existing `TestCondaFallBackAndRequireContainer` covers only the local runner with a destination-level `require_container`.

The review branch adds `TestUserDefinedToolRequiresContainerPulsar` and `...Local` to `test_user_defined_tool_job_conf.py`. They turn the option on, route `class: user_defined` to a destination without Docker, and assert the job errors with "Failed to find a container when required". Neither needs Docker, and both pass locally. Two further steps are optional: extract the `requires_containerization` decision into a pure helper and unit-test that instead of the property-`fget` trick, and drop the fake-runner test.

Fixed on the review branch in [`741fd47c713`](https://github.com/jmchilton/galaxy/commit/741fd47c713).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: Pulsar jobs failing `require_container` get no user-facing reason (implementation verified)

Local runners pass the new exception through `prepare_job` → `job_wrapper.fail(unicodify(e))`, so users see "Failed to find a container when required, contact Galaxy admin." In `PulsarJobRunner.__prepare_job`, the generic `except Exception` enqueues `fail_job` without a `fail_message`. On Pulsar, which is the recommended setup for user-defined tools, the same misconfiguration surfaces as plain "Job failed". The new Pulsar integration test from P2 1 confirmed this: its message assertion failed on the PR head.

The review branch adds a dedicated `ContainerRequiredException`, raised in `_find_container`. `__prepare_job` catches it and sets `job_state.fail_message` from it. The generic handler is unchanged, so arbitrary exception text is not shown to users.

Fixed on the review branch in [`1619a6a6715`](https://github.com/jmchilton/galaxy/commit/1619a6a6715).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: Job-directory visibility test covers only embedded Pulsar and has no positive control

`test_user_defined_cannot_see_job_directory` runs only on the embedded Pulsar destinations. The local-runner `$defaults` branch, which this PR also changes, is covered only by string-level unit tests. The test also proves that hidden files are hidden, but not that `inputs` stays readable under the narrowed mounts.

The review branch moves the test into a mixin and adds `TestUserDefinedToolLocalDocker`, a local runner with `docker_enabled` and `require_container`. It also gives the inspector tool a data input whose contents must appear in the output. These tests need Docker, which was unavailable locally, so they were written but not run. CI will be their first run. On the local runner, `launch_config` and `command.sh` don't exist, so only the `../metadata` check and the input control are meaningful there. Asserting that the local job script (`galaxy_<id>.sh`) is hidden would make this test stronger.

Fixed on the review branch in [`1f2579830ee`](https://github.com/jmchilton/galaxy/commit/1f2579830ee).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort.

</details>

### P3 3: Mounted-subdirectory list duplicated between job setup and container defaults (implementation verified)

The directories Galaxy creates up front (`("inputs", "configs", "outputs")` in `_setup_working_directory`) must match the ones `_job_directory_subdirectories` mounts. A mount source that doesn't exist breaks Singularity and makes Docker create root-owned directories. Despite that coupling, the two lists are independent literals, and `test_job_wrapper.py` holds a third copy.

The review branch exports `JOB_DIRECTORY_CONTAINER_SUBDIRECTORIES` from `galaxy.tool_util.deps.container_classes`, because `galaxy-tool-util` can't import `galaxy.job_execution`. Job setup, the Pulsar variant (`+ "unstructured"`) and the test all use it.

Fixed on the review branch in [`966bb37e26f`](https://github.com/jmchilton/galaxy/commit/966bb37e26f).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 4: Read-only mount test is Pulsar-only and never checks that `outputs` is writable (implementation verified)

`test_job_directory_tool_script_mounted_read_only` covers only the Pulsar job directory type, and no test asserts that `outputs` or the working directory stays writable. The review branch folds those mode assertions into the parametrized `test_default_volumes_do_not_expose_job_directory`, which covers both job directory types and both container types.

Fixed on the review branch in [`549093b943c`](https://github.com/jmchilton/galaxy/commit/549093b943c).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 5: `mkdir -p` path quoting (implementation verified)

`_create_job_directory_subdirectories_command` wraps the path in literal double quotes. Elsewhere in command assembly, paths go through `shlex.quote` (`command_factory.py:156-158`). The review branch uses `shlex.quote` and updates the unit assertion to match.

Fixed on the review branch in [`b3d8f803b15`](https://github.com/jmchilton/galaxy/commit/b3d8f803b15).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>
