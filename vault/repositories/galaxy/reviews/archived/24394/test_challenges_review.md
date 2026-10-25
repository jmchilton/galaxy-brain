# Test challenges review — PR #24394

- Profile: gx_test_challenger
- Model: Claude Opus 5.5, effort low
- Reviewed commit: c1e5f3fd6e0
- Debrief: [test_challenges_debrief.md](test_challenges_debrief.md)

Overall: tests are mostly good — LocalFileUpload component tests exercise the real bug through the DOM and `prepareUpload()`. Gaps are end-to-end coverage and wiring in the other four methods.

### P2 1: No E2E test for sorted list:paired upload
The bug is about what reaches Galaxy (request order, pairing). `test_upload_activity_collection.py::test_upload_activity_paste_links_as_paired_collection` and its helpers already exist; add a sibling that pastes URLs out of order, clicks the Name header, builds `list:paired`, and asserts pair identifiers / forward-reverse in the created collection. Add a navigation.yml selector for the sortable header.

### P3 1: Sorting wiring untested in Paste Content, Paste Links, Remote Files, Data Library
Only LocalFileUpload is covered. Paste Content adds a new Blob-size accessor (Size column previously didn't sort). Extend existing `PasteLinksUpload.test.ts` with a sort-then-`prepareUpload()` order check; consider one for Paste Content size sort.

### P3 2: Composable tests duplicate component tests
In `uploadTableSorting.test.ts`, "sorts the items in place" and "applies the active sort to items added later" restate LocalFileUpload tests. Drop them; keep comparator edge cases and "keeps the added order until a column is sorted".

### P3 3: Duplicated `uploadDefaults` vi.mock
Identical block now in `LocalFileUpload.test.ts` and `PasteLinksUpload.test.ts`; extract a shared mock factory.
