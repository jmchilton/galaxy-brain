# Marius review follow-ups — 2026-10-13

Completed all five findings from [Marius’s review](https://github.com/galaxyproject/galaxy/pull/24050#pullrequestreview-5500793156) in commit `ea019fe47001ea9a6205ccd49a86701e6f219ece`, pushed to `jmchilton:sample_sheet_vue3`. No requested item was deferred. No public comment or review was posted.

## Changes and decisions

- **Collection-backed workbook reload:** join generic parsed workbook rows to the loaded collection by identifier, retain full dataset/pair objects and model-object mode, and apply edited metadata in workbook row order. Unknown and duplicate identifiers are rejected with a toast without replacing the current grid. The collection-specific parser was considered, but its current backend response does not preserve the nested objects needed by the paired create path; joining the already-loaded objects avoids changing that endpoint here.
- **Unsupported FetchGrid replacement target:** reset to raw view, discard old rows/columns/table settings, and serialize the replacement target even if a late event marks the discarded grid modified. Recover to table view when a supported target arrives.
- **Metadata named `__model_object`:** select the row path using explicit mode, and store internal model objects under a Symbol so metadata cannot overwrite them. The read-only collection-sheet display uses the same internal key.
- **Optional restricted columns:** handle clearing before restriction validation and submit `null`. Optional restricted string selectors offer a blank choice; unrestricted string behavior remains unchanged.
- **Renamed identifiers:** update references in every row, including self references, after accepting a unique name. Reject a rename if its propagated reference would violate a referencing column’s restrictions. Duplicate/rejected edits preserve both names and references; empty optional references are not populated when an initially blank identifier is assigned.

## Validation

- **168/168 Vitest tests in 17 files pass**, covering Collections, Landing, RuleBuilder, and upload configurations. Ran with `NODE_OPTIONS=--no-experimental-webstorage` for the installed Node 25 browser-test environment.
- The seven initial new regression cases all fail against the three original grid/parser source files, then pass after restoration of the fixes. Added an eighth regression for a rename violating a reference restriction.
- Workbook tests exercise the real client download and parse functions against mocked HTTP responses, then the same collection join used by the wizard, grid reload, a further cell edit and the submitted create payload. Dataset and paired cases check retained HDA IDs, row reordering, metadata named `__model_object`, and absence of a URI fetch payload. They do not execute Python workbook parsing or a live browser.
- FetchGrid uses a grid stub to test target replacement and submitted targets without jsdom-dependent grid sizing. Existing real ag-grid compatibility evidence remains in the prior review.
- `vue-tsc --noEmit`, Prettier, `git diff --check`, and pre-commit hooks pass. ESLint has zero errors; existing event-hyphenation/accessibility warnings remain.
- Worktree clean after commit/push. PR head confirmed at the new SHA, open, non-draft, mergeable against `dev`; no rebase needed. Fresh CI is pending, with queued replacement runs and some cancelled runs. These are not claimed as green. [Fork client unit run](https://github.com/jmchilton/galaxy/actions/runs/38437439182), [fork integration Selenium](https://github.com/jmchilton/galaxy/actions/runs/38437439413).

## Tracking sync

`make validate` fails on the pre-existing `vault/reviews/Untitled.md` missing frontmatter (123 files, one error, 15 advisory warnings). Under the vault sync instructions, tracking files remain local and uncommitted; unrelated work was preserved. Galaxy code is committed and pushed independently.
