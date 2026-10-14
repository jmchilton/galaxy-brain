# nightly_unit_tests

Status: `branches_implemented_needs_ci`. Base: `dev`. Pushed to `jmchilton/nightly_unit_tests`.

Unit tests run on Python 3.14 only for PRs and pushes. A nightly run on `dev` covers 3.10–3.14 and tracks failures in an issue, reusing the Selenium weekly reporter, which is now extracted into a `workflow_call`.

[Implementation debrief](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md) · [Reporter harness](report_harness.mjs)

## Origin — 2026-10-14

From a chat with Marius about CI speed: drop one per-PR unit Python version (about 30 min) and run every version nightly with tracking issues, as the weekly Selenium run does ([#24014](https://github.com/galaxyproject/galaxy/pull/24014)).

## Decisions

- **Keep 3.14 per-PR, not 3.10** (John, 2026-10-14). 3.10 is the slower job (about 30 min vs about 22), so this shortens PR wall-clock time. Too-new code is caught statically on 3.10: ruff 0.17.0 flags too-new syntax, and mypy on 3.10 in the lint matrix flags too-new stdlib attributes (both checked with probe files). Gap: a whole new stdlib module (`import tomllib`) passes mypy because of `ignore_missing_imports = True`. The 3.10 runtime suites (API/integration/etc.) and the nightly cover it.
- Release branches run the full 3.10–3.14 matrix on PRs and pushes (`758d072b3da`), because schedules only fire on `dev`. Existing release branches keep their own 3.10 + 3.14 `unit.yaml`, since merges flow release → dev, not back.
- First upstream PR run: confirm "Unit tests" on the fork PR doesn't hit `startup_failure`; see the [normal review](subagents/normal_review.md) #2.
- Reporter extracted into a reusable workflow. This is the second consumer the #24014 debrief named as the trigger.
