# Test challenges debrief — #24635

Profile `gx_test_challenger` (GX_PROCESS_CHALLENGE_TESTS, REVIEW_DIRECTORY mode — recommendations only, PR not edited). Model Opus 5.5 (claude-opus-5-5), effort medium. Reviewed commit `64dad7223ea` (merge of `origin/release_26.2` into PR head `fa12a2252dc`). Nothing was run; red/green judged by reading.

## Per-test verdicts

| Test | Verdict | Why |
|---|---|---|
| `test/unit/tool_util/test_image_references.py` | Keep | Pure parser/matcher, table-driven, one row per rule. Right layer. |
| `test/unit/tool_util/test_container_shape_lint.py` (new rows) | Keep | Red before (old regex rejected digests/ports). |
| `test/unit/tool_util/mulled/test_recommend.py::test_tag_built_none_for_digest_reference` | Keep | Red before (looked up `pandas@sha256` as repo). |
| `test/unit/app/tools/test_user_defined_tool_loading.py` (3 new) | Keep | Manager-level config plumbing (custom list, malformed entry → `ConfigurationError`, malformed ref → "Invalid container") — needs a non-default config per case, cheaper here than three integration classes. |
| `test/unit/config/test_user_defined_tool_allowed_containers.py` | Keep | Real config normalization (null/env string). Dedicated file matches sibling `test_allowed_login_redirect_hosts.py`. |
| `test/unit/app/jobs/test_user_defined_tool_container_allowlist.py` | Drop after refactor + integration additions | Builds a `SimpleNamespace` app/job wrapper/tool, `__new__`s `BaseJobRunner`, monkeypatches `get_disk_paths` — to test a 6-line guard. Disallowed case already covered end-to-end by the integration test; the allowed and non-user-defined cases are cheap integration additions (below). |
| `test/unit/app/jobs/test_pulsar_runner.py::test_container_refusal_fails_job_without_resubmission` | Rewrite (integration for message; keep a slimmer unit check for no-resubmit if wanted) | Calls name-mangled `_PulsarJobRunner__prepare_job` on an `object.__new__` runner with lambdas/SimpleNamespace. The user-visible behaviour (job errors with the allowlist message on Pulsar) is integration-testable with the existing embedded Pulsar job conf. |
| `test/integration/test_user_defined_tool_container_allowlist.py` | Keep, extend, dedupe helper | Right layer and red before. `_store_tool_row` is a verbatim copy of the one in `test/integration/test_user_defined_tool_loading.py`. Only runs the local runner. |

## Test plan (recommendations)

1. **Refactor the job-time guard** into one reusable check shared with creation, e.g. `ContainerAllowlist.not_allowed_message(identifier) -> str | None` (or `ensure_allowed(identifiers, exc_class)`), so `DynamicToolManager.ensure_container_allowed` and `BaseJobRunner._find_container` stop formatting the same "Container '…' is not allowed for user defined tools on this Galaxy server. Allowed containers: …" string twice. The pure part is then covered by `test_image_references.py`; the runner wiring by integration.
2. **Extend the integration test**:
   - run the created `BIOCONTAINERS_TOOL` (local runner, no docker in default integration config, so `cat` runs on host) and assert ok → replaces unit `..._allowed_container_proceeds`;
   - set `framework_tool_and_types = True` and run `job_environment_default_legacy` (declares `busybox:1.36.1-glibc`) under the default list, assert ok → replaces unit `test_other_tools_are_not_checked`;
   - add a Pulsar subclass (pattern from `TestUserDefinedToolRecommendedJobSetupTPV`) with `job_config_file = embedded_pulsar_job_conf.yml` running the stored busybox tool, asserting job `error` and the allowlist message in `misc_info`. Red without the new `except ContainerNotAllowedError` branch (generic `except Exception` → `fail_job` without the message). No docker needed — the refusal happens before launch.
3. **Extract `_store_tool_row`** into one shared integration helper (e.g. `store_user_tool_row(app, user_id, representation)` in `galaxy_test/driver/integration_util.py` or a small mixin) and use it from both integration files.
4. **Pulsar no-resubmit unit check** (optional): if kept, replace lambdas/SimpleNamespace with a small fake job wrapper dataclass recording `fail` calls; still relies on `object.__new__` + name mangling, so consider whether integration coverage of the message is enough.
5. **Workflow import** (optional): one API/integration check that importing another user's workflow embedding a busybox user tool is rejected under the default list (`WorkflowsManager.copy_workflow_for_user` / `resolve_tool_uuid` → `create_unprivileged_tool`). This is the most user-visible fallout of the breaking change and is untested.

## E2E

Not needed. Error surfaces as an API 400 string in the tool editor; the test driver sets `["*"]`, so a Selenium test would need custom config for little gain over the integration test.

## Red/green notes (reasoned)

- Integration create + job tests: red before (no check).
- Unit jobs disallowed: red before; allowed/other: green counterparts.
- Pulsar unit: red at assertion if `ContainerNotAllowedError` existed without the except branch (queue non-empty, `failures` empty).
