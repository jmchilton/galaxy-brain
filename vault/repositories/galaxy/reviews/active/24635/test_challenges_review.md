# Test challenges review — #24635

- Profile: `gx_test_challenger`
- Model: Opus 5.5 (claude-opus-5-5), effort medium
- Reviewed commit: `64dad7223ea` (merge of `origin/release_26.2` into PR head `fa12a2252dc`)
- Debrief: [test_challenges_debrief.md](test_challenges_debrief.md)

Verdict: test coverage is solid and every new test is red before the change or a meaningful counterpart. Parser/linter/config/manager unit tests are at the right layer. The job-runner unit tests are mock-heavy, and integration tests could cover them more cheaply. That integration coverage would also include the Pulsar path, which today has no end-to-end test. No P1s.

### P2 1: Job-time guard tested through heavy mocks; move coverage to integration and drop the unit file

`test/unit/app/jobs/test_user_defined_tool_container_allowlist.py` `__new__`s a `BaseJobRunner`, fakes `app`, `job_wrapper` and `tool` with `SimpleNamespace`, and monkeypatches `get_disk_paths`, all to test a 6-line `tool_type == "user_defined"` guard. The disallowed case is already covered end to end by `test_job_of_stored_tool_with_disallowed_container_fails`. The other two cases are cheap integration additions to the new integration class:

- Run the already-created `BIOCONTAINERS_TOOL` and assert ok. This replaces `..._allowed_container_proceeds`. The default integration config runs user tools on the host, so `cat` works without docker.
- Set `framework_tool_and_types = True` and run `job_environment_default_legacy`, which declares `busybox:1.36.1-glibc`, under the default list. This replaces `test_other_tools_are_not_checked`.

Then drop the unit file.

### P2 2: No integration coverage of the Pulsar refusal path

The new `except ContainerNotAllowedError` branch in `PulsarJobRunner.__prepare_job` is tested only by a unit test. That test calls the name-mangled `_PulsarJobRunner__prepare_job` on an `object.__new__` runner with lambda/SimpleNamespace fakes. Pulsar is the recommended production runner for user-defined tools (`test_user_defined_tool_job_conf.py`). Add a subclass of the new integration class with `job_config_file = embedded_pulsar_job_conf.yml`, following the `TestUserDefinedToolRecommendedJobSetupTPV` pattern. It should run the stored busybox tool and assert the job is `error` with the allowlist message in `misc_info`.

This is red without the branch: the generic `except Exception` path queues `fail_job`, whose default message is "Job failed". No docker is needed because the refusal happens before launch. The unit test can then be slimmed (a small fake wrapper dataclass recording `fail` calls) or kept only for the no-resubmit property.

### P2 3: `_store_tool_row` copy-pasted between integration files

`test/integration/test_user_defined_tool_container_allowlist.py::_store_tool_row` is a verbatim copy of the one in `test/integration/test_user_defined_tool_loading.py`. Extract one shared helper, e.g. `store_user_tool_row(app, user_id, representation)` in `galaxy_test/driver/integration_util.py` or a small mixin, and use it in both files. P2 2 adds a third user.

### P3 1: Duplicate "not allowed" message in manager and runner

`DynamicToolManager.ensure_container_allowed` and `BaseJobRunner._find_container` each build the same "Container '…' is not allowed for user defined tools on this Galaxy server. Allowed containers: …" string. Put it on `ContainerAllowlist`, e.g. `not_allowed_message(identifier) -> str | None`, so both callers share one abstraction. The pure part is then covered by `test_image_references.py`, and the runner change shrinks to raising with the returned message. This is what makes dropping the unit file in P2 1 natural.

### P3 2: Workflow import of a disallowed user tool untested

The PR says workflow-import copies go through `create_unprivileged_tool` (`WorkflowsManager.copy_workflow_for_user`, `WorkflowModule.resolve_tool_uuid`). That is the most user-visible fallout of the breaking change: importing another user's workflow that embeds a busybox tool now fails. One assertion in the new integration class would pin that the import is rejected with the allowlist message, not partially created.

### Not recommended

- E2E: the error is an API 400 shown in the tool editor, and the test driver sets `["*"]`. A Selenium test would need custom config for little gain over the integration tests.
- Parser, linter, recommend, config and manager unit tests: keep as is.
