# Readability batch 47

Four originators drawn with seed `2610947`; one test per commit, followed by a README correction. Started with default N=1; John approved batching, so selection expanded to four. [Manifest](readability_batch_47.yml).

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| JobDestinationParams | Complete rendered row matrix replaces indirect boolean checks and fixes the loop that skipped the final `require_container` row. Null renders blank; fixture uses the API type. Native VTU2 options, existing plugin helper, admin state before mount, explicit non-admin/unloaded-user cases, auto-unmount. [Worker report](reviews/batch47/JobDestinationParams.md). | 1 → 3 |
| GenericItem | Separate typed HDA and HDCA fixtures reuse existing summary factories, replacing the mixed-shape `as never` payload. Named failure rows, async mount helper, native options retaining global stubs, and preserved unmount-before-timer/observer-restoration cleanup. Full type check required an explicit detailed `type: "file"`; folded into its commit. [Worker report](reviews/batch47/GenericItem.md). | 8 → 8 |
| AuthoringHelpPanel | Repeated section/toggle selectors and cancelable DOM-link clicks have local helpers. Public editor `openSection` API is typed, native links check prevented navigation, clipboard state is restored, and every wrapper unmounts. All eight scenarios and 57 original checks retained. [Worker report](reviews/batch47/AuthoringHelpPanel.md). | 8 → 8 |
| LibraryEditField | Exact sanitizer-call sequences retain the raw/linkified/default-profile contract and all original DOM assertions. Adds expanded full text and more/less events. Native props/global, shallow mount, auto-unmount and sanitizer implementation restoration. [Worker report](reviews/batch47/LibraryEditField.md). | 2 → 5 |

## Reuse and follow-through

Reused existing `withPlugins`, user/dataset/collection factories, MSW helpers and visible intersection observer. No new shared helper was justified by a concrete second consumer. No supporting tests or production files changed; no later-lane-owned tests were edited.

Corrected existing `client/README.md` examples to use `props` and `global: withPlugins(...)`, matching the helper's current contract. This corrects examples rather than adding general test-structuring advice. Polling teardown advice remains marginal: GenericItem corroborates the existing explicit teardown pattern, but no new missing-teardown gap was found.

Added eleven bare, sorted inventory entries for newly landed upstream tests in a separate vault commit, preserving existing entry blocks and fields. Only the four selected originators receive `iterated: 1` after the successful lane push.

## Validation and review

Baseline: 19 passing cases across four suites, no skips. Final: 24 passing cases across four suites, shuffled with seed `470101`, no skips or unhandled errors. The first combined concurrent run failed to start three thread workers; its one completed suite passed. The final combined run uses `--maxWorkers=1` and exits 0. The pinned Node is `22.20.0`; the old batch's `NODE_OPTIONS=--no-webstorage` is incompatible with this runtime and was omitted.

Targeted ESLint, Prettier and source commit hooks pass. Full canonical client vue-tsc passes after the detailed fixture type correction. The three TS7006 errors seen only in the authoring worker checkout do not reproduce in the canonical checkout. `git diff --check` passes.

Per-test coverage is retained or improved. JobDestinationParams's canonical comparison spans 187 source files with no line/branch-count loss. AuthoringHelpPanel gains unmount cleanup coverage. LibraryEditField increases component statements 5→8 and branch arms 11→18. GenericItem and its polling provider keep their coverage. Correcting its response shapes drops two incidental child operands in its isolated run; the unchanged `GenericElement.test.js` and `ContentItem.test.js` suites cover them. Running that existing-consumer union at both refs gives 14 passing cases and no covered-line/branch-count loss across 219 source files. No supporting counters or files changed.

The [independent review](reviews/batch47/review.md), [test challenge](reviews/batch47/test_challenges.md), and [maintainability review](reviews/batch47/maintainability.md) found no blockers. The [scope evaluation](reviews/batch47/scope.md) recommends retaining the four originators and README correction. Existing Selenium library-description coverage complements the sanitizer boundary test; no new E2E, screenshots, or story migration was needed.

Commits: `e74496decd3` (JobDestinationParams), `8666e9815c5` (AuthoringHelpPanel), `dee5138da78` (GenericItem), `2796b93bb83` (LibraryEditField), `5838667ee6e` (README). Batch base and original remote head: `e1570742723`; dev: `9ac3cd2eb30`.

Pushed normally to `jmchilton/vitest_readability` at `5838667ee6e`. GitHub confirms the same head and `MERGEABLE`; PR #24038 remains draft with new-head CI queued/running. Vault validation has zero errors (15 existing advisory warnings). Pipeline vault records are committed locally; not pushed, per the worker instructions.
