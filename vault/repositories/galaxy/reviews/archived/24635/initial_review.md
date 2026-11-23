# Initial review — #24635 (default profile)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Opus 5.5 (`claude-opus-5-5`), effort medium
- Reviewed commit: `64dad7223ea` (merge of `origin/release_26.2` into PR head `fa12a2252dc`; diff `origin/release_26.2...64dad7223ea`)
- CI: pending on the merge commit at review time. No tests run locally (the worktree has no `.venv`).

## Verdict

Solid and well scoped. I found no bugs that block merge. The new `image_references` parser is a real reusable abstraction: it is strictly part-wise, fails closed on anything it can't parse, and is already adopted by the linter and by `biocontainer_tag_built`. The creation-time and job-time enforcement points cover every creation path I traced:

- the API
- the tool editor
- `copy_workflow_for_user`
- workflow module import
- the agent operation

Tool class selection keys on `class: GalaxyUserTool`, so an unprivileged row always loads as `UserDefinedTool` and the job-time check can't be skipped. The conflict resolution against #24607 in the merge commit (`runners/__init__.py`, `managers/tools.py`) is correct.

The findings below are design and consistency points, all P3.

## Findings

### P3 1: The allowlist check and its error message are duplicated between the manager and the runner

`DynamicToolManager.ensure_container_allowed` (`lib/galaxy/managers/tools.py`) and the inline loop in `BaseJobRunner._find_container` (`lib/galaxy/jobs/runners/__init__.py`) each build the same "Container '…' is not allowed for user defined tools on this Galaxy server. Allowed containers: …" message. The runner also reaches into `dynamic_tool_manager.container_allowlist` directly.

A single method on `ContainerAllowlist` would keep the two enforcement points from drifting, and the runner would no longer depend on manager internals. For example, `ensure_allowed(identifier)` could raise a domain exception that carries the message and distinguishes "malformed" from "not allowed". Each caller then maps that exception to `RequestParameterInvalidException` or `ContainerNotAllowedError`. The re-parse in `ensure_container_allowed`, which exists only to tell those two cases apart, would also go away.

### P3 2: The container rejection is enforced and handled differently from the sibling role recheck (#24607)

#24607 rechecks the execute role in `JobWrapper.prepare` (`lib/galaxy/jobs/__init__.py:1351`). This PR puts the container check in `BaseJobRunner._find_container`, which adds:

- a new runner-level exception;
- a fourth entry in the `prepare_job` except-tuple;
- a dedicated `except ContainerNotAllowedError` branch in `PulsarJobRunner.__prepare_job`.

In Pulsar the two deterministic rejections now diverge:

- an `InsufficientPermissionsException` from `prepare()` goes through `fail_job` and can be resubmitted;
- a `ContainerNotAllowedError` deliberately bypasses `fail_job`.

The PR description argues that resubmitting a container refusal is pointless. The same argument applies to a role refusal.

Two options:

- Move the check next to the role recheck in `JobWrapper.prepare`, keyed on the tool being user-defined. This gives one enforcement point that every runner hits, including those that call `_find_container` outside `prepare_job`.
- Keep the placement, but introduce a shared "job rejected" base exception that both errors derive from. Both runners would then handle the base exception once, and the except-tuple would stop growing.

Either way, the role and container rejections would behave the same on Pulsar.

### P3 3: The linter's `.strip()` hides whitespace that the allowlist then rejects

`ContainerImageShape.lint` strips the identifier before parsing, which it already did before this PR. As a result, `"quay.io/biocontainers/coreutils:9.5 "` passes lint, and creation reaches the `Invalid container` re-parse branch in `ensure_container_allowed`. `test_create_reports_malformed_container_as_invalid` exists only for this path.

Neither `ContainerDescription` nor `parse_image_reference` strips, so the identifier carries its whitespace into resolution. Under `["*"]`, `allows()` short-circuits, so the tool is stored with the trailing space.

Dropping the strip in the linter would:

- make whitespace a lint error, consistent with the parser;
- make the extra branch and its test unnecessary;
- give the `"*"` configuration the same shape guarantee.

## Notes (not findings)

- **Release target.** The title and base are `[26.2]` / `release_26.2`, but the milestone is 27.0, the label is `kind/enhancement`, and the description says it is a breaking default change. This is a question for John about intended targeting, not a code issue.
- **Follow-up adopters of the parser.** `ContainerDescription.__init__` (`lib/galaxy/tool_util/deps/requirements.py:192-196`) lowercases the "name" half of a last-`:` split. For `name:tag@digest` that half is `name:tag@sha256`, so the tag gets lowercased. `identifier_to_cached_target` (`container_resolvers/mulled.py:302`) also splits on the last `:`. Neither is touched by this PR, but both are natural follow-up callers of `parse_image_reference`. The job-time check sees the lowercased identifier, which agrees with what the runtime pulls, so this doesn't create a bypass.
- **Tests.** Coverage is good and red-to-green as described. The integration test covers both creation and job-time rejection end to end. The mocked unit runner tests (`test/unit/app/jobs/test_user_defined_tool_container_allowlist.py`) mostly add value for the "resolved image differs from the declared one" case and for non-user-defined tools being unchecked. They are fine to keep.
- **Possible CI breaks I checked:**
  - `TestsTools` (the mixin the integration class inherits) defines only helpers.
  - The `MockApp`s that construct `DynamicToolManager` use `MockAppConfig`, which now sets the option.
  - The `ubuntu:latest` cases in `test_agents.py` exercise YAML generation only and never reach `create_unprivileged_tool`.
