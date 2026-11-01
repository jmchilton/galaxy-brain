(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Opus 5.5 at medium effort.
- Review profile [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Opus 5.5 at low effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_reviews/reviewers/learning_galaxy.md) was run via Opus 5.5 at medium effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

<!-- gx_risk_assessment via Opus 5.5 (claude-opus-5-5) at low effort; reviewed commit 64dad7223ea -->
This is a one-way door for admins and tool authors. It adds a new admin config option, `user_defined_tool_allowed_containers`, whose name, matching rules and restrictive default (`quay.io/biocontainers/*`) become a contract on a release branch. It also stops existing user-defined tools with other images from being created or run.

<details><summary>Risk Details</summary>

- It targets `release_26.2` with a breaking default. User-defined tools that use busybox, python, ubuntu and similar images fail at creation and at job time until an admin lists their images. This includes tools already saved and workflows that reference them.
- Once released, the option name, the entry grammar (`ns/*`, bare image, `:tag`, `@digest`, lone `*`, empty list = none, null = default) and the rule that a tag entry never matches a reference with a digest are hard to change without breaking admin configs again.
- Canonicalization (dropping `docker://`, implicit `docker.io/library/`, host aliases) now decides what is allowed. A bug here could let an image through or block a legitimate one. Podman's unqualified-search-registries can resolve a name to a different registry than the one checked (documented, not enforced).
- The job-time check runs only for `tool_type == "user_defined"` and checks declared containers, not resolved ones. Admin container resolvers that map images are trusted.
- A malformed entry now stops Galaxy from starting (`ConfigurationError` raised in the `DynamicToolManager` constructor).
- The new shared parser `image_references.py` replaces last-`:` splitting in the shape linter and in `biocontainer_tag_built`. The linter now accepts digest and registry-port references it used to reject, so lint results change for all tools, not just user-defined ones.
- The default tool examples in the MCP and agent prompts change to biocontainers images, which changes what LLM agents generate.
- On Pulsar a refused job fails directly and skips resubmission rules, unlike other preparation failures.
- Test infrastructure (driver, BioBlend CI) sets `*`, so CI does not exercise the restrictive default except in the dedicated tests.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether a breaking, default-restrictive allowlist belongs in a 26.2 point release or should land default-open there and become restrictive in 27.0. The PR milestone is already 27.0, and the feature is beta and not on usegalaxy.org. They should also agree on the option name and entry grammar now, because admin configs will depend on them.

On the code side, look closely at `image_references.py` canonicalization and the tag-vs-digest matching, since this is the security boundary. Confirm that every creation path goes through `create_unprivileged_tool` and that both Pulsar container paths call `_find_container`. Also check that the linter change (it now accepts more references) is acceptable for non-user-defined tools on a release branch.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24635_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24635_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24635_review_0) starts from the reviewed commit `64dad7223ea`. It moves the allowlist's rejection message into `ContainerAllowlist`, so the manager and the job runner share one message and the manager no longer parses twice. It also tidies the allowlist's attribute names and the biocontainers constants. The linter now rejects whitespace-padded identifiers instead of hiding them. On the test side, the branch replaces two of the three mocked `BaseJobRunner` unit cases with integration tests and adds a Pulsar integration test that is red without the PR's Pulsar arm. It also tests workflow import of a disallowed user tool and shares one stored-tool-row helper between the integration files.

