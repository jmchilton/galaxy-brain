# Planemo Pyrefly implementation — 2026-10-06

Requested equivalent of [Pulsar #539](https://github.com/galaxyproject/pulsar/pull/539): run Pyrefly alongside mypy and fix the reported typing problems.

- Branch: [jmchilton/planemo:pyrefly](https://github.com/jmchilton/planemo/tree/pyrefly)
- Commit: [e29cb517](https://github.com/jmchilton/planemo/commit/e29cb51754e92267284d03ad6c4a831ae35a0bb9)
- Worktree: `/Users/jxc755/projects/worktrees/planemo/branch/pyrefly`
- Stacked on [Planemo #1733](https://github.com/galaxyproject/planemo/pull/1733), specifically `92359c14` (full CI matrix uses the locked runtime).

## Implementation

Pinned `mypy==2.4.0` and `pyrefly==1.3.2` in the shared `typecheck` dependency group, with explicit stub dependencies. Removed mypy's automatic stub installation so CI consumes locked packages. Both checkers now install Planemo and its runtime dependencies. Added Pyrefly tox environments and locked CI jobs for Python 3.10 and 3.13.

Migrated `pyrefly.toml` from the existing mypy policy: legacy preset, test-fixture exclusion, and ignored missing imports. Configuration comments and developer documentation explain how to keep the policies aligned. The lock diff adds only checker/stub dependencies; existing runtime pins are unchanged.

Fixed narrow typing problems in collection arguments, engine signatures, AST narrowing, optional invocation state, path coercion, and workflow lint callbacks. Replaced deprecated Click `MultiCommand` with `Group`. Constructed tool responses directly in the tool branch rather than through a union of response classes. Removed the obsolete misspelled Galaxy staging import fallback; the declared Galaxy dependency minimum already provides `StagingInterface`. Added guards for missing Galaxy URL/port and absent tool versions during version linting.

Two documented, local `invalid-inheritance` suppressions remain on Rich `Live` subclasses. A minimal independent probe reproduces the Pyrefly 1.3.2 diagnostic; this is not a blanket suppression of type errors.

## Validation and review

- Locked Python 3.10 and 3.13 tox environments pass for **both mypy and Pyrefly**, with runtime dependencies installed.
- Locked Python 3.13 quick suite: **499 passed, 103 skipped, 1 deselected**. Slow/Galaxy tests use the existing quick-suite skips; the unavailable local Docker profile test was explicitly excluded.
- Four focused tests cover the missing URL/port guard, absent-version lint behavior, completed tool-response construction, and workflow invocation response construction. The two guard tests fail against the baseline and pass with the implementation.
- Locked lint tox environment passes flake8, Black, isort, and Ruff. An initial lint failure came from a temporary diagnostic probe in the scratch checkout; moving the probe outside that checkout resolves it.
- `uv lock --check`, documentation RST parsing, and `git diff --check` pass. Zizmor reports no findings in the modified CI workflow.
- Independent subagent review found no introduced correctness issues and confirmed the dependency floor, checker policy, runtime-preserving refactors, and Rich diagnostic reproducer.

The branch is committed and pushed. No new PR was created; this is a separate follow-up branch to #1733.
