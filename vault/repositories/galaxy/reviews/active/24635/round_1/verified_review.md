### P2 1: Pulsar `remote_container_handling` resolves the container before `prepare()` rejects the job (implementation verified)

`PulsarJobRunner.__prepare_job` calls `self._find_container(job_wrapper)` for `remote_container_handling` destinations before `job_wrapper.prepare(**prepare_kwds)`. Before `9ee89b52d9` the allowlist check sat at the top of `_find_container`, so on this path it ran before any resolution. Now the container of a tool that is about to be refused is resolved first. If resolution raises, the job goes through the outer `except Exception` and `fail_or_resubmit`. It is then resubmitted or failed with a generic error instead of the allowlist message. The same ordering applies to the #24607 role recheck. Every other runner already calls `prepare_job` before `_find_container`. The new unit test `test_rejected_job_fails_without_resubmission` changed `destination_params` from `{"remote_container_handling": True}` to `{}`, so this path is no longer exercised.

Move the `remote_container_handling` block below the successful `prepare()`; nothing that runs before `prepare()` depends on it. Restore `remote_container_handling: True` in the unit test and give the runner a `_find_container` that fails if called.

<details><summary>Evidence</summary>

With the PR's `pulsar.py` and the restored test (plus the fake `get_job` from P3 1):

```
E       assert [] == ["Container '... not allowed"]
```

It passes with the block moved after `prepare()`.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the restored unit test is red with the old ordering and green with the move.

</details>

### P2 2: The allowlist rejection message is duplicated in the manager and `JobWrapper.prepare` (implementation verified)

`DynamicToolManager.ensure_container_allowed` (`lib/galaxy/managers/tools.py`) and the new loop in `MinimalJobWrapper.prepare` (`lib/galaxy/jobs/__init__.py`) each build the same "Container '…' is not allowed for user defined tools on this Galaxy server. Allowed containers: …" message, so the two enforcement points can drift. `ContainerAllowlist.allows() -> bool` collapses "malformed" and "not listed" into `False`, which is why the manager parses the reference a second time to tell them apart. Moving the check into `prepare` resolved the placement concern from the earlier round, but the duplication moved with it.

Let `ContainerAllowlist` own the decision and the message. A `rejection(identifier) -> str | None` returns `None` when the identifier is allowed, `"Invalid container: …"` when it is malformed, and the not-allowed message otherwise. The manager raises `RequestParameterInvalidException(rejection)`, `prepare` raises `InsufficientPermissionsException(rejection)`, and `allows()` becomes `rejection(...) is None`. A malformed identifier on a stored tool now fails its job with "Invalid container: …" rather than "not allowed".

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md), [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md), and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: implemented on the review branch with a unit test for both messages. The allowlist, job wrapper and integration tests pass.

</details>

### P2 3: Pulsar's prepare-time rejection has no end-to-end test, and nothing pins its no-resubmit behavior (implementation verified)

The new `except InsufficientPermissionsException` arm in `PulsarJobRunner.__prepare_job` is tested only by a unit test on an `object.__new__` runner. Pulsar is the recommended production runner for user-defined tools. Without the arm, the exception would go to the generic path, which queues `fail_job` with the exception text as `fail_message`. A plain end-to-end test that asserts `error` and the allowlist message would still pass, so the test also has to prove the job was not resubmitted. The arm also changes #24607's execute-role recheck on Pulsar, which no longer goes through resubmission rules.

Add an embedded-Pulsar variant of `test_job_of_stored_tool_with_disallowed_container_fails`. Its Pulsar environment should carry a `resubmit: [{condition: any_failure, environment: local}]` rule. The test then asserts `error`, the allowlist message, and that the job's `destination_id` is still the Pulsar environment. No docker is needed, because the rejection happens before launch.

<details><summary>Evidence</summary>

With the `except InsufficientPermissionsException` arm removed from `pulsar.py`, the new test fails:

```
E           AssertionError: assert 'resubmitted' == 'error'
```

It passes with the arm restored.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: red without the Pulsar arm, green with it.

</details>

### P2 4: `_store_tool_row` is copy-pasted between integration test files (implementation verified)

`test/integration/test_user_defined_tool_container_allowlist.py::_store_tool_row` is a verbatim copy of the one in `test/integration/test_user_defined_tool_loading.py`. The Pulsar variant from P2 3 adds another user of it.

