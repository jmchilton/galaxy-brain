### P2 1: The allowlist check and its rejection message are duplicated in the manager and the runner (implementation verified)

`DynamicToolManager.ensure_container_allowed` (`lib/galaxy/managers/tools.py`) and the inline loop in `BaseJobRunner._find_container` (`lib/galaxy/jobs/runners/__init__.py`) each build the same "Container '…' is not allowed for user defined tools on this Galaxy server. Allowed containers: …" message, so the two enforcement points can drift. The runner also reaches into `dynamic_tool_manager.container_allowlist` directly. `allows() -> bool` collapses "malformed" and "not listed" into `False`, which is why the manager parses the reference a second time to tell them apart.

Let `ContainerAllowlist` own the decision and the message: a `rejection(identifier) -> str | None` returns `None` when allowed, `"Invalid container: …"` when malformed, or the not-allowed message. The manager raises `RequestParameterInvalidException(rejection)` and the runner raises `ContainerNotAllowedError(rejection)`. `allows()` becomes `rejection(...) is None`. One runner-side exception type still covers both the malformed and disallowed cases, so the existing except-tuple and the Pulsar arm keep catching everything. The `"*"` short-circuit is preserved. Whether the call site should leave `_find_container` entirely is covered by P3 1 and the follow-up issue.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md), [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md), and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: implemented on the review branch with a unit test for both messages; the unit and integration tests for the manager and the job paths pass.

</details>

### P2 2: The job-time guard is tested through heavy mocks that integration tests can replace (implementation verified)

`test/unit/app/jobs/test_user_defined_tool_container_allowlist.py` builds a `BaseJobRunner` with `__new__`, fakes `app`, `job_wrapper` and `tool` with `SimpleNamespace`, and monkeypatches `get_disk_paths`, all to test a six-line `tool_type == "user_defined"` branch. `test_job_of_stored_tool_with_disallowed_container_fails` already covers the disallowed case end to end. The other two cases are cheap to add to the new integration class.

Add two integration tests to `TestUserDefinedToolContainerAllowlist`:

- Run a user tool created with `quay.io/biocontainers/coreutils:9.5` and assert the job is `ok`.
- With `framework_tool_and_types = True`, run `job_environment_default_legacy`, which declares `busybox:1.36.1-glibc`, under the default list and assert the job is `ok`.

Then cut the unit file down to one case: an allowed declared image whose container resolver returns something else. That case pins checking the declared image rather than the resolved one, and integration tests without docker can't exercise it.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: both integration tests pass, and the two unit cases were dropped only after they did.

</details>

### P2 3: The Pulsar refusal path has no integration coverage (implementation verified)

The new `except ContainerNotAllowedError` branch in `PulsarJobRunner.__prepare_job` is tested only by a unit test that calls the name-mangled `_PulsarJobRunner__prepare_job` on an `object.__new__` runner. Pulsar is the recommended production runner for user-defined tools (`test_user_defined_tool_job_conf.py`).

Add a Pulsar variant of the integration test using `embedded_pulsar_job_conf.yml`. It runs a stored busybox tool and asserts the job errors with the allowlist message in `misc_info`. No docker is needed, because the refusal happens before launch.

<details><summary>Evidence</summary>

With the `except ContainerNotAllowedError` arm removed from `pulsar.py`, the new test fails:

```
E   assert "Container 'busybox' is not allowed for user defined tools" in 'Job failed'
```

It passes with the arm restored.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: red without the Pulsar arm, green with it.

</details>

### P2 4: `_store_tool_row` is copy-pasted between integration test files (implementation verified)

`test/integration/test_user_defined_tool_container_allowlist.py::_store_tool_row` is a verbatim copy of the one in `test/integration/test_user_defined_tool_loading.py`, and the Pulsar variant from P2 3 adds another user of it.

Extract one `store_user_tool_row(app, user_id, representation)` into `galaxy_test/driver/integration_util.py` and use it from both files.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: both integration files pass with the shared helper.

</details>

### P3 1: The container rejection is placed and handled differently from the sibling role recheck (#24607)

#24607 rechecks the execute role in `JobWrapper.prepare` (`lib/galaxy/jobs/__init__.py`). This PR puts the container check in `BaseJobRunner._find_container`, which adds a runner-level exception, a fourth entry in the `prepare_job` except-tuple, and a dedicated `except ContainerNotAllowedError` arm in `PulsarJobRunner.__prepare_job`.

On Pulsar the two deterministic rejections now diverge:

- An `InsufficientPermissionsException` raised from `prepare()` is queued to `fail_job`, which goes through `_handle_runner_state("failure")` and so can be resubmitted.
- A `ContainerNotAllowedError` deliberately bypasses `fail_job`.

The PR description argues that resubmitting a container refusal is pointless. The same argument applies to a role refusal.

There are two ways to resolve this:

- Run the check next to the role recheck in `JobWrapper.prepare`, keyed on the tool being user-defined. That gives one enforcement point that every runner hits.
- Keep the placement, but derive both errors from a shared "job rejected" exception that each runner handles once.

Either way, the role and container rejections behave the same on Pulsar, and the except-tuple stops growing. This wasn't changed on the review branch because it alters #24607's Pulsar behavior on a release branch. The follow-up issue tracks it.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort.

</details>

### P3 2: The linter's `.strip()` hides whitespace that the parser and allowlist reject (implementation verified)

`ContainerImageShape.lint` strips the identifier before parsing, but neither `ContainerDescription` nor `parse_image_reference` strips. So `"quay.io/biocontainers/coreutils:9.5 "` passes lint and then fails at the allowlist as "Invalid container". Under `["*"]`, `rejection()` short-circuits and the tool is stored with the trailing space. XML containers are already stripped by `xml_text`, so the strip only affects YAML and user tools.

Drop the strip so that whitespace becomes a lint error. The manager's "Invalid container" branch stays reachable: `oras://…` skips the shape lint but fails `parse_image_reference` with an unsupported scheme. Retarget `test_create_reports_malformed_container_as_invalid` to an `oras://` identifier, and add whitespace cases that expect the lint rejection.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the new whitespace lint and manager cases fail with the strip and pass without it.

</details>

### P3 3: Importing a workflow that embeds a disallowed user tool is untested (implementation verified)

Workflow-import copies go through `create_unprivileged_tool` (`WorkflowModule.resolve_tool_uuid`, `WorkflowsManager.copy_workflow_for_user`). That is the most user-visible fallout of the new default: importing a workflow that embeds a busybox tool now fails.

Add an integration test that posts such a workflow and asserts:

- a 400 carrying the allowlist message;
- no new workflow;
- no new user tool.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the test passes.

</details>

### P3 4: `biocontainer_tag_built` hardcodes the quay.io registry next to the existing constants (implementation verified)

`recommend.py` keeps `QUAY_BIOCONTAINERS_PREFIX = "quay.io/biocontainers"` and `BIOCONTAINERS_NAMESPACE`, but the rewritten check compares against a literal `reference.registry != "quay.io"`.

Add `QUAY_REGISTRY = "quay.io"`, derive `QUAY_BIOCONTAINERS_PREFIX` from it and `BIOCONTAINERS_NAMESPACE`, and use it in the check.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: implemented; `test_recommend.py` passes.

</details>

### P3 5: `ContainerAllowlist` has two attributes called "entries" with different meanings (implementation verified)

`self.entries` holds the raw strings, which only `describe()` uses, and `self._entries` holds the parsed `_Entry` objects. Rename them to `raw_entries` and `_rules`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: implemented; `test_image_references.py` passes.

</details>
