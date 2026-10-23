# Test challenges debrief — PR #24394 (c1e5f3fd6e0)

Read-only review; recommendations only.

## Tests added
- `client/src/composables/upload/uploadTableSorting.test.ts` (5 tests, composable unit).
- `client/src/components/Panels/Upload/methods/LocalFileUpload.test.ts` (5 tests, component mount; drives header click, remove button, file input, collection config, `prepareUpload()`).

## Challenges
- **Component tests (LocalFileUpload)**: good shape — behavior through the DOM and the exposed `prepareUpload()` contract, not internals. Keep. `uploadDefaults` mock duplicates the identical block in `PasteLinksUpload.test.ts`; a shared mock factory (e.g. in `@tests/vitest`) would avoid a third copy.
- **Composable tests**: "sorts in place" and "applies the active sort to items added later" are duplicated by LocalFileUpload "uploads in sorted order" / "keeps files added after sorting". Drop those two; keep comparator edge cases (numeric vs string, nulls last, accessor) and "keeps added order until sorted" (no component test covers it).
- **Wiring in other 4 methods untested**: PasteContent (with new Blob size accessor), PasteLinks, RemoteFiles, DataLibrary each get the binding with no test. PasteLinks already has a component test file to extend cheaply (sort by Name, assert `prepareUpload()` order).
- **E2E gap**: the core bug is server-visible (request order, list:paired pairing). Component test only checks the prepared payload. `test_upload_activity_collection.py` already has a paste-links `list:paired` test and helpers; a sibling test that pastes URLs out of order, clicks the Name header, builds list:paired and asserts the resulting pair identifiers/forward-reverse would cover the regression end to end. Needs a navigation.yml selector for the sortable name header.
- No mocks of layout; no implementation-detail assertions beyond `aria-sort` (acceptable, it is the visible state).
