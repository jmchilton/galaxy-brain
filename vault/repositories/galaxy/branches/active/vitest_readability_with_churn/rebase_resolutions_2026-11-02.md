# Rebase onto restacked readability — 2026-11-02

Replayed the 76 churn commits from `vitest_readability` `390b78fc122` onto `restack/readability` `a54dfb1b450` (readability on `vitest_story_foundation` on dev `38dc259318c`). 7 conflicts; each keeps the churn commit's intent plus every test the base added.

- CopyModal (`cc34c3ad69f`): base added a `mountFn` parameter; kept it alongside the churn's per-mount `localVue` and auto-unmount.
- FormNumber (`b5f9f3e49da`): base added single-bound correction and clear-without-snapping tests plus `lastEmittedValue`; ported both as `it.each` cases into the churn's `mountFormNumber`/selector style.
- HistoryView (`7415fd6e124`): base added item overrides and two filter/operation suites; ported onto the churn's renamed `createHistory`/`createDatasets`/`createWrapper(userId, history, overrides)` and owned pinia (`useHistoryStore(wrapper.vm.$pinia)`), dropping manual unmounts for auto-unmount.
- DatasetDetails (`c60c5e27979`): base rewrote the file (real mounts, module stubs, served datasets, 2 new tests). Took the base and re-applied the churn: owned unmount and pinia disposal, sanitizer restoration, `onTestFinished` timer cleanup, `get` for the sanitized cell.
- SelectionOperations (`cd4e039c97b`): base added a `props` mount option and the Collection Building suite; added both to the churn version.
- WorkflowInvocationSteps (`b5136db15f9`): base rewrote the file (store mocks, step polling test). Took the base and re-applied the churn: auto-unmount, pinia disposal, `ensureDefined` alert lookup. The churn's typed invocation cast isn't needed with the base's fuller fixture.
- DatasetAttributes (`081561df444`): dev itself has "shows why saving failed" twice (byte-identical, from `498f65b48a3`); kept both in the churn's `get` style rather than drop a test.

Gates: type-check passes; unit results in the branch record.
