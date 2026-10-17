# issue_24200_workflow_input_validators

Status: implementation in progress (2026-10-16).

Keeps workflow parameter input validators as declared through import, export, run and editor re-save; rejects invalid ones (incl. `min > max`) at import with a 400 ([#24200](https://github.com/galaxyproject/galaxy/issues/24200)).

Worktree: `~/projects/worktrees/galaxy/branch/issue_24200_workflow_input_validators`. Remote: `jmchilton/issue_24200_workflow_input_validators`.

Base: `release_26.2`. Bug dates to #19092 (older releases also affected), but the fix carries an editor round trip (hidden form field) plus a change to the published `tool_util_models` package, so per John's preference intricate fixes target a recent release.

## Commits

- `4a685def277` Baseline tests (pass on base).
- `03fd85e66b8` Fix + red-to-green unit and API tests.
