# Page editor store readability review

The selected file is `client/src/stores/pageEditorStore.test.ts`, edited in `/Users/jxc755/projects/worktrees/galaxy/branch/jest_readability_batch_01`. The full client unit-testing guidance in `client/README.md` and the store, pages API/schema, global test setup, storage mock, and adjacent page editor tests were read before editing.

## Applied changes

- Preserved all 71 test scenarios and 150 assertions; no production code changed. The file went from 1,160 to 1,037 lines.
- Removed 92 occurrences of `: any` or `as any`. MSW handlers now infer endpoint, response, and path parameter types from the generated API schema. The captured save request uses `UpdateHistoryPagePayload`.
- Added local typed revision summary/details factories. Repeated boilerplate now collapses to scenario-specific overrides, with required `content_editor` present in revision details.
- Added `createHistoryEditorStore()` for the 23 cases that establish the same history context. Test actions and expectations remain visible in each test; the helper performs no load, save, or assertions.
- Replaced broad successful mocks for five page endpoints with small typed GET handler builders. The list builder is reused 13 times and details builder 17 times. Each scenario now registers its relevant requests; errors and specialized PUT/POST/DELETE behavior remain inline.
- Renamed groups and revision navigation tests to describe behavior; removed unrelated clear-selected-revision setup from the clear-page preview test.
- Retained fresh real Pinia setup for isolated store testing. Existing `useServerMock()` resets handlers after every test, and the global `useUserLocalStorage` mock creates fresh refs; adding local storage cleanup would duplicate existing isolation.
- Retained direct `await` on async store actions. Component-oriented `flushPromises()` advice does not require an additional flush when the tested action already returns the awaited operation.

## Reuse investigation

`client/tests/test-data/index.ts` currently provides registered user/history factories but no page/revision factories. `client/src/components/PageEditor/testData.ts` offers summary constants, used by `HistoryPageList.test.ts` and `PageCard.test.ts`; these have different fixture identities and no configurable details/revision factory. Replacing the selected file's fixture with them would either couple a store test to a component directory or leave most details duplication intact.

Concrete follow-up candidates:

- `client/src/api/pages.test.ts:33` and `:53` contain effectively identical page summary/details fixtures, including IDs, content, and timestamps. A shared typed `createPageSummary` / `createPageDetails` factory in `tests/test-data` could serve this file and the selected store test.
- `PageEditorView.test.ts:116`, `PageDisplayToolbar.test.ts:67`, and `HistoryPageView.test.ts:206`, `:229`, `:304` build incomplete page details with casts. A details factory could remove those casts and keep schema additions centralized.
- `PageRevisionList.test.ts:11` has its own `makeRevision` summary factory. `PageRevisionView.test.ts:12` has a full details fixture, while `PageEditorView.test.ts:341`, `:360`, `:382` uses cast revision details. Shared summary/details factories have multiple concrete consumers.

These shared extractions were deliberately recorded for a follow-up; this batch changes only the five selected tests and keeps the selected file's factories local.

## Practices supported by this review

1. Let typed MSW infer handler/request/response types. Fix a fixture that misses generated required fields rather than casting the handler to `any`; all selected page endpoints are in the schema, so no untyped bypass is needed.
2. Reuse small domain-specific handler builders, while registering only requests relevant to the scenario. A default mock for every CRUD endpoint hides the test's actual dependencies.
3. A setup helper should state the context it creates and avoid hiding the action under test. `createHistoryEditorStore()` creates history context only; async load/save calls remain in the test.
4. Type fixture factory overrides and results against the generated schema. Preserve distinction between revision summaries and details; do not rely on a summary cast as details.
5. Await the actual async API available to the test. Store unit tests differ from mounted-component tests; unnecessary promise flushing can obscure the causal sequence.

## Validation

- Baseline and refactored targeted run: 71 tests passed.
- `pnpm exec vitest run src/stores/pageEditorStore.test.ts`: passed after final handler changes.
- `pnpm exec prettier --check src/stores/pageEditorStore.test.ts`: passed.
- `pnpm exec eslint -c .eslintrc.js src/stores/pageEditorStore.test.ts`: passed after final changes; only the existing outdated caniuse-lite notice.
- Full `pnpm exec vue-tsc --noEmit`: passed (exit 0, no diagnostics), verifying the inferred MSW types and generated fixture types. The empty diagnostic capture is `/private/tmp/pageEditorStore-typecheck.log`.
