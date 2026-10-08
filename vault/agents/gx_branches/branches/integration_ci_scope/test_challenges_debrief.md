# Test challenges after relocating integration CI selection

The relocation preserves selection policy and collection behavior. Added one real-Git CLI regression that runs Python with `-I -S`, proving the relocated policy loads and selects Azure alone without installed site packages or an inherited PYTHONPATH. All 52 focused tests pass. No blocking test or implementation findings remain. This replaces the archived initial test challenge for the current revision.

## Review context

- WORKING_DIRECTORY: `/Users/jxc755/projects/worktrees/galaxy/branch/integration_ci_scope`.
- Reviewed the updated agent instructions, REVIEW_FOCUS.md, GX_PROCESS_CHALLENGE_TESTS.md and the test placement/layer guidance in `doc/source/dev/writing_tests.md`.
- Revision moves the policy, pytest hook and detailed guide into `test/integration/`; CLI and unit tests import `integration.integration_selection` through the repository test directory, while the actual conftest/hook use package-relative imports.

## Changes made by the challenge

Extended the existing CLI test helper with optional Python flags and added `test_cli_reads_relocated_policy_without_site_packages`. The test creates a real temporary repository, commits an Azure plugin change, runs the actual script from that unrelated repository with isolated Python and site packages disabled, and verifies only Azure is selected. It would fail if the relocation caused a missing import, relied on the working directory or PYTHONPATH, or introduced pytest/Galaxy dependency imports into the pre-install classifier.

No production imports or source-selection rules were changed. No tests were removed or assertions weakened.

## Tests challenged and retained

- Real Git policy tests check meaningful runner, objectstore and shared-infrastructure selections, including the S3/Cloud dependency and deliberately unrelated source edits. They exercise the CLI boundary rather than duplicate classifier internals.
- Pull-request merge-base/multi-commit, rename/deletion, invalid/missing comparisons, unrelated histories and malformed event-file tests cover conservative GitHub event handling.
- Subprocess pytest tests use real unittest class setup and fixtures, observing whether expensive setup starts; they also preserve unclassified and disk-only tests. Module-generated tests, inherited family markers and malformed markers remain covered.
- Cost-based sharding tests verify selection precedes packing. Existing shard regression tests remain intact.
- The CLI-to-pytest test connects generated environment output to actual setup decisions.

These tests belong under `test/unit/` under the documented decision tree because the feature does not require a Galaxy instance or browser. API/Integration/Selenium application tests would add unrelated startup dependencies without increasing coverage of Git event classification or pytest collection. Real subprocess execution already exercises the infrastructure boundaries. No mocks or SimpleNamespace constructions require replacement. No browser E2E test is warranted.

## Validation for this revision

- Focused selector and existing shard suites: **52 passed** (44 selector cases, 8 shard tests).
- New isolated `-I -S` CLI regression passed for a real Azure plugin diff in a temporary repository.
- Combined unit and actual integration collection succeeded: 44 unmarked unit cases retained; all 10 real redirect tests deselected under an empty-family selection. This checks the global test-directory path insertion and package-relative integration imports together.
- Focused mypy for the relocated policy, hook and CLI with `MYPYPATH=test:lib --follow-imports=silent`: **no issues in 3 files**.
- Black, isort, Ruff and `git diff --check` pass. Actionlint passes with the existing constant-false diagnostics excluded and shellcheck disabled.
- Coordinator independently checked real integration collection: full **1,745** IDs and empty-family **1,467** IDs/**278** deselected, both exact matches to the prior saved node sets. No sharding code changed; the initial four-shard union evidence remains applicable and all eight existing shard tests passed again.

## Decisions and limitations

No review recommendation was declined. The documented shared service preparation remains unchanged because unconditional suites need those services. Static source mapping maintenance and CI-only external-service execution remain the previously documented limits; this revision changes code location and imports, not selection policy. The host's unrelated Python 3.9 executable is outside Galaxy's supported 3.10+ runtime; checks used the canonical project Python 3.13 environment.

The coordinator owns tracking-file sync and the final implementation handoff.