- [`c76b1bc6386`](https://github.com/jmchilton/galaxy/commit/c76b1bc6386) Share container allowlist rejection message between manager and runner: adds `ContainerAllowlist.rejection()`, which both callers raise from, with a unit test of both messages.
- [`7978ee18a5a`](https://github.com/jmchilton/galaxy/commit/7978ee18a5a) Distinguish raw and parsed container allowlist entries by name: renames them to `raw_entries` and `_rules`.
- [`6d9f69ff3ab`](https://github.com/jmchilton/galaxy/commit/6d9f69ff3ab) Define the biocontainers registry location once in recommend: adds `QUAY_REGISTRY` and derives `QUAY_BIOCONTAINERS_PREFIX` from it.
- [`1ae29de788a`](https://github.com/jmchilton/galaxy/commit/1ae29de788a) Lint container identifiers without stripping whitespace: retargets the malformed-container manager test to `oras://` and adds whitespace lint and manager cases.
- [`c370acf590f`](https://github.com/jmchilton/galaxy/commit/c370acf590f) Share stored user tool row helper between integration tests: adds `integration_util.store_user_tool_row`, used by both user-tool integration files.
- [`ededf3cc033`](https://github.com/jmchilton/galaxy/commit/ededf3cc033) Cover user tool container job checks with integration tests: adds an allowed-container run and an admin-tool-not-checked run, and trims `test/unit/app/jobs/test_user_defined_tool_container_allowlist.py` to its resolver-mapping case.
- [`c8239cf7070`](https://github.com/jmchilton/galaxy/commit/c8239cf7070) Test the Pulsar refusal of a disallowed user tool container end to end: adds a shared base class and an embedded-Pulsar variant of the disallowed-job test.
- [`ceacd52eba8`](https://github.com/jmchilton/galaxy/commit/ceacd52eba8) Test workflow import of a user tool with a disallowed container: asserts a 400 with the allowlist message, with no workflow or user tool created.

</details>

</details>

### P2 1: The allowlist check and its rejection message are duplicated in the manager and the runner (implementation verified)

`DynamicToolManager.ensure_container_allowed` (`lib/galaxy/managers/tools.py`) and the inline loop in `BaseJobRunner._find_container` (`lib/galaxy/jobs/runners/__init__.py`) each build the same "Container '…' is not allowed for user defined tools on this Galaxy server. Allowed containers: …" message, so the two enforcement points can drift. The runner also reaches into `dynamic_tool_manager.container_allowlist` directly. `allows() -> bool` collapses "malformed" and "not listed" into `False`, which is why the manager parses the reference a second time to tell them apart.

Let `ContainerAllowlist` own the decision and the message: a `rejection(identifier) -> str | None` returns `None` when allowed, `"Invalid container: …"` when malformed, or the not-allowed message. The manager raises `RequestParameterInvalidException(rejection)` and the runner raises `ContainerNotAllowedError(rejection)`. `allows()` becomes `rejection(...) is None`. One runner-side exception type still covers both the malformed and disallowed cases, so the existing except-tuple and the Pulsar arm keep catching everything. The `"*"` short-circuit is preserved. Whether the call site should leave `_find_container` entirely is covered by P3 1 and the follow-up issue.

Fixed on the review branch in [`c76b1bc6386`](https://github.com/jmchilton/galaxy/commit/c76b1bc6386).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md), [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md), and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: implemented on the review branch with a unit test for both messages; the unit and integration tests for the manager and the job paths pass.

</details>

### P2 2: The job-time guard is tested through heavy mocks that integration tests can replace (implementation verified)

`test/unit/app/jobs/test_user_defined_tool_container_allowlist.py` builds a `BaseJobRunner` with `__new__`, fakes `app`, `job_wrapper` and `tool` with `SimpleNamespace`, and monkeypatches `get_disk_paths`, all to test a six-line `tool_type == "user_defined"` branch. `test_job_of_stored_tool_with_disallowed_container_fails` already covers the disallowed case end to end. The other two cases are cheap to add to the new integration class.

Add two integration tests to `TestUserDefinedToolContainerAllowlist`:

- Run a user tool created with `quay.io/biocontainers/coreutils:9.5` and assert the job is `ok`.
- With `framework_tool_and_types = True`, run `job_environment_default_legacy`, which declares `busybox:1.36.1-glibc`, under the default list and assert the job is `ok`.

Then cut the unit file down to one case: an allowed declared image whose container resolver returns something else. That case pins checking the declared image rather than the resolved one, and integration tests without docker can't exercise it.

Fixed on the review branch in [`ededf3cc033`](https://github.com/jmchilton/galaxy/commit/ededf3cc033).

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

Fixed on the review branch in [`c8239cf7070`](https://github.com/jmchilton/galaxy/commit/c8239cf7070).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: red without the Pulsar arm, green with it.

</details>

### P2 4: `_store_tool_row` is copy-pasted between integration test files (implementation verified)

`test/integration/test_user_defined_tool_container_allowlist.py::_store_tool_row` is a verbatim copy of the one in `test/integration/test_user_defined_tool_loading.py`, and the Pulsar variant from P2 3 adds another user of it.

Extract one `store_user_tool_row(app, user_id, representation)` into `galaxy_test/driver/integration_util.py` and use it from both files.

Fixed on the review branch in [`c370acf590f`](https://github.com/jmchilton/galaxy/commit/c370acf590f).

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

Fixed on the review branch in [`1ae29de788a`](https://github.com/jmchilton/galaxy/commit/1ae29de788a).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the new whitespace lint and manager cases fail with the strip and pass without it.

</details>

### P3 3: Importing a workflow that embeds a disallowed user tool is untested (implementation verified)

Workflow-import copies go through `create_unprivileged_tool` (`WorkflowModule.resolve_tool_uuid`, `WorkflowsManager.copy_workflow_for_user`). That is the most user-visible fallout of the new default: importing a workflow that embeds a busybox tool now fails.

Add an integration test that posts such a workflow and asserts:

- a 400 carrying the allowlist message;
- no new workflow;
- no new user tool.

Fixed on the review branch in [`ceacd52eba8`](https://github.com/jmchilton/galaxy/commit/ceacd52eba8).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the test passes.

</details>

### P3 4: `biocontainer_tag_built` hardcodes the quay.io registry next to the existing constants (implementation verified)

`recommend.py` keeps `QUAY_BIOCONTAINERS_PREFIX = "quay.io/biocontainers"` and `BIOCONTAINERS_NAMESPACE`, but the rewritten check compares against a literal `reference.registry != "quay.io"`.

Add `QUAY_REGISTRY = "quay.io"`, derive `QUAY_BIOCONTAINERS_PREFIX` from it and `BIOCONTAINERS_NAMESPACE`, and use it in the check.

Fixed on the review branch in [`6d9f69ff3ab`](https://github.com/jmchilton/galaxy/commit/6d9f69ff3ab).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: implemented; `test_recommend.py` passes.

</details>

### P3 5: `ContainerAllowlist` has two attributes called "entries" with different meanings (implementation verified)

`self.entries` holds the raw strings, which only `describe()` uses, and `self._entries` holds the parsed `_Entry` objects. Rename them to `raw_entries` and `_rules`.

Fixed on the review branch in [`7978ee18a5a`](https://github.com/jmchilton/galaxy/commit/7978ee18a5a).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: implemented; `test_image_references.py` passes.

</details>

<details><summary>Suggested Follow-Up Refactoring for dev</summary>

Here's draft text for a follow-up issue covering refactorings this review recommends that don't fit this PR or its target branch. When creating the issue, feel free to assign John (jmchilton).

````markdown
# Follow-up: adopt `image_references` across container code; one enforcement point for user-tool rejections

#24635 added `galaxy.tool_util.deps.image_references` (a Docker-CLI-compatible image reference parser and `ContainerAllowlist`) to `release_26.2`. Several places still split image references by hand on the last `:`. That breaks on registry ports and digests, which is the bug the PR fixed in `biocontainer_tag_built`.

## 1. Migrate ad-hoc image parsing to `parse_image_reference`

Candidates (check each one, since some handle Singularity paths rather than Docker refs):

- `lib/galaxy/tool_util/deps/container_resolvers/mulled.py` `identifier_to_cached_target` (`identifier.rsplit(":", 1)`)
- `lib/galaxy/tool_util/deps/container_resolvers/mulled.py` `_version_sorted_per_image_name` (`name.rsplit(":", 1)[0]`)
- `lib/galaxy/tool_util/deps/mulled/mulled_build.py` tag-suffix helper (`rfind("/")`/`rfind(":")`)
- `lib/galaxy/tool_util/deps/mulled/mulled_search.py` (`container.split(":")`)
- `lib/galaxy/tool_util/deps/requirements.py` `ContainerDescription` lowercasing (`rsplit(":", 1)`, which lowercases the tag of a `name:tag@digest` reference; it also handles filesystem paths, so it may need to stay separate)

Add a `str()`/`format` round-trip on `ImageReference` if callers need to rebuild a reference.

## 2. One runner-agnostic enforcement point for user-defined tool rejections

The job-time allowlist check is inside `BaseJobRunner._find_container`. That helper has about 8 call sites across runners. Rejections from it need a fourth entry in the `prepare_job` except-tuple and a bespoke `except ContainerNotAllowedError` arm in `PulsarJobRunner.__prepare_job`.

The sibling execute-role recheck (#24607) lives in `JobWrapper.prepare` and is handled differently on Pulsar: it goes through `fail_job`, so it can be resubmitted, while the container refusal bypasses it. Both are deterministic rejections of a user-defined tool.

Move the container check next to the role recheck in `JobWrapper.prepare`, for example as a `DynamicToolManager.ensure_tool_containers_allowed(tool)` that raises from `ContainerAllowlist.rejection()`. Alternatively, derive both errors from one "job rejected" exception. Then handle that once per runner, with the same no-resubmit semantics for both, and drop the per-runner arms.

## Tests

`test_image_references.py` covers the parser and `ContainerAllowlist.rejection()`. `test/integration/test_user_defined_tool_container_allowlist.py` covers creation, job-time rejection on the local runner and on embedded Pulsar, and workflow import. For section 1, add parser cases for each migrated caller's inputs (port, digest, cached Singularity path), red first. For section 2, add an embedded-Pulsar case for a role revoked after queueing, asserting the same failure handling as the container refusal.
````

</details>
