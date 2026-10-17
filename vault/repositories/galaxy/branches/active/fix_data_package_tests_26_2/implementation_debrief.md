# Standalone galaxy-data test collection fix

The regression came from `0f6187aa657` ("Fix implicit conversion with job resource conditionals"), merged into `release_26.2` by `caa4acc3ad7`. Its new regression test imports `Conditional` from `galaxy.tools.parameters.grouping`, which belongs to the application package and is absent from standalone `galaxy-data` installations. Upstream package CI fails at collection: [run 38993214483](https://github.com/galaxyproject/galaxy/actions/runs/38993214483).

## Change

Replace the real `Conditional` with `SimpleNamespace(name="__job_resource", type="conditional")`, alongside the existing namespace parameter fixtures, and remove the application import. The fixture intentionally has no `optional` attribute, preserving the regression coverage for the original converter bug. All three resource contexts and all assertions remain unchanged. No production code or package dependencies change.

Self-review confirmed that the helper only reads `name`, `type`, and optional-attribute presence from this object; the fixture matches the relevant `Conditional` interface. Adding an application dependency would violate the lower-level package boundary and is unnecessary.

## Verification

Created an isolated Python 3.10.19 environment with local editable installs of `galaxy-data[test]` and its Galaxy package dependencies, without `galaxy-app` or a root `lib` Python path.

- Before the change, collecting `tests/data/datatypes/test_data.py` reproduced both `ModuleNotFoundError: No module named 'galaxy.tools'` errors.
- After the change, the entire module passed: **19 passed**, including all three converter-resource cases.
- Commit hooks passed Black, Ruff, Flake8, Prettier, whitespace, conflict and symlink checks.
- Full package suite passed with the environment activated: **1,330 passed, 25 skipped, 1 xfailed** (159.25 seconds), using `python -u -m pytest -m 'not external_dependency_management' . -q` from `packages/data`.
- An initial full-suite attempt without activating the environment had subprocess failures because `python` was absent from PATH; activating the environment resolved all of them.
- Vault validation: 124 files, 0 errors, 15 advisory warnings.

## Handoff

Branch: `fix_data_package_tests_26_2`; base: `release_26.2`; commit: `ba52e820bd0b7b136f8fc2211eb7e18ab3d7cd17`.

Pushed to the `jmchilton` fork. [Package CI](https://github.com/jmchilton/galaxy/actions/runs/39005378981) was queued after push. No PR opened.

Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/fix_data_package_tests_26_2`.
