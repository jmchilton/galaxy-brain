These range from fair but minor to just outright nits - sorry. -John

Thanks for addressing the earlier finding in 9ee89b52d9 - moving the allowlist check into `JobWrapper.prepare` resolves it. This round re-reviews the updated PR.

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

<!-- gx_risk_assessment via Opus 5.5 (claude-opus-5-5) at low effort; reviewed commit 9ee89b52d9 (delta from 64dad7223ea) -->
The new commit lowers the risk a little and changes no contract. The container check moves out of command building into `JobWrapper.prepare`, next to the execution-role recheck, and raises `InsufficientPermissionsException` instead of a runner-private error. The option name, entry grammar and restrictive default, which are the one-way-door concerns from the last round, are unchanged.

<details><summary>Risk Details</summary>

- The check now runs once per job in `prepare`, before the command line is built. It covers every runner that prepares through `BaseJobRunner.prepare_job` or Pulsar's `job_wrapper.prepare`, so there is no longer a runner-specific error to catch. This removes the risk of a runner path that builds commands without catching `ContainerNotAllowedError`.
- The behavior change: on Pulsar, an `InsufficientPermissionsException` raised at prepare time now fails the job directly through `job_wrapper.fail` and skips `fail_job` resubmission rules. This also applies to the owner-role recheck from #24607. Before, a revoked role on Pulsar went through `fail_job` and could be resubmitted. Admins who rely on resubmission for those failures would see a change, but resubmitting would fail the same way, so the impact is small. Pulsar now matches the base runner's handling.
- Pulsar's `ParameterValueError` still goes through `fail_job` (only its log message changed), so on Pulsar the two "rejected while preparing" exceptions are now handled differently.
- The integration test `test_user_defined_tool_container_allowlist.py` (77 lines) was removed and replaced by unit tests in `test_job_wrapper_user_tool.py` and `test_pulsar_runner.py`. End-to-end coverage that a disallowed container fails a real job is now thinner on a release branch.
- It still checks declared containers, not resolved ones, and still only for `tool_type == "user_defined"`. This is unchanged.

</details>

<details><summary>Risk Review Advice</summary>

Confirm that skipping resubmission for prepare-time permission failures on Pulsar, including #24607's role recheck, is intended and acceptable for release_26.2. Decide whether losing the integration test is acceptable or whether one job-level test should stay. The release-target and default-restrictiveness questions from round 0 remain open.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24635_review_1) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24635_review_1`](https://github.com/jmchilton/galaxy/tree/pr_24635_review_1) starts from the reviewed commit `9ee89b52d9`. It moves Pulsar's remote container resolution after `prepare()`, so a rejected job is failed before its container is resolved. It also lets `ContainerAllowlist` own the rejection message that the manager and `JobWrapper.prepare` share. It ports the still-valid round-0 fixes: clearer allowlist attribute names, one biocontainers registry constant, no whitespace stripping in the linter, and a shared stored-tool-row helper. On the test side, the Pulsar rejection unit test now covers `remote_container_handling` and fails on its own assertions. An embedded-Pulsar integration test with an `any_failure` resubmit rule proves the job is rejected without resubmission. Other integration tests cover workflow import of a disallowed user tool, and jobs of an allowed user tool and of an admin tool that declares an unlisted image. Round-0 [`ededf3cc033`](https://github.com/jmchilton/galaxy/commit/ededf3cc033) was ported without its edit to the deleted unit file, and [`c8239cf7070`](https://github.com/jmchilton/galaxy/commit/c8239cf7070) was rewritten around the resubmit rule.

