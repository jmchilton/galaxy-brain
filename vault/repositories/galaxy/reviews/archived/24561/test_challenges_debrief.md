# Test challenges debrief — PR #24561

Profile gx_test_challenger, Opus 5.5 (claude-opus-5-5), low effort. Reviewed commit e43b2db63a4d96f238d577b0ca0c79c2ed043d3a. No tests run (worktree has no `.venv`; low effort).

## Tests in the PR

- `test/integration/test_user_defined_tool_job_conf.py::test_user_defined_cannot_see_job_directory` — good red-to-green: before the PR `$job_directory:ro` exposes `../launch_config` / `../command.sh` / `../metadata`. Runs for both embedded-Pulsar and TPV subclasses. Keep. Missing a positive control in the same job (inputs/configs still readable) — see P3 1.
- `test/unit/tool_util/test_container_job_directory_volumes.py` — real `DockerContainer`/`SingularityContainer`, real `JobInfo`/`ToolInfo`, no mocks; parses the actual command line. Appropriate unit layer (exercising every container type × job dir type × profile via integration would need Docker+Singularity). Keep. Minor: `test_job_directory_tool_script_mounted_read_only` only covers Pulsar and never asserts `outputs` is `:rw` — fold into the parametrized default test (P3 2).
- `test/unit/app/jobs/test_job_wrapper.py::test_working_directory_has_container_mounted_subdirectories` — small, uses existing fixture wrapper, checks observable state. Keep.
- `test/unit/app/jobs/test_require_container.py` — hand-built `SimpleNamespace` job wrapper/tool/app, `BaseJobRunner.__new__`, pulls `MinimalJobWrapper.requires_containerization.fget` and calls it on the fake, monkeypatches `get_disk_paths`. Tests implementation via fakes; the core claim (Pulsar now enforces `require_container`) is not exercised against a Pulsar runner at all — the parametrization just passes compute dirs to `BaseJobRunner._find_container`. Rewrite (P2 1).

## Test plan / recommendations

1. Integration: in `test_user_defined_tool_job_conf.py` (embedded Pulsar), run a UDT with no `container:` (or a Pulsar destination without `require_container`, relying on `require_container_for_user_defined_tools`) and assert the job errors with "Failed to find a container when required". This is the regression the PR fixes; existing `TestCondaFallBackAndRequireContainer` only covers the local runner.
2. Unit, after a small refactor: extract `requires_containerization` logic to a pure helper, e.g. `requires_container(tool_type: str, require_for_udt: bool, destination_require: str) -> bool`, and test that directly — drops the property-`fget` trick and SimpleNamespace fakes. If the fake wrapper stays, replace SimpleNamespace with a small dataclass.
3. Drop the `_find_container` unit test once (1) exists; keep only if it moves to a reusable runner test fixture.
4. Positive control: give `TOOL_INSPECTING_JOB_DIRECTORY` a data input (and/or configfile) and echo its contents, proving `inputs`/`configs` mounts still work under Pulsar, not just that secrets are hidden.
5. Merge `test_job_directory_tool_script_mounted_read_only` into `test_default_volumes_do_not_expose_job_directory` (both job dir types) and assert `outputs` ends `:rw`.

No E2E/Selenium test warranted — backend job/container behavior only.
