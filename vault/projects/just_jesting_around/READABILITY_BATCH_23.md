# Readability batch 23

Single-test iteration, drawn with seed `2610923` from 223 eligible entries. [Manifest](readability_batch_23.yml).

## Originator

| Selected test | Result | Cases |
| --- | --- | ---: |
| ScrollList | Local mount helpers for the local-loader and store-backed modes, each with its own loader spy, replace module-level state and per-describe mounts. `scrollToEnd(times)` awaits the captured infinite-scroll callback and throws if none was registered, replacing a 10 ms wait and two unbounded `while` loops. Load More is followed by `flushPromises`. Two long cases split in two. [Review](reviews/batch23/ScrollList.md). | 6 → 8 |

The prop-items-only case asserted `testLoader` was never called, but passed no loader, so it couldn't fail. It now asserts no `load-more` emit, which is how ScrollList requests items without a loader. A mutation (total count + 1) makes it fail.

## Reuse and follow-through

No other test mounts ScrollList or mocks `useInfiniteScroll`; helpers stay local.

Guidance: none.

## Validation and review

8 cases pass, shuffled with seed `230101`. Full client vue-tsc, ESLint, Prettier and source commit hooks pass. [Independent review](reviews/batch23/review_ScrollList.md) approved, confirming the replacement keeps the original intent and `scrollToEnd` drives the real callback. Commit `f20a449d92d`.
