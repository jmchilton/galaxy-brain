# PR 23898: Pulsar 0.16.0 dependency update review

Date: 2026-10-11. Reviewed the seven-file working-tree delta against original PR head `c6f8234b5e459285e9637c1fa2ed6b985ee41402` in the isolated release-update checkout. This is an incremental dependency review, not a fresh audit of the full PR. Delivery: local review only; no GitHub comment or review posted.

## Verdict

No findings in the incremental update. The changes use the published release consistently and remove the temporary source-build configuration completely.

## Evidence

- Root `pyproject.toml` and `packages/app/pyproject.toml` both require `pulsar-galaxy-lib>=0.16.0`; the runtime `lib/galaxy/dependencies/pinned-requirements.txt` requires `pulsar-galaxy-lib==0.16.0`. No source URL remains in these requirements.
- Both uv extra-build-variable tables were removed from each of the root and packages pyprojects. The temporary `PULSAR_GALAXY_LIB` exports were removed from `scripts/common_startup.sh` and `packages/test.sh`, and the equivalent tox setting was removed. A whole-checkout text search found no remaining temporary Git pin or build-variable scaffolding.
- Independently imported `galaxy.jobs.runners.pulsar` with `PULSAR_GALAXY_LIB` unset and the coordinator's PyPI-installed client wheel first on `PYTHONPATH`. `importlib.metadata.version("pulsar-galaxy-lib")` returned `0.16.0`; `pulsar.__file__` resolved inside the isolated PyPI target, and `build_client_manager` resolved to `pulsar.client.coexecution_manager`.
- Startup installation consumes `requirements.txt`, while type-check environments consume the pinned runtime requirements directly. The package-test path builds the package declarations carrying the updated dependency floor. These paths therefore select the published release without requiring Pulsar source-build variables.
- Independently inspected the coordinator-built `galaxy_app-26.1.dev0-py3-none-any.whl`: its metadata contains `Requires-Dist: pulsar-galaxy-lib>=0.16.0` and no temporary Pulsar Git URL.
- The coordinator reported all 30 focused Pulsar runner tests passing against the published client wheel. The initial sandbox run emitted a process-list permission error during exit cleanup after pytest succeeded; a clean rerun is tracked by the coordinator.
- `git diff --check` passed. The delta is restricted to the seven dependency/configuration files; existing application code and test assertions are unchanged.

This review does not claim a full Galaxy integration run or remote CI result.

## Merge-resolution follow-up

Reviewed the staged merge of current Galaxy `dev` (`7f3badc01ee`) into published PR head `66ae70628eb9586bc4ae1a7d5d50d1be78de9693`. No findings in the resolution.

The runner-test import conflict retains both the new dev version-metrics dependencies and the PR's explicit Pulsar client-class/factory imports. An AST comparison against each parent confirms all test functions, helpers, and classes survive unchanged: all 22 definitions from the prior PR head and all 23 definitions from current dev are present with identical ASTs. This preserves the submitted-version tests from dev and the real-client backend/transport regression tests from the PR.

The staged result differs from current dev in exactly five files: the root and app dependency floors, the exact runtime pin, the runner's explicit imports, and its real-client regression tests. The four files that formerly carried standalone temporary build settings now match dev byte for byte. The runner's non-import code matches dev, retaining its new version-metrics behavior. No unresolved index entries remain, and the staged diff passes `git diff --check`.

The coordinator is rerunning the combined focused tests and rebuilding app metadata on the merged tree. The merge commit and remote CI result are recorded by the coordinator once available.

## Final delivery evidence

The reviewed changes are published at `d2a95eff002f6ca9cb4c7040303dceea64029438`. The final combined runner suite passed all 33 tests with the PyPI 0.16.0 wheel and source-build variable unset, with clean process cleanup. The rebuilt current-dev app wheel still declares `pulsar-galaxy-lib>=0.16.0`; no Git dependency remains. Targeted Ruff/isort, TOML parsing, shell syntax, and final PR whitespace checks passed. GitHub reports the PR mergeable with fresh CI queued.
