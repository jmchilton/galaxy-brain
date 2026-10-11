# Workflow, storage, user and installation accessibility batch

Implemented in /Users/jxc755/projects/worktrees/galaxy/branch/fix_story_a11y from Galaxy dev, 2026-10-10. No commits, staging, suppressions, Storybook exceptions or original pipeline edits.

## Changes

- `client/src/components/ObjectStore/ConfigurationMarkdown.vue`: underline sanitized configuration links so surrounding text does not distinguish them by color alone.
- `client/src/components/ObjectStore/ObjectStoreBadge.vue`: expose the stock badge meaning and optional administrator message as a named graphic. FontAwesome layers remain decorative. This also gives the former generic tooltip-labelled span appropriate semantics.
- `client/src/components/User/DiskUsage/Quota/QuotaUsageBar.vue`: explicitly render the BootstrapVue progress-bar child and label it by storage source. Preserve percentage, max, variant and the existing visibility condition.
- `client/src/components/ProgressBar.vue`: name the four state segments by summary plus completed/failed/running/waiting. Counts and max remain unchanged.
- `client/src/components/Toolshed/RepositoryDetails/InstallationSettings.vue`: associate Target Section label with its datalist input through label-for/id.
- `client/src/components/WorkflowInvocationState/WorkflowInvocationState.vue`: put navigation actions inside a list item so the BootstrapVue ul has valid direct children.
- `client/src/components/Graph/ZoomControl.vue`: accessible name for reset includes displayed percentage, followed by its purpose. Existing title and reset event preserved.

## Regression coverage

- ObjectStoreBadge.test.ts: badge meaning/message is available without hovering, decorative icons are aria-hidden.
- QuotaUsageBar.test.ts: finite source bar has name, current percentage and max; unlimited source bar also named.
- InstallationSettings.test.js: actual label-for association and existing datalist retained, added to existing behavior test.
- New ProgressBar.test.ts: all four status segments have names plus correct counts and max.
- WorkflowInvocationState.test.ts: instantiate real BNav/BNavItem only in new semantic test; direct children all li and action group is retained. Existing shallow behavior tests unchanged.
- New Graph/ZoomControl.test.ts: percentage retained in accessible name, reset emits 1, updated percentage changes name.

## Validation

Node 22.20.0, dev Vitest configuration vitest.config.mts:

- Initial six targeted test files: 25/25 passing (/tmp/fix_story_a11y-workflow-unit.log).
- State suite after adding the list test: 11/11 passing (/tmp/fix_story_a11y-workflow-state.log). Combined coverage for these six files now 26 tests.
- New zoom suite: 1/1 passing (/tmp/fix_story_a11y-workflow-zoom.log).
- ESLint on all 13 changed files: passing (/tmp/fix_story_a11y-workflow-eslint.log).
- Prettier applied to assigned files; scoped git diff --check passing.
- Integration strict browser-story validation is owned by root in disposable scratch worktree. Initial strict audit confirmed storage/quota/deletion/missing-tool stories passed with current snapshot. Workflow annotation/overview/state and installation need shared tooltip/GHeading changes owned by root, plus zoom reset fix delivered here.

## Shared dependencies and unchanged areas

WorkflowAnnotation's visible runs badge name mismatch originates in shared vGTooltip overwriting visible text, not the wrapper component. Invocation state icon badges similarly need the shared directive to avoid prohibited aria-label on generic spans (root owns this). InstallationSettings advanced-toggle unnamed button is GHeading (root owns it). UserDeletion, WorkflowMissingToolsRequest and WorkflowInvocationShare reuse GModal; root owns the shared close-button fix. No local workarounds or exception parameters added.
