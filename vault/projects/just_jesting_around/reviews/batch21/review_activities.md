# Review: activities.test.ts

Approved.

Suite run: `NODE_OPTIONS=--no-webstorage pnpm exec vitest run src/components/Workflow/Editor/modules/activities.test.ts` → 13/13 pass (only the usual GCard v-bind compiler warning).

## Case mapping (12 → 13)

| Original | Now | Inputs / assertions |
| --- | --- | --- |
| excludes custom tools (false) | same name | `canUseUnprivilegedTools: ref(false)`, `not.toContain` kept |
| includes custom tools (true) | same name | `ref(true)`, `toContain` kept |
| undoStackLength → Changes indicator | same name | 5 → 10, both `toBe` kept; `findActivity` re-reads `activities.value`, so reactivity still tested |
| hasChanges → Save tooltip | same name | "No changes to save" → "Save current changes" kept |
| indicator undefined | same | no issues, `toBeUndefined` |
| indicator remaining critical count | same | `(3,1)` → `{ totalPriority: 3, resolvedPriority: 1 }`, `toBe(2)` |
| indicator true for minor only | same | `(0,0,2,0)` → `{ totalAttribute: 2 }`, `toBe(true)` |
| danger + primary variant (combined) | split into 2 cases | `(1,0)` → `{ totalPriority: 1 }` "danger"; `(0,0,1,0)` → `{ totalAttribute: 1 }` "primary" |
| default tooltip | same | exact string |
| singular critical | same | `{ totalPriority: 1 }`, exact string |
| plural critical | same | `{ totalPriority: 3, resolvedPriority: 1 }`, exact string |
| minor count | same | `{ totalAttribute: 2, resolvedAttribute: 1 }`, exact string |

No assertion removed or loosened; every input maps to the same counts (defaults are 0, as before).

## Findings

- **Coverage**: preserved. Splitting the variant case is a split, not a loss.
- **Boundaries**: same real composables and real activity store. `createTestingPinia({ createSpy: vi.fn, stubActions: false })` → `setupTestPinia()` (`createPinia`): actions ran for real before and nothing spied on them, so behavior is unchanged; `setupTestPinia` is the repo's existing helper (10+ consumers). Dropping `hasInvalidConnections` is correct: `SpecialActivityOptions` only declares `lintData` and `activities.ts` never reads it. `exitWorkflowActivity` was returned but never asserted, so dropping it loses nothing. Nothing new is mocked.
- **Readability**: better. Named options replace five positional refs and the `makeLintData(0, 0, 2, 1)` calls, and each case now shows only the input it varies. The `as unknown as LintData` double cast is gone. One single `issueCounts as LintData` remains, which is needed without a full `LintData` fake or a production change. Optional nit: the `Pick<...>` annotation adds three lines. A direct `{ ... } as LintData` literal would type-check just as strictly against misspelled keys. Not blocking. No needless async, unused handlers, or manual cleanup.
- **Reuse**: no existing `LintData` fake exists. `Lint.test.ts` and `useLinting.test.ts` build real `useLintData`, so the local helper is right, and it has a single consumer. Nothing applicable in `tests/test-data/` or `tests/vitest/`. No supporting edits.
- **Scope**: only the test file changed (`git status`). No production edits, no comments about the process.
- `it.each` was rejected because Vitest truncates `$name` titles. That's reasonable: the README allows `it.each` but doesn't require it.
