# container_tool_env

Status: `branches_ready_for_final_review` — requested rebase pushed; 328 targeted regressions pass, fresh CI pending. Base: `release_26.2`. [PR #23815](https://github.com/galaxyproject/galaxy/pull/23815), head `e6fa5fa7fd970d9330bf03ab23b1924815b00a41`. PR is draft; human review hold remains.

Adds destination job/tool environment scopes and tool-declared container runtime variables.

[Polish](polish_debrief.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Tracking history](tracking_history.md)

## TICK — 2026-10-12

Live regular PR is mergeable at `eb3550da17e1b39edea82eb06ae956163d2df0b7`; all 60 checks have settled without failures. Remains ready from our side. No stale rebase or PR-setting change.

## Requested rebase — 2026-10-13

Rebased PR #23815 onto latest upstream `dev` at `63192fd64e46234a7a1aa933e44d8e0930112ccf`, changing the head from `eb3550da17e1b39edea82eb06ae956163d2df0b7` to `6ee44de1498dd3b203d30db3118a7e80c2d8c72b`. Resolved small additive conflicts in the client job-message union, generated API schema, job imports, and output checker by retaining both upstream's unknown-datatype messages and this branch's runtime-environment warnings. All 16 branch commits retained; range-diff reviewed and `git diff --check` passed.

Focused tests passed: **193 passed**, covering `test_environment.py`, `test_runtime_environment.py`, `test_output_checker.py`, and `test_tool_linters.py` (two existing Docutils deprecation warnings). Pushed only to the `jmchilton` fork with an explicit lease on the previous head. GitHub confirms the new head and `MERGEABLE`; the PR remains open and non-draft, with fresh CI results pending. Status remains `ready` with no known author-side work.

## Requested release rebase and CI fix — 2026-10-14

Rebased PR #23815 onto latest upstream `release_26.2` at `8b729ff0050c32573ad0fa999e5e1b4d015dca8c`. All 16 branch commits replayed without conflicts; range-diff confirms unchanged patches. Added commit `7f32c1664009f038e069e9e7cb6b66e784b8c36d` to alphabetize `runtime_environment_job_messages` before `unknown_datatype_job_message` in `lib/galaxy/jobs/__init__.py`, fixing the reported isort failure.

Validation: **193 passed** across job environment, tool runtime environment, output checker, and tool linter unit tests (two existing Docutils deprecation warnings). Isort passed for every Python file changed by the branch; Black passed for the edited file, and commit hooks passed Black, Ruff, Flake8, Prettier, and hygiene checks. `git diff --check` passed.

The previous Python 3.10 package failure was unrelated: `tests/objectstore/test_objectstore.py::test_distributed_store` randomly produced a 50/50 split and failed `assert 50 > 50`. This branch changes neither the object-store implementation nor that test. New-head CI will rerun it.

Pushed to the `jmchilton` fork with an explicit lease on previous head `6ee44de1498dd3b203d30db3118a7e80c2d8c72b`. GitHub confirms new head `7f32c1664009f038e069e9e7cb6b66e784b8c36d`, base `release_26.2`, and `MERGEABLE`; PR remains open and non-draft. Fresh CI is queued, with no known remaining author-side work.

## TICK — 2026-10-14

Head 7f32c1664009 is mergeable on release_26.2. All relevant checks pass; both package jobs fail mypy at unchanged galaxy/security/ssh_util.py:18 (untyped publickey call), unrelated to runtime environments. Failed jobs rerun; remains ready.


## Requested review fixes (items 2–8) — 2026-10-15

Addressed the review on PR #23815 in commit `75d878bdcf770222e973442a0c7919a13c72d862`, pushed to the `jmchilton` fork. Item 1 was explicitly excluded by John; the trust policy for installed tools is unchanged. Items 2–8 were reasonable to address; item 7 partly described missing tests for existing YAML parser safeguards.

- **2:** Tool loading warns and skips each invalid/reserved runtime declaration while retaining valid ones. XML/YAML authoring validation and linting remain strict.
- **3:** Replaced runner-name matching with `runs_job_script_in_container`, set on Kubernetes, AWS Batch, Google Cloud Batch, Chronos, GoDocker, and Pulsar coexecution (inherited by its Kubernetes/TES/GCP variants). Warnings run after actual plugin loading, only for enabled destinations, once per destination despite tag aliases.
- **4:** Required-variable checks run immediately before the tool in its actual execution environment, after dependency activation and inside wrapped containers. Runtime-specific values now satisfy declarations.
- **5:** Singularity forwarding exports run in a subshell so later metadata/runtime commands do not inherit them.
- **6:** Legacy scalar environment values are stringified when rendered, including raw YAML integers and booleans.
- **7:** Added strict/tolerant XML/YAML parser coverage, real XML/YAML tool loading, YAML user-tool rejection, defensive Tool.parse/linter user-tool checks, dependency activation, runtime-specific assignments, and later-command export isolation. Runtime tests execute generated commands through fake Docker/Singularity frontends; no actual containers were run locally.
- **8:** Reused the shared name regex, removed redundant Pulsar slicing and recovery copying, and made legacy YAML `env` consistently job-scoped even if an unsupported `type: tool` key is present. XML scoped entries retain their order.

Validation: **295 passed** across command factory, job environment/configuration, runtime environment, tool loading, tool linters, and output checker unit tests. Isort and `git diff --check` passed. Vault validation passed with zero errors (15 existing advisory warnings). Commit hooks passed Black, Ruff, Flake8 and hygiene checks; Prettier/trailing-whitespace were skipped per the existing polish note to avoid unrelated admin-doc formatting changes.

GitHub confirms head `75d878bdcf7`, base `release_26.2`, open/non-draft and `MERGEABLE`; fresh CI has 43 pending checks and no failures at this snapshot. PR description and its local copy now reflect the changes. The human-read checkbox is cleared because the fixes add tests/comments. Moved back to final review under the standing SHA-pinned approval rule; prior human approval does not cover this implementation change.

## TICK — 2026-10-15

New-head CI has relevant type failures in `lib/galaxy/tool_util/parser/xml.py:441`, `test/unit/tool_util/test_runtime_environment.py:248` and `test/unit/app/jobs/test_command_factory.py:331,388`. These overlap the environment-scope change and are not unrelated SSH typing failures. Keep `branches_ready_for_final_review` under the existing human-review hold, with this new CI blocker recorded.

## Related CI fixes — 2026-10-15

Fixed the reported branch-related mypy errors in `86aea32fe7ec7f4170ccf13fd0b37bd92c87ed43` and pushed normally to jmchilton. [Diagnosis, unrelated-red boundary and verification](ci_type_fixes_2026-10-15.md). Full pinned-dependency mypy passes (2523 files), 295 regressions pass, and commit hooks pass. Unchanged expression-test import ordering is the only diagnosed unrelated failure in the linked lint job. GitHub confirms the new head and mergeability; fresh CI is pending. Track in `branches_ready_for_final_review` under the changed-SHA rule; preserve non-draft state and require a fresh human read.

## Requested rebase and change explanation — 2026-10-16

John requested rebasing #23815 and a readable explanation of all changes since “Fix job output checker import ordering” (`7f32c166400`). Fetched the fork first, preserving Marius's two commits merged through fork PR #88. Rebased from `bcaed07c4dcfd3e23499a5a61138493cda223e7e` onto `release_26.2` at `579ca73440d776002b7099538cef000838687d8e`; new head `e6fa5fa7fd970d9330bf03ab23b1924815b00a41`, pushed with an exact force-with-lease.

Only conflict: additive tests at the end of `test_runner_output_collection.py`. Retained both upstream remote tool-evaluation error coverage and Marius's declared-variable warning test. Range-diff preserves all 21 substantive commits; only that additive test context differs. The fork PR merge commit is flattened by the rebase; both authored commits remain.

Validation: **328 passed** across command factory, destination environment/configuration, job-finish/output collection, XML/YAML tool loading, runtime environments, output checker and tool linters. Isort, Black and whitespace checks pass for the reconciled file. Used the existing main Galaxy virtualenv because this worktree's pre-existing `.venv` symlink points to a removed worktree. Tests use fake Docker/Singularity frontends, not real containers; fresh CI remains pending.

Reviewed changes after the named checkpoint: John's `75d878bdcf7` makes tool loading tolerant per declaration, detects container-native runners by capability after plugin load, checks required names in the actual tool environment, isolates Singularity forwarding, preserves legacy YAML behavior, adds regression coverage and removes redundant copies. John's `86aea32fe7e` fixes static typing without changing behavior. Marius's `bec2fabc299` fixes writable warning paths and Pulsar staging, makes warning checks nonfatal, filters messages to declared required names throughout job/task/metadata paths, bounds and validates warning-file reads, and documents destination-wide `tool_env` access. Marius's `13a962266d9` strengthens file identity/symlink handling on platforms without `O_NOFOLLOW` and adds job-finish/size-limit regressions. Existing installed-tool trust policy is unchanged; no new design decision was made during this rebase.
