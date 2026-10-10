# tests/test-data/pages.ts (revision factories)

Extended `client/tests/test-data/pages.ts` with `getFakePageRevisionSummary()` and `getFakePageRevisionDetails()`, typed against the generated `PageRevisionSummary`/`PageRevisionDetails` schemas. Defaults describe the latest revision of the page from `getFakePageSummary()`: id `rev789revisionid` (its `latest_revision_id`), page id `def456pageid`, `edit_source: "user"`, and the page summary's timestamps. Details add the same markdown content/editor content as `getFakePageDetails()`. Batch 01 and 02 deferred these factories until there were more consumers.

Consumers adopted in the helper commit:

- `client/src/components/PageEditor/PageEditorView.test.ts` (33 → 33 tests): the three `as PageRevisionDetails` selected-revision literals and the two `as PageRevisionSummary[]` revision lists use the factories. Their ID (`rev-1`), page ID (`PAGE_ID`), content, format and edit source are unchanged. The incidental `2024-01-01T00:00:00` and empty-string timestamps now come from the factory defaults, and the details now include the schema-required `content_editor` that the casts were hiding. No assertion reads any of these fields (`PageRevisionView`/`PageRevisionList` are shallow-stubbed, and the emitted IDs come from the test). The empty `[] as PageRevisionSummary[]` loses its unnecessary cast. Page-detail casts in that file are out of scope and were not touched.
- `client/src/components/PageEditor/PageDisplayToolbar.test.ts`: the originator, committed separately.

Considered and left alone:

- `stores/pageEditorStore.test.ts` keeps its local `createRevisionSummary`/`createRevisionDetails`. They use a day-per-revision convention (`rev-N` on `2025-01-0N`) and empty content, which many store cases rely on. A shared default would have to be overridden in every call.
- `PageRevisionList.test.ts` keeps `makeRevision`. A trial swap moved only incidental `id`/`page_id` defaults, but the longer name made Prettier wrap its many two-revision arrays across four lines each. That is a net readability loss.
- `PageRevisionView.test.ts` has one bespoke `REVISION` constant whose every field is scenario data.

Validation: PageEditorView 33 tests shuffled (seed `270101`); `pageEditorStore` and `api/pages` (other `pages.ts` consumers) 130 tests across the three suites. Scoped ESLint/Prettier and full `vue-tsc --noEmit` pass.