- [`985676468c1`](https://github.com/jmchilton/galaxy/commit/985676468c1) Share container allowlist rejection message between manager and job prepare: adds `ContainerAllowlist.rejection()`, which the manager and `JobWrapper.prepare` both raise from, with a unit test of both messages.
- [`425d71f5f77`](https://github.com/jmchilton/galaxy/commit/425d71f5f77) Distinguish raw and parsed container allowlist entries by name: renames them to `raw_entries` and `_rules`.
- [`0c1bd167de4`](https://github.com/jmchilton/galaxy/commit/0c1bd167de4) Define the biocontainers registry location once in recommend: adds `QUAY_REGISTRY` and derives `QUAY_BIOCONTAINERS_PREFIX` from it.
- [`3e52ad9d65a`](https://github.com/jmchilton/galaxy/commit/3e52ad9d65a) Lint container identifiers without stripping whitespace: retargets the malformed-container manager test to `oras://` and adds whitespace lint and manager cases.
- [`5ee898d96c0`](https://github.com/jmchilton/galaxy/commit/5ee898d96c0) Share stored user tool row helper between integration tests: adds `integration_util.store_user_tool_row`, used by both user-tool integration files.
- [`15893a1b554`](https://github.com/jmchilton/galaxy/commit/15893a1b554) Resolve Pulsar remote container only after prepare accepts the job: moves the `remote_container_handling` `_find_container` call below `prepare()` and restores that setting in the unit test, with a `_find_container` that fails if called.
- [`698c1a812f8`](https://github.com/jmchilton/galaxy/commit/698c1a812f8) Let the Pulsar rejection unit test fail on its assertions: gives the fake wrapper `get_job` and stubs `_job_state`, so the test fails on its own assertions without the arm.
- [`df7bea10f5f`](https://github.com/jmchilton/galaxy/commit/df7bea10f5f) Test Pulsar rejects a disallowed user tool container without resubmission: adds an embedded-Pulsar variant of the stored-tool job test, with an `any_failure` resubmit rule, and asserts the job's `destination_id` is unchanged.
- [`77ffc7e551d`](https://github.com/jmchilton/galaxy/commit/77ffc7e551d) Test workflow import of a user tool with a disallowed container: asserts a 400 with the allowlist message, and that no workflow or user tool is created.
- [`c3714e1718c`](https://github.com/jmchilton/galaxy/commit/c3714e1718c) Cover allowed and admin-tool container job paths with integration tests: runs an allowed user tool and `job_environment_default_legacy` (busybox) under the default list and asserts both are `ok`.

</details>

</details>

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

Fixed on the review branch in [`15893a1b554`](https://github.com/jmchilton/galaxy/commit/15893a1b554).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the restored unit test is red with the old ordering and green with the move.

</details>

### P2 2: The allowlist rejection message is duplicated in the manager and `JobWrapper.prepare` (implementation verified)

`DynamicToolManager.ensure_container_allowed` (`lib/galaxy/managers/tools.py`) and the new loop in `MinimalJobWrapper.prepare` (`lib/galaxy/jobs/__init__.py`) each build the same "Container '…' is not allowed for user defined tools on this Galaxy server. Allowed containers: …" message, so the two enforcement points can drift. `ContainerAllowlist.allows() -> bool` collapses "malformed" and "not listed" into `False`, which is why the manager parses the reference a second time to tell them apart. Moving the check into `prepare` resolved the placement concern from the earlier round, but the duplication moved with it.

Let `ContainerAllowlist` own the decision and the message. A `rejection(identifier) -> str | None` returns `None` when the identifier is allowed, `"Invalid container: …"` when it is malformed, and the not-allowed message otherwise. The manager raises `RequestParameterInvalidException(rejection)`, `prepare` raises `InsufficientPermissionsException(rejection)`, and `allows()` becomes `rejection(...) is None`. A malformed identifier on a stored tool now fails its job with "Invalid container: …" rather than "not allowed".

Fixed on the review branch in [`985676468c1`](https://github.com/jmchilton/galaxy/commit/985676468c1).

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

Fixed on the review branch in [`df7bea10f5f`](https://github.com/jmchilton/galaxy/commit/df7bea10f5f).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: red without the Pulsar arm, green with it.

</details>

### P2 4: `_store_tool_row` is copy-pasted between integration test files (implementation verified)

`test/integration/test_user_defined_tool_container_allowlist.py::_store_tool_row` is a verbatim copy of the one in `test/integration/test_user_defined_tool_loading.py`. The Pulsar variant from P2 3 adds another user of it.

Extract one `store_user_tool_row(app, user_id, representation)` into `galaxy_test/driver/integration_util.py` and use it from both files.

Fixed on the review branch in [`5ee898d96c0`](https://github.com/jmchilton/galaxy/commit/5ee898d96c0).

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

Fixed on the review branch in [`698c1a812f8`](https://github.com/jmchilton/galaxy/commit/698c1a812f8).

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

Fixed on the review branch in [`c3714e1718c`](https://github.com/jmchilton/galaxy/commit/c3714e1718c).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: both tests pass, and the admin-tool test is red without the gate.

</details>

### P3 3: The linter's `.strip()` hides whitespace that the parser and allowlist reject (implementation verified)

`ContainerImageShape.lint` strips the identifier before parsing, but neither `ContainerDescription` nor `parse_image_reference` strips. So `"quay.io/biocontainers/coreutils:9.5 "` passes lint and then fails at the allowlist as "Invalid container". Under `["*"]` the allowlist short-circuits, and the tool is stored with the trailing space. XML containers are already stripped by `xml_text`, so the strip only affects YAML and user tools.

Drop the strip so that whitespace becomes a lint error. The manager's "Invalid container" branch stays reachable: `oras://…` skips the shape lint but fails `parse_image_reference` with an unsupported scheme. Retarget `test_create_reports_malformed_container_as_invalid` to an `oras://` identifier, and add whitespace cases that expect the lint rejection.

Fixed on the review branch in [`3e52ad9d65a`](https://github.com/jmchilton/galaxy/commit/3e52ad9d65a).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the new whitespace lint and manager cases fail with the strip and pass without it.

</details>

### P3 4: Importing a workflow that embeds a disallowed user tool is untested (implementation verified)

Workflow-import copies go through `create_unprivileged_tool` (`WorkflowModule.resolve_tool_uuid`, `WorkflowsManager.copy_workflow_for_user`). This is the most user-visible fallout of the new default: importing a workflow that embeds a busybox tool now fails.

Add an integration test that posts such a workflow and asserts:

- a 400 carrying the allowlist message;
- no new workflow;
- no new user tool.

Fixed on the review branch in [`77ffc7e551d`](https://github.com/jmchilton/galaxy/commit/77ffc7e551d).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the test passes.

</details>

### P3 5: `biocontainer_tag_built` hardcodes the quay.io registry next to the existing constants (implementation verified)

`recommend.py` keeps `QUAY_BIOCONTAINERS_PREFIX = "quay.io/biocontainers"` and `BIOCONTAINERS_NAMESPACE`, but the rewritten check compares against a literal `reference.registry != "quay.io"`.

Add `QUAY_REGISTRY = "quay.io"`, derive `QUAY_BIOCONTAINERS_PREFIX` from it and `BIOCONTAINERS_NAMESPACE`, and use it in the check.

Fixed on the review branch in [`0c1bd167de4`](https://github.com/jmchilton/galaxy/commit/0c1bd167de4).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: implemented; `test_recommend.py` passes.

</details>

### P3 6: `ContainerAllowlist` has two attributes called "entries" with different meanings (implementation verified)

`self.entries` holds the raw strings, which only `describe()` uses. `self._entries` holds the parsed `_Entry` objects. Rename them to `raw_entries` and `_rules`.

Fixed on the review branch in [`425d71f5f77`](https://github.com/jmchilton/galaxy/commit/425d71f5f77).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: implemented; `test_image_references.py` passes.

</details>

<details><summary>Suggested Follow-Up Refactoring for dev</summary>

Here's draft text for a follow-up issue covering refactorings this review recommends that don't fit this PR or its target branch. When creating the issue, feel free to assign John (jmchilton).

````markdown
# Follow-up: adopt `image_references` across container code

#24635 added `galaxy.tool_util.deps.image_references` to `release_26.2`. It provides a Docker-CLI-compatible image reference parser and `ContainerAllowlist`. Several places still split image references by hand on the last `:`. That breaks on registry ports and digests, which is the bug the PR fixed in `biocontainer_tag_built`.

## Migrate ad-hoc image parsing to `parse_image_reference`

Candidates (check each one, since some handle Singularity paths or mulled hashes rather than Docker references):

- `lib/galaxy/tool_util/deps/container_resolvers/mulled.py` `identifier_to_cached_target` (`identifier.rsplit(":", 1)`)
- `lib/galaxy/tool_util/deps/container_resolvers/mulled.py` `_version_sorted_per_image_name` (`name.rsplit(":", 1)[0]`)
- `lib/galaxy/tool_util/deps/mulled/mulled_build.py` tag-suffix helper (`rfind(":")` / `rsplit(":", 1)`)
- `lib/galaxy/tool_util/deps/mulled/mulled_search.py` (`container.split(":")`)
- `lib/galaxy/tool_util/deps/requirements.py` `ContainerDescription` lowercasing (`rsplit(":", 1)`, which lowercases the tag of a `name:tag@digest` reference; it also handles filesystem paths, so it may need to stay separate)

Add a `str()`/`format` round-trip on `ImageReference` if callers need to rebuild a reference.

## Tests

`test_image_references.py` covers the parser and `ContainerAllowlist`. For each migrated caller, add parser cases for its inputs (port, digest, cached Singularity path), red first.
````

</details>
