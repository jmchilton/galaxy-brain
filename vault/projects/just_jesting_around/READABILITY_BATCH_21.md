# Readability batch 21

Single-test iteration, drawn with seed `2610921` from 225 eligible entries. [Manifest](readability_batch_21.yml).

## Originator

| Selected test | Result | Cases |
| --- | --- | ---: |
| Workflow Editor `activities` | Local setup helpers take named options instead of positional arguments: `setUpWorkflowActivities({...})` and `bestPracticesActivityFor({...})`, which replaces `makeLintData(0, 0, 2, 1)` calls and its double cast. The existing `setupTestPinia()` replaces `createTestingPinia({ stubActions: false })`. The combined danger/primary variant case splits in two. [Review](reviews/batch21/activities.md). | 12 → 13 |

Dropped from fixtures: `hasInvalidConnections`, which `SpecialActivityOptions` doesn't declare and `activities.ts` never reads, and an unasserted `exitWorkflowActivity`.

## Reuse and follow-through

No shared `LintData` fake: Lint.test.ts and useLinting.test.ts build a real `useLintData`. Possible follow-up: nothing tests `useWorkflowActivities`' store side effects (`setMeta` disabling `workflow-run` and `save-workflow`).

Guidance: none. The author noted that Vitest truncates long `$name` titles in object-form `it.each`; this is general Vitest behavior, so it was discarded.

## Validation and review

13 cases pass, shuffled with seed `210101`. Full client vue-tsc, ESLint, Prettier and source commit hooks pass. [Independent review](reviews/batch21/review_activities.md) approved. Commit `923d47881f5`.
