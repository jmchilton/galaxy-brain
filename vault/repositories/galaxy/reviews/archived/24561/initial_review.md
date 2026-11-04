# #24561 initial review — default profile

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Opus 5.5 (claude-opus-5-5), effort medium
- Reviewed commit: `e43b2db63a4d96f238d577b0ca0c79c2ed043d3a` (base `release_26.2`, 4 commits)

## Verdict

Right direction and a well-scoped hardening: narrowing `$defaults` to named subdirectories, moving the `require_container` check into `_find_container` so Pulsar (and k8s/AWS/GCP/chronos/godocker) enforce it, and the Pulsar integration test that fails on base are all good. One real regression: the claim "the tool command only runs `tool_script.sh` from the job directory root" doesn't hold for Galaxy-environment tools (upload / data fetch / data source), which read files from the job directory root. Rest are small reuse/test notes.

## Bugs

### P1 1: Containerized upload / data-fetch / data-source tools lose job-directory-root inputs

`ToolEvaluator` points tools at files written to the job directory root, which `$defaults` no longer mounts:

- `lib/galaxy/tools/evaluation.py:285` — `__datatypes_config__` / `GALAXY_DATATYPES_CONF_FILE` = `<job_dir>/registry.xml` (written by `MinimalJobWrapper.prepare`, `lib/galaxy/jobs/__init__.py:1416-1418`, for `requires_galaxy_python_environment` tools).
- `lib/galaxy/tools/evaluation.py:307-308` — `upload1`'s `paramfile` = `<job_dir>/upload_params.json`.

Consumers: `tools/data_source/upload.xml:12` (`'$GALAXY_DATATYPES_CONF_FILE' '$paramfile'`), `lib/galaxy/tools/data_fetch.xml:13` (`--datatypes-registry '$GALAXY_DATATYPES_CONF_FILE'`), `tools/data_source/data_source.py`.

These tools only get a container when the admin opts in — the documented `requires_galaxy_environment` resolver (`doc/source/admin/container_resolvers.rst:305`, `container_resolvers/explicit.py:245`) exists for exactly this, and `fallback` / `fallback_singularity` match them too. Under those configs, with Docker or Singularity `$defaults`, uploads and data fetches will now fail with file-not-found whenever the job directory isn't otherwise reachable — i.e. job directories outside `galaxy_root` (typical production layouts) or `disable_galaxy_root_mount` set. Before, `$job_directory:ro` covered it. None of the PR's tests or the integration suites it ran exercise this (`test_containerized_jobs.py:457` routes `upload1` to a non-container environment). (`__DATA_FETCH__`'s `$request_path` is a `configfile`, so it is fine.)

Suggested fix: write both files under `configs/` (via the existing `ensure_configs_directory`, `lib/galaxy/job_execution/setup.py:329`) and update the two `param_dict` paths and `MinimalJobWrapper.__prepare_upload_paramfile`; alternatively add `$job_directory/registry.xml:ro` (+ `upload_params.json`) to `_job_directory_volumes`, but moving them keeps the "only subdirectories are mounted" invariant. Add a unit case in `test_container_job_directory_volumes.py` or, better, an integration test that runs `__DATA_FETCH__` under a `requires_galaxy_environment` Docker resolver.

## Should fix / minor

### P3 1: Mounted-subdirectory list duplicated between job setup and container defaults

The set of directories that must exist (`lib/galaxy/jobs/__init__.py:1443`, `("inputs", "configs", "outputs")`) and the set that is mounted (`_job_directory_subdirectories` in `container_classes.py`) are now coupled — a mount source that doesn't exist breaks Singularity and makes Docker create root-owned dirs — but are two independent literals (plus a third copy in `test_job_wrapper.py`). Export one constant from `galaxy.tool_util.deps.container_classes` (or `galaxy.job_execution.setup`, next to `ensure_configs_directory`) and use it in both places; the Pulsar variant is that list plus `unstructured`.

### P3 2: Default-on `require_container_for_user_defined_tools` has no integration coverage

`driver_util.py` turns the option off for every test server, so the default `true` path is only covered by `test_require_container.py`, which builds `SimpleNamespace` wrappers and calls `MinimalJobWrapper.requires_containerization.fget` on them. That checks the boolean expression, not that a UDT job actually fails. An integration case (e.g. in `test_user_defined_tool_job_conf.py`, overriding the option back to `true` on a plain local destination and asserting the job errors with "Failed to find a container when required") would replace the mock-heavy property tests; the `_find_container` parametrized test can stay as the cheap unit check.

### P3 3: Pulsar jobs failing `require_container` get no user-facing reason

Local runners route the new exception through `prepare_job` → `job_wrapper.fail(unicodify(e))`, so users see "Failed to find a container when required, contact Galaxy admin." In `PulsarJobRunner.__prepare_job` (`lib/galaxy/jobs/runners/pulsar.py:667-675`) the generic `except Exception` sets `fail_or_resubmit` and enqueues `fail_job` without `fail_message`, so the same UDT misconfiguration on Pulsar (the recommended UDT setup) surfaces as an unexplained failure, and may be resubmitted. Set `job_state.fail_message = str(e)` for this case (or catch it specifically).

### P3 4: Job-directory visibility test only covers embedded Pulsar

`test_user_defined_cannot_see_job_directory` runs only on the embedded Pulsar destinations (`TestUserDefinedToolRecommendedJobSetup` / `...TPV`). The local-runner `$defaults` branch, which the PR also changes, is only covered by the string-level unit tests in `test_container_job_directory_volumes.py`. Add a local-runner Docker variant of the integration test (a UDT on a plain local destination with `docker_enabled` + `require_container`) asserting the same `../command.sh` / `../metadata` checks; it would also cover the `galaxy_<id>.sh` job script name used there.

### P3 5: `mkdir -p` path quoting

`_create_job_directory_subdirectories_command` wraps the path in literal double quotes; elsewhere in this command assembly (`command_factory.py:156-158`) paths go through `shlex.quote`. Use `shlex.quote(os.path.join(...))` for consistency.

## Notes (no action)

- Pulsar destinations using `remote_container_handling` compute `$defaults` with Pulsar's own `galaxy-tool-util`, so the narrowed mounts only reach those once Pulsar's dependency is upgraded. Worth a line in the PR description / release notes alongside the "drop `$job_directory` from explicit volumes" admin advice.
- Moving the check into `_find_container` also gives k8s/AWS/GCP/chronos/godocker a clear error instead of `None.container_id`; condor/htcondor docker universe now call it twice (pre-existing double call, harmless).
- Prolog/epilog keeping `$job_directory:ro` is correct; `test_epilog_containers_keep_job_directory` pins it.
- Legacy profile ≤ 19.09 `configs:rw` behavior preserved and tested.
