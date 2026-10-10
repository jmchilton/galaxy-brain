# Readability batch 27

Four originators drawn with seed `2610927`; one test per commit, then one range review. [Manifest](readability_batch_27.yml).

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| Markdown `parseInvocation` | The single 12-assertion case becomes one case per routing rule, with `it.each` over the three workflow directives and a local `parse()` wrapper; fixture unchanged. Invocation is now checked by identity, and the mapped-over step also checks `job_id_2`. [Review](reviews/batch27/parseInvocation.md). | 1 → 11 |
| MyToolsLanding | Local `mountWithFavoriteTools(order)` and `dragFavorite(...)`; `props` + `withPlugins`, auto-unmount, casts removed via `FavoriteOrderEntry`. [Review](reviews/batch27/MyToolsLanding.md). | 1 → 1 |
| PageDisplayToolbar | One mount per case via `mountToolbar(mode, stubs)`, so the saved-feedback cases no longer double-mount; page/revision factories, selector constants, dead setup removed. [Review](reviews/batch27/PageDisplayToolbar.md). | 18 → 18 |
| Workflow Editor `layout` | Local `layOutSteps(newSteps, heights)` and `datasetInput()`; warn spies installed before steps are added. [Review](reviews/batch27/layout.md). | 4 → 4 |

## Reuse and follow-through

[Page revision factories](reviews/batch27/pages.md): `getFakePageRevisionSummary`/`getFakePageRevisionDetails` extend `client/tests/test-data/pages.ts`. Supporting PageEditorView adopts them in place of five cast literals (33 → 33, counter unchanged). Other pages.ts consumers still pass (130 cases). pageEditorStore, PageRevisionList and PageRevisionView keep their local conventions. Overriding `content` leaves `content_editor` at its default, as `getFakePageDetails` already does.

PageDisplayToolbar also dropped a `ChangesIndicator.name = ...` mutation. A `<script setup>` child is matched in `stubs` by its file-derived name, so the assignment was unnecessary, and it wrote to the shared production component object. The only remaining instance is Workflow Editor `Index.test.ts`, which is queued as follow-through for batch 28, so no README line is added. The old mount path also wrote per-test stubs onto the shared `localVue` object, leaking a spy stub into later tests; the explicit merge stops that.

Guidance: none.

## Validation and review

67 cases across 5 suites pass: 34 selected, 33 supporting. The selected baseline was 24. Each commit's tests pass at that commit, shuffled with seed `270101`; full client vue-tsc passes at the tip; ESLint, Prettier and hooks pass. [Independent review](reviews/batch27/review.md) approved all five commits.

Commits: `bc8dfc35982` (parseInvocation), `dac5a513896` (MyToolsLanding), `e36e367c9a5` (page factories + PageEditorView), `b60a3fce923` (PageDisplayToolbar), `7abeb84114c` (layout).
