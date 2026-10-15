# Prep extraction test challenge

The prep test challenge is complete: all six targeted client suites passed, and no additional implementation or test changes are recommended. Execution began only after the parent's stable-worktree signal, at clean commit `60dc8ddf598` after all five prep commits and hooks completed.

Reviewed `GX_PROCESS_CHALLENGE_TESTS.md`, Galaxy's writing-tests guidance, the client README testing practices, all prep changes against `88127f42979`, and the four affected client test files. Shared review/security policies remain applicable. No source changes were made during this challenge.

## Extraction and layering

The prep source and tests have no dependency on `invocationSelection`, query-selector APIs, `syncSelection`, `step_tab` or route reuse metadata. The reusable graph readiness changes and order-index corrections operate on existing props/stores. GenericItem expansion and the mapped-job URL feature remain outside prep.

Retain the extracted regressions:

- `useInvocationGraph.test.ts` uses an invocation-step array with explicit `order_index` values and places an unrelated step before the target. The error-state result verifies the actual behavioral consequence of matching the correct invocation step. The array-shaped fixture corrects the API boundary; no implementation-specific array-position assertion is used. Existing workflow/model doubles isolate graph state and do not need a server or browser.
- `WorkflowGraph.test.ts` starts both node and viewport dimensions at zero, delays readiness and verifies the real centered D3 transform. Scoped Pinia stores are real; only layout measurements are substituted because jsdom has no layout. It protects a timing order that would require artificial browser instrumentation to reproduce reliably.
- `WorkflowInvocationState.test.ts` replaces the route mock with a real memory router and adds a baseline for changing/removing notebook report ids on the same mounted component. This protects existing report behavior independently of the forthcoming feature. The shallow report child is sufficient to verify the page-id contract; rendering a complete notebook adds unrelated dependencies.
- `JobStep.test.ts` adds MSW responses for the real invocation-metrics getter used by job tables. Existing table/filter assertions remain unchanged. This isolates tests from unrelated HTTP connection failures and follows the client README's preferred API mocking layer.

No extracted test merely repeats source structure, and none duplicates the existing browser scenario without exercising a distinct ordering, readiness or isolation property. No assertions or meaningful coverage were removed or weakened. The existing sibling message-label and invocation-step tests provide useful compile/normal-path checks; the message-label suite does not directly exercise out-of-order invocation lookup, so it is not claimed as a separate shuffled-message regression.

The existing invocation-details browser test now waits for visible job information before taking its screenshot, replacing a fixed render delay. This strengthens its existing check. Prep does not add a new browser feature and does not need the mapped-job URL browser test retained on the feature branch. Browser/screenshot execution is coordinated by the parent; no competing run was started here.

## Validation plan

After the parent's stable signal, run the four affected client suites plus existing `useInvocationMessageStepData.test.ts` and `WorkflowInvocationSteps.test.ts`, with `NODE_OPTIONS=--no-experimental-webstorage`. `git diff --check` passed during static review. Append the actual execution result below before final disposition.

## Final disposition

After the stable signal, ran the planned six client suites with `NODE_OPTIONS=--no-experimental-webstorage` and `--maxWorkers=2`: **6 files / 41 tests passed**, exit 0, in 56.18 seconds. Log: `/tmp/issue24173-prep-test-challenge.log`. Confirmed the prep worktree was clean at `60dc8ddf598` and `client/src/composables/invocationSelection.ts` was absent. No source/test changes were made by this challenge. The source/test boundary is accepted; browser/screenshot and final handoff status remain parent responsibilities.
