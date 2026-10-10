# Readability batch 26

Four originators, one test per commit, then one range review. PageProvider is a follow-through selection from batch 25; the other three were drawn with seed `2610926`. [Manifest](readability_batch_26.yml).

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| PageProvider | Same vacuous shape as StoredWorkflowProvider: wrong `search` still passed. Now records request params and asserts them exactly, plus items, the callback count, data and the `total_matches` header. [Review](reviews/batch26/PageProvider.md). | 1 → 1 |
| WorkflowInvocationState | Local `storeInvocation(id, jobsSummary, overrides)` per test replaces magic-ID lookup tables. `findComponent(WorkflowInvocationOverview).props(...)` replaces grepping stub HTML; missing-overview cases now assert absence. Typed `vi.importActual` replaces `as any`. [Review](reviews/batch26/WorkflowInvocationState.md). | 10 → 10 |
| Tool Shed ErrorBanner | `mountBanner`, `clickDismiss` and a selector constant; no-op mock clearing and redundant flushes removed; auto-unmount. Special-character case asserts the full literal message and no rendered `<script>`. [Review](reviews/batch26/ErrorBanner.md). | 9 → 9 |
| `persistentProgressMonitor` | Each test gets its own monitor from the new fake; the start test asserts `waitForTask("123")`. [Review](reviews/batch26/persistentProgressMonitor.md). | 4 → 4 |

## Reuse and follow-through

[`getFakeTaskMonitor`](reviews/batch26/getFakeTaskMonitor.md) in `client/tests/vitest/fakeTaskMonitor.ts` returns an idle `TaskMonitor` with fresh refs and spies. Its consumers are the originator and supporting PersistentTaskProgressMonitorAlert (7 → 7; only monitor construction changed, counter unchanged). DownloadItemCard fakes the composable's result, a different interface, so it doesn't adopt it. The same three-line "record params" shape now appears in InvocationsProvider, StoredWorkflowProvider and PageProvider; it's left inline so each handler stays visible.

Guidance: none.

## Validation and review

31 cases across 5 suites pass: 24 selected, 7 supporting. Each commit's tests pass at that commit, shuffled with seed `260101`. Full client vue-tsc and the Tool Shed typecheck pass at the tip; ESLint, Prettier and hooks pass. [Independent review](reviews/batch26/review.md) approved all five commits.

Commits: `da4a4a2629c` (PageProvider), `6bf1eeae414` (WorkflowInvocationState), `362350acd0a` (ErrorBanner), `ea3fcc46c25` (fake monitor + Alert), `3621eb6896d` (persistentProgressMonitor).
