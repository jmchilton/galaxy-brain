# container_tool_env

Status: `ready`. Base: `release_26.2`. [PR #23815](https://github.com/galaxyproject/galaxy/pull/23815) (open).

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
