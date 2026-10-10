# PageDisplayToolbar

Selected originator: `client/src/components/PageEditor/PageDisplayToolbar.test.ts`. Baseline and final: **18 tests**.

Each case now mounts its own toolbar with `mountToolbar(mode, stubs)`. That helper seeds the loaded "My Page" store state and returns `{ wrapper, store }`. This replaces the module-level `let pinia`, the shared `wrapper`/`store` variables and the per-describe mounting `beforeEach`. As a result, the two saved-feedback cases no longer mount a second wrapper on top of the shared one, and `mountEditorWithSavedIndicatorSpy()` removes their duplicated stub setup. The helper's doc says why the page starts dirty: its current title and content differ from the store's never-saved originals. The "Unsaved" case keeps its explicit `isDirty` precondition. `getFakePageDetails` replaces the `as HistoryPageDetails` page cast, and the new shared `getFakePageRevisionSummary` replaces the `as PageRevisionSummary[]` revisions. The mount uses `props`/`withPlugins(localVue, pinia)`, and stubs merge over `localVue.stubs`. `enableAutoUnmount` replaces manual unmounts, `nextTick` replaces `wrapper.vm.$nextTick`, `setValue` replaces the manual value-plus-input event, and the modal confirm selector joins `SELECTORS`. Removed dead setup: the `ChangesIndicator.name` mutation of the production component, a `flushPromises` before anything was mounted, `vi.clearAllMocks`, `vi.useRealTimers` (no fake timers), `vi.restoreAllMocks` (nothing spied), and a no-op `$nextTick` in the Unsaved case.

All 18 scenarios are kept, and every assertion keeps its expected value:

- toolbar presence and pressed states in both modes
- rename button and title
- "Untitled Notebook" fallback
- Unsaved indicator text with its precondition
- disabled save with `canSave` false
- back label and back emit
- Preview text and emit
- rename modal prefill and `updateTitle("Renamed Page")`. The rename case's opening rename-button existence check is not repeated there. The identical check on identical setup remains in the rename-button/title case, and clicking a missing button would throw.
- `savePage` call
- saved-indicator flash on success and none on failure
- Revisions text, `toggleRevisions`, badge "2"
- edit emit

Page and revision identities (`page-1`, `history-1`, `My Page`, `# Hello`, `rev-1`/`rev-2`) are unchanged. The unasserted page `update_time` and the revisions' empty timestamps now come from factory defaults, and the page picks up factory fields such as `deleted: false` (the Edit button's `:disabled` reads it the same as the original `undefined`).

Red checks: without the `ChangesIndicator.name` mutation, the stub still applies by `<script setup>` name. Renaming the stub key makes "flashes the saved indicator" fail, so the mutation was dead and the stub is live.

Reuse: `getFakePageDetails` (existing); `getFakePageRevisionSummary` (added in the preceding `pages.ts` commit; see [pages](pages.md)); `withPlugins`.

Validation: 18 tests pass shuffled (seed `270101`, `NODE_OPTIONS=--no-webstorage`). Scoped ESLint and Prettier pass; full `vue-tsc --noEmit` passes.

Guidance: a `<script setup>` child is matched in `stubs` by its file-derived name, so tests need not assign `name` onto imported SFCs. Evidence: here, and in `Workflow/Editor/Index.test.ts` (the README's "Stub with methods" example). Deleting that file's three `.name =` lines leaves its 30 tests passing. Renaming the `ChangesIndicator`/`ActivityBar` stub keys then fails 21. Its comment claiming the assignment is required is stale. That is a follow-up, not touched here.
