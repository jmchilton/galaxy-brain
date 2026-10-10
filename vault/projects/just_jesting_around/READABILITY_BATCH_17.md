# Readability batch 17

First single-test iteration, built directly as per-test commits on `vitest_readability`. Originator drawn with seed `2610917` from the 228 eligible entries. [Manifest](readability_batch_17.yml).

## Originator

| Selected test | Result | Cases |
| --- | --- | ---: |
| WorkflowSelectPreferredObjectStore | Async mount helper with the preference as an argument, named selector constants, auto-unmount. The combined case splits into listing and an `it.each` over selection outcomes; selecting the default while a store is preferred now checks for a `null` emit. [Review](reviews/batch17/WorkflowSelectPreferredObjectStore.md). | 1 → 3 |

The original last assertion, `emitted("updated")?.[0]?.[1]` falsy, could never fail: the component emits one argument, and the optional chain also passed with no emit. It is now an exact `toEqual([["object_store_1"]])`, which covers the old claim and proves the emit.

## Reuse and follow-through

Existing object-store mocks, mock config and navigation selectors; no new helper. Follow-up: `client/src/components/Tool/ToolSelectPreferredObjectStore.test.ts` is a near-copy with the same vacuous assertion.

Guidance: none; the README already covers this.

## Validation and review

3 cases pass, shuffled with seed `170101`. Full client vue-tsc, ESLint, Prettier and source commit hooks pass. [Independent review](reviews/batch17/review_WorkflowSelectPreferredObjectStore.md) approved. Commit `943eec1a1ef`.
