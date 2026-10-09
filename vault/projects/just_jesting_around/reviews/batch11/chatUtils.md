# Iteration11: chatUtils

Originator: `client/src/components/GalaxyAI/chatUtils.test.ts`.

Replaced a double-cast partial HTMLElement with a real DOM element whose scrollHeight is fixed at500 and whose scrollTo is a local spy. The test now asserts the exact top500/behavior:auto call once. Made the undefined-container case explicitly assert no exception.

Preserved the100-ID uniqueness sample and both scroll scenarios. The stronger scroll assertion checks the intended destination rather than accepting any scroll call; no production behavior changes.

Reuse: no new helper is justified for this short single-use DOM setup. Existing mocking guidance suffices. Deterministic time/random mocking would test the ID implementation rather than preserving the existing public uniqueness sample, so no such abstraction or advice added.

Validation: baseline 3 passed cases; final 3 passed cases in shuffled order (seed110047). The six-originator run increased from50 to74 passed cases with no skips/failures. Reports: `/private/tmp/jest_readability_batch11_components_baseline.json` and `/private/tmp/jest_readability_batch11_components_final.json`. Scoped ESLint and Prettier run on all six owned files; root driver supplies final aggregate typecheck evidence.

Supporting source files: none. Shared factories/helpers changed: none. README/inventory/Git changes: none by this reviewer.
