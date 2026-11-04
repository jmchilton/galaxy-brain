# Test challenges review — PR #24561

Profile gx_test_challenger, Opus 5.5 (claude-opus-5-5), low effort. Reviewed commit e43b2db63a4d96f238d577b0ca0c79c2ed043d3a. Details: [test_challenges_debrief.md](test_challenges_debrief.md).

### P2 1: Pulsar `require_container` enforcement tested only through SimpleNamespace fakes

`test/unit/app/jobs/test_require_container.py` builds a fake job wrapper/app from `SimpleNamespace`, calls `MinimalJobWrapper.requires_containerization.fget` on it, and drives `BaseJobRunner._find_container` via `__new__` plus a monkeypatched `get_disk_paths`. The Pulsar case never touches the Pulsar runner. Add an integration test in `test_user_defined_tool_job_conf.py` (embedded Pulsar) running a UDT with no container and asserting the job fails with "Failed to find a container when required" — the actual regression fixed (existing `TestCondaFallBackAndRequireContainer` is local-runner only). Extract the decision into a pure helper (tool type, `require_container_for_user_defined_tools`, destination value) and unit test that instead; drop the fake-runner test.

### P3 1: Job-directory visibility test has no positive control

`test_user_defined_cannot_see_job_directory` proves secrets are hidden but not that `inputs`/`configs` remain readable under the narrowed Pulsar mounts. Give the inspector tool a data input and echo its content in the same job.

### P3 2: Fold read-only mount test into the parametrized default test

`test_job_directory_tool_script_mounted_read_only` covers only Pulsar and never checks `outputs` is `:rw`. Merge into `test_default_volumes_do_not_expose_job_directory` over both job directory types and assert modes there.
