# Readability batch 37

Four originators drawn with seed `2610937`, one test per commit, then one range review. [Manifest](readability_batch_37.yml).

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| FolderDetails | Each case serves the library, then mounts; `enableAutoUnmount` replaces the shared `beforeEach` mount and manual unmount. The typed `/api/libraries/{id}` handler records requested ids, so the old exact-URL check becomes an assertion that only `parent_library_id` was fetched. The modal's state is read from the native `<dialog>.open`, not `GModal.props("show")`. Folder metadata is typed `LibraryFolderMetadata`; the undeclared `isStatic` prop is gone. New check: library and folder names appear in their tables. [Review](reviews/batch37/FolderDetails.md). | 3 → 3 |
| WorkflowInvocationOverview | The file-level `vi.mock` of the workflow store and its magic ids are gone. `mountOverview({ storedWorkflow, fetchError })` seeds `workflowsByInstanceId` through `createTestingPinia`, so the real getter runs and only the fetch action is stubbed. New checks: the graph gets the stored workflow without a fetch, alert variants, and the fetched id. [Review](reviews/batch37/WorkflowInvocationOverview.md). | 3 → 3 |
| FormOptionalText | The initial render is its own case; the switch-off-then-on walk keeps its order and emission indexes on one wrapper. The checkbox is selected by type, not as the first `input`. New case: a null value shows no text input until switched on. [Review](reviews/batch37/FormOptionalText.md). | 2 → 3 |
| publicClasses | The GButton/GLink/GDropdownItem case is split into three; four `as object` casts are gone. Every class in the package README's public-class table is still asserted. [Review](reviews/batch37/publicClasses.md). | 4 → 6 |

## Reuse and follow-through

No new shared helper. Follow-up: `WorkflowInvocationInputOutputTabs.test.ts` and `Workflow/WorkflowAnnotation.test.ts` mock the workflow store module the same way WorkflowInvocationOverview did; both are eligible and go into batch 38 as follow-through.

Guidance: none.

## Validation and review

15 cases across 4 suites pass; the baseline was 12. Each commit's test passes at that commit, shuffled with seed `370101`; full client vue-tsc and the `packages/ui` vue-tsc pass at the tip; ESLint, Prettier and hooks pass. Per-test coverage at the batch base and the tip: no source file lost covered lines or branches. [Independent review](reviews/batch37/review.md) approved all four commits.

Commits: `285e3f58498` (FolderDetails), `38befa074dd` (WorkflowInvocationOverview), `d41ee9a09c2` (FormOptionalText), `ab1a53a3a01` (publicClasses).