Extract one `store_user_tool_row(app, user_id, representation)` into `galaxy_test/driver/integration_util.py` and use it from both files.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: both integration files pass with the shared helper.

</details>

### P3 1: The Pulsar rejection unit test fails without the fix only because a fake attribute is missing (implementation verified)

In `test_rejected_job_fails_without_resubmission`, the `SimpleNamespace` job wrapper has no `get_job`. Without the new arm, the test errors with `AttributeError: ... no attribute 'get_job'` on the generic `except Exception` path. It never reaches the `failures` and `runner.work_queue.empty()` assertions it exists for.

Give the fake wrapper a `get_job` and stub `runner._job_state`, so the generic path runs and the red failure comes from the test's own assertions.

<details><summary>Evidence</summary>

After the change, removing the arm fails on the assertion:

```
E       assert [] == ["Container '... not allowed"]
```

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: red on its own assertions without the arm, green with it.

</details>

### P3 2: The allowed-container and admin-tool job paths are only unit-tested (implementation verified)

The check now runs in `JobWrapper.prepare`, which every job on the release branch goes through. The disallowed case has an integration test. The two cases that must keep working are covered only by `test_job_wrapper_user_tool.py` on a mocked tool: a user tool with an allowed image, and an admin tool that declares an unlisted image. A broken `tool_type` gate would fail every admin tool that declares a container, and no end-to-end test would catch it.

Add two integration tests to `TestUserDefinedToolContainerAllowlist`:

- Run a user tool created with `quay.io/biocontainers/coreutils:9.5` and assert the job is `ok`.
- With `framework_tool_and_types = True`, run `job_environment_default_legacy`, which declares `busybox:1.36.1-glibc`, under the default list and assert the job is `ok`.

<details><summary>Evidence</summary>

With the `tool_type == "user_defined"` gate in `prepare` removed, the admin-tool test fails:

```
E               AssertionError: Final state - error - not okay.
```

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: both tests pass, and the admin-tool test is red without the gate.

</details>

### P3 3: The linter's `.strip()` hides whitespace that the parser and allowlist reject (implementation verified)

`ContainerImageShape.lint` strips the identifier before parsing, but neither `ContainerDescription` nor `parse_image_reference` strips. So `"quay.io/biocontainers/coreutils:9.5 "` passes lint and then fails at the allowlist as "Invalid container". Under `["*"]` the allowlist short-circuits, and the tool is stored with the trailing space. XML containers are already stripped by `xml_text`, so the strip only affects YAML and user tools.

Drop the strip so that whitespace becomes a lint error. The manager's "Invalid container" branch stays reachable: `oras://…` skips the shape lint but fails `parse_image_reference` with an unsupported scheme. Retarget `test_create_reports_malformed_container_as_invalid` to an `oras://` identifier, and add whitespace cases that expect the lint rejection.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the new whitespace lint and manager cases fail with the strip and pass without it.

</details>

### P3 4: Importing a workflow that embeds a disallowed user tool is untested (implementation verified)

Workflow-import copies go through `create_unprivileged_tool` (`WorkflowModule.resolve_tool_uuid`, `WorkflowsManager.copy_workflow_for_user`). This is the most user-visible fallout of the new default: importing a workflow that embeds a busybox tool now fails.

Add an integration test that posts such a workflow and asserts:

- a 400 carrying the allowlist message;
- no new workflow;
- no new user tool.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the test passes.

</details>

### P3 5: `biocontainer_tag_built` hardcodes the quay.io registry next to the existing constants (implementation verified)

`recommend.py` keeps `QUAY_BIOCONTAINERS_PREFIX = "quay.io/biocontainers"` and `BIOCONTAINERS_NAMESPACE`, but the rewritten check compares against a literal `reference.registry != "quay.io"`.

Add `QUAY_REGISTRY = "quay.io"`, derive `QUAY_BIOCONTAINERS_PREFIX` from it and `BIOCONTAINERS_NAMESPACE`, and use it in the check.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: implemented; `test_recommend.py` passes.

</details>

### P3 6: `ContainerAllowlist` has two attributes called "entries" with different meanings (implementation verified)

`self.entries` holds the raw strings, which only `describe()` uses. `self._entries` holds the parsed `_Entry` objects. Rename them to `raw_entries` and `_rules`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: implemented; `test_image_references.py` passes.

</details>
