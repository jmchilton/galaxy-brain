# Readability batch 38

Four originators, one test per commit, then one range review. WorkflowInvocationInputOutputTabs and WorkflowAnnotation are follow-through from batch 37; the other two were drawn with seed `2610938`. [Manifest](readability_batch_38.yml).

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| WorkflowInvocationInputOutputTabs | The workflow store `vi.mock` is gone: the stored workflow is seeded through `initialState`, and the non-terminal case serves the workflow download so the real `getFullWorkflowCached` runs. Dataset and collection handlers and a `ContentItem` stub were removed: `GenericItem` only loads after an IntersectionObserver fires, which happy-dom never does. The `as object` cast is gone. New check: the data input is the first row. [Review](reviews/batch38/WorkflowInvocationInputOutputTabs.md). | 3 → 3 |
| WorkflowAnnotation | The workflow store `vi.mock` is gone; the workflow and user are seeded through `initialState`. The history is still stored after mount, through the real `setHistory`, while the history link's own fetch is in flight, as the original did by assigning state. The view loops became `it.each`, and the history-link `if/else` two cases. New check: the "(current)" indicator. [Review](reviews/batch38/WorkflowAnnotation.md). | 4 → 8 |
| WorkflowStepIcon | `as object` cast and `propsData` gone; the table is `as const`. New column checks that only subworkflow rotates. [Review](reviews/batch38/WorkflowStepIcon.md). | 7 → 7 |
| SelectionField | Three module mocks are gone. The real history and event stores run, and `/api/datasets` is served by MSW instead of mocking `./services`; the error case is a server 500. `wrapper.vm.currentValue` became the Multiselect's `modelValue` plus the rendered label. [Review](reviews/batch38/SelectionField.md). | 7 → 7 |

## Reuse and follow-through

Closes batch 37's store-mock follow-up. No new shared helper. Follow-up: seeding a current history (store the history, then `setCurrentHistoryId`) recurs in about six tests (`DatasetCopy`, `UploadFileRow`, `SelectorModal`, `MultipleView` and others) and could become a shared helper.

Guidance: one sentence added to `client/README.md` (`871ef3bed23`). `createTestingPinia({ initialState })` silently ignores state a setup store doesn't return, as it does a wrong store id. Evidence: seeding `historyStore`'s private `storedCurrentHistoryId` did nothing in WorkflowAnnotation and SelectionField, and the store's "first stored history" fallback hid it until the coverage compare.

## Coverage

The per-test coverage compare caught two WorkflowAnnotation drafts that lost coverage. Letting the history arrive only through the link's fetch lost `setHistory`'s merge branch. Seeding it before mount skipped the fetch and the loading render (`historyStore.ts` 82 → 61 lines, `TargetHistoryLink.vue` branches 7 → 4). The kept version matches the original's post-mount timing. At the tip no source file lost covered lines or branches.

## Validation and review

25 cases across 4 suites pass; the baseline was 21. Each commit's test passes at that commit, shuffled with seed `380101`; full client vue-tsc passes at the tip; ESLint, Prettier and hooks pass. The [independent review](reviews/batch38/review.md) approved three commits and asked to drop an `as object` cast in InputOutputTabs; that fix was folded into its commit.

Commits: `739fb3d048e` (WorkflowInvocationInputOutputTabs), `b5d9bcde23b` (WorkflowAnnotation), `1feef341313` (WorkflowStepIcon), `067304c7861` (SelectionField), `871ef3bed23` (README).
