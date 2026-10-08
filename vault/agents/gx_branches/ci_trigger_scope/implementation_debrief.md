# CI trigger scope implementation

Implemented 2026-10-08 on `ci_trigger_scope`, based on `origin/dev` at `65421d5f420` (includes the merged Selenium CI removal). Commit: `446cd43ee4c`. Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/ci_trigger_scope`.

## Behavior

Previously, a change confined to one workflow definition selected 19 active broadly filtered workflows, including unrelated backend suites and docs. Those workflows now use ordered `paths`: include all files, preserve their original directory exclusions, exclude sibling workflow definitions, then include their own definition and any reusable workflows they call. Editing `unit.yaml` selects Unit tests among these suites. Editing `build_client.yaml` selects its five callers: Playwright, integration Selenium, Linux and macOS startup, and the tool form harness. Source and mixed source/workflow changes retain previous suite coverage. CodeQL and workflow auditing still follow their own triggers.

The narrower filters also cover previously missed inputs:

- Client API tests: shared Node version, pnpm configuration, and root client package manifest.
- OpenAPI generation: client setup/lock/workspace inputs, Prettier configuration/ignore list, and the generated Galaxy client schema.
- Tool form harness: shared client build workflow and Node/pnpm setup inputs.
- Python linting: `.ci/**` helpers/configuration and Makefile.
- Citation validation: its own workflow definition.
- Workflow auditing: composite actions under `.github/actions/**`.

The debugging-tests documentation explains routing and maintaining caller filters. Repository Prettier also reformatted existing examples in that file. No job implementations, matrices, concurrency rules, upstream feature-push suppression, schedules, or dispatch inputs changed. Disabled CWL and Pulsar workflows remain untouched.

## Validation and review

- `actionlint` 1.7.12 passed with shellcheck/pyflakes disabled and the two existing constant-`false` diagnostics excluded. Unfiltered actionlint reported only those baseline disabled-workflow diagnostics.
- A temporary verifier (`/private/tmp/galaxy-ci-scope-verify.py`) checked 426,768 old/new tracked-file selections for push and PR across 24 edited workflows: no source coverage removed; workflow self-selection and shared caller selection; mixed changes; push/PR parity; unchanged job definitions, schedules, and dispatch inputs. Explicit scenarios covered docs, client-only changes, unrelated workflows, and newly included shared inputs. This checks the glob forms used here, not GitHub's server-side diff generation.
- Commit hooks passed, including Prettier, Validate GitHub Workflows, whitespace, conflicts, and symlink checks.
- Independent subagent review found no blockers. Both suggested shared-input corrections (Prettier inputs and harness Node/pnpm inputs) were applied and reviewed again; the final suggested documentation clarification was applied. No review suggestions were declined.
- GitHub API reported no required-status-check branch protection on `dev`; effective required-check rules were empty for `dev` and `release_26.1`, and repository/inherited rulesets returned an empty list. No branch policy was changed.
- Vault validation: 122 files, zero errors, 15 existing advisory warnings; generated index and dashboard checks passed.

No test code was added to the branch; verification targets CI configuration rather than Galaxy application behavior. GitHub CI is pending after the push. The broad backend source filters intentionally remain conservative: narrowing specialized database/mulled/tool suites requires a separate dependency audit. Client build cache transport/eviction is also outside this trigger-only pass and remains a known independent fork-CI concern.

## Handoff

Branch is pushed to `jmchilton/galaxy`; registered under `branches_implemented_needs_ci`. No PR opened. Next: inspect fork CI, polish and review for submission through the branch-management workflow.
