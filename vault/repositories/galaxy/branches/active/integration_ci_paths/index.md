# integration_ci_paths

Status: `branches_implemented_needs_ci`. Base: `dev`. Fork: `jmchilton/integration_ci_paths`.

Skips the Integration workflow when a PR only changes test suites that run in other workflows (unit, API, Selenium, workflow framework). Companion to `integration_ci_scope`; independent of it.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Thermo-nuclear](thermo_nuclear_review.md) · [Codex](codex_review.md)

## Decisions

- John asked for this branch on 2026-10-14 after the CI timing analysis recorded in the [initial debrief](initial_implementation_debrief.md).
- First version allowlisted the 6 `lib/galaxy_test/api` modules integration tests imported (no measured CI difference vs refactoring). John then asked for the refactor so the include/exclude list is robust: shared code moved to `galaxy_test.base`, allowlist removed.
- Open: whether to add an enforced import guard (see implementation debrief).
- `lib/galaxy/navigation/` stays on the trigger list: `lib/galaxy/tours` imports it at runtime.
