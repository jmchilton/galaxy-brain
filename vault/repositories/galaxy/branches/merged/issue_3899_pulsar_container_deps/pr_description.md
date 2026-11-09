Fix 🎯 #3899 - Pulsar resolves (and can auto-install) tool dependencies on the host even when the job runs in a container that didn't ask for them.

On a local runner, a containerized job skips dependency resolution unless the container opts in (`resolve_dependencies`). Pulsar ignored that: under its default `dependency_resolution: remote` it always sent a dependencies description, so Pulsar resolved requirements and sourced their `env.sh` **on the host before `docker run`**. With `auto_install` on, that can mean installing conda environments for every containerized tool - work the container makes pointless.

***This only changes Pulsar jobs that actually run in a container that hasn't opted into dependency resolution. Host jobs, and containers with `resolve_dependencies` set, behave exactly as before.***

***Targeted at `release_26.2` as a bug fix: it aligns Pulsar with long-standing local-runner behavior. Admins who relied on host-side `env.sh` for such containers can set `resolve_dependencies` on the container.***

Now the Pulsar runner computes the effective `dependency_resolution` once it knows the job's container and downgrades it to `none` - with a debug log - when the container doesn't resolve dependencies. The "does this job need dependency resolution?" decision is now one predicate, `requires_dependency_resolution()` in `container_classes.py`, shared by `command_factory` (local path) and the Pulsar runner.

<details><summary>Implementation details</summary>

- Leading commit is behavior-neutral: extracts `requires_dependency_resolution()` (the inline `not container or container.resolve_dependencies` from `command_factory`) and swaps the Pulsar runner tests' `SimpleNamespace` container stub for a `MockContainer` dataclass.
- `__prepare_job` now finds the container *before* building the dependencies description, and returns that description, so `queue_job` no longer re-reads destination params for it.
- New module-level `effective_dependency_resolution(destination_params, container)` keeps the existing validation (unknown values still raise) ahead of the container downgrade.
- Unit tests: a parametrized decision table over mode × (no container / opted-out / opted-in) plus the invalid-value case.
- Integration test (`TestEmbeddedDockerPulsarRemoteDependencyResolution`, Docker + embedded Pulsar): a tool requirement whose `env.sh` writes a marker; the host-job case asserts it is sourced (so the test can't pass vacuously), the container-job case asserts it is not.

</details>

***Out of scope:*** containers that *do* opt in under `remote` resolution still get dependencies resolved on the Pulsar host outside `docker run`. That's unchanged by this PR and needs a Pulsar-side change to fix properly.

## Risks

Low, but it is a deployment-visible behavior change: a Pulsar destination that quietly relied on host-side `env.sh` for containerized jobs (without `resolve_dependencies`) will stop getting it.

<details><summary>Risk Details</summary>

- Pulsar container jobs without container opt-in no longer resolve or auto-install dependencies on the host; this matches long-standing local-runner semantics.
- Container lookup moves earlier in `__prepare_job`; a container-resolution error now surfaces before the dependencies description is built rather than after (still inside the same `try`).
- Opt-in containers + `remote` resolution are unchanged (still resolved on host).
- Targeted at `release_26.2` as a bug fix; easily reverted (two-way door in code, small config-semantics shift for admins).

</details>

<details><summary>Risk Review Advice</summary>

Check `effective_dependency_resolution` and the reordering in `__prepare_job`: the container passed in must be the one the job will really run in (`remote_container or container`). Admins relying on the old behavior can restore it per container with `resolve_dependencies`.

</details>

## Context

Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [John's Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All six items pass.</summary>

- [x] What does the user see when it fails? Nothing new: an unknown `dependency_resolution` still fails the job with the same error; a non-opted-in container job simply skips host-side resolution/auto-install (debug log "Ignoring dependency_resolution ...").
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Parametrized decision table plus a Docker integration test asserting an observable marker, with a host-job control.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. The predicate extraction and `MockContainer` lead, behavior-neutral.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_3899_pulsar_container_deps/pr_checklist/). Run via Claude Sonnet 5.5 at medium effort.

</details>

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep scope as implemented.</summary>

Closes #3899 with one shared predicate. Expansion to opted-in containers under `remote` resolution needs a cross-repo Pulsar change; a named result for `__prepare_job` would be unrelated refactor noise; no other runner makes its own dependency-resolution decision.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_3899_pulsar_container_deps/scope_evaluation/). Run via Opus 5.5 at high effort.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Predicate extraction and test stub hoisted into a behavior-neutral leading commit.</summary>

`requires_dependency_resolution()` (now used by `command_factory`) and the `MockContainer` dataclass land first; final tree is identical to the pre-split branch.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_3899_pulsar_container_deps/baseline_refactor/). Run via Opus 5.5 at high effort.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>All tests kept; no mocks to replace.</summary>

The unit decision table covers rows the integration test can't (`local` + container, opt-in, explicit `none`); the invalid-value test guards validation ordering. The integration test's host-job control keeps the container assertion from passing vacuously.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_3899_pulsar_container_deps/test_challenges_debrief/). Run via Opus 5.5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings.</summary>

Read-only Codex review of the runner, command factory, container classes and tests.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_3899_pulsar_container_deps/codex_review/). Run via gpt-6-sol at medium effort.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approve as-is.</summary>

One predicate, two consumers; replaces the old `__dependency_resolution` helper rather than adding a parallel one. Only smell: `__prepare_job`'s return tuple grows 5 → 6 (pre-existing pattern; follow-up candidate).

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_3899_pulsar_container_deps/thermo_nuclear_review/). Run via Opus 5.5 at high effort.

</details>

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
