# DatasetCopy

Selected originator: `client/src/components/Dataset/DatasetCopy.test.js`. Baseline **9 tests** → final **12 tests**.

Each case now serves only what it needs through `serveHistories(histories, contents)`, which records whose contents were requested, and `serveCopy(targetHistoryIds)`, which records each copy request's source history and body. `mountDatasetCopy({ currentHistory })` mounts with a fresh Pinia per test (the old module-level `createPinia()` was shared by every case), `withPlugins`, and the original `RouterLink` stub. The never-requested `/api/histories/{history_id}` handler, the duplicated handlers in the "new history" case, and the `localize` directive stub are gone, so the real directive runs. Selectors are by `data-description` and button text instead of `g-blue`/`g-outline` classes and the first checkbox on the page. Wrappers unmount automatically.

Current history: the original called `setCurrentHistoryId("h1")` after mount without storing `h1`. `currentHistoryId` ignores unstored ids, so the seed was vacuous and the component always took its "first listed history" fallback. `seedCurrentHistory`, called before mount, makes it real; the component only reads it once `/api/histories` answers. (The first draft seeded after mount, copying the vacuous original; review asked for setup first, and the coverage compare is unchanged.) Two cases cover what that changes: "sources the current history even when it is not listed first" (new: contents requested for `h2`), and an `it.each` fallback for a current history that "is not listed" or "is not known". The "not known" row mounts without a seed, which keeps the original's store fallback path (`historyStore.ts` 147/153/165, branch 164) and `sorting.js` covered; an earlier draft without it lost them.

Preserved scenarios and assertions:
- Mount: both history names are still asserted. `toContain("A")`/`toContain("B")` were vacuous ("Select All" contains "A"), so they became the item labels `"1: A"`/`"2: B"`. It also asserts contents were loaded for `h1`.
- Copy selected: the old handler returned 400 unless `source_content` was non-empty. Now the full request body (`source_content: [{ id: "d1", type: "dataset" }]`, no targets, no name) and source `h1` are asserted, plus the `/1 item[s]? copied/` text.
- Nothing selected: same message, and now no copy request is made.
- API error: same "Copy failed" text.
- Select/Unselect All: the `wrapper.vm.sourceContentSelection` reads became the rendered checkboxes' `checked` state.
- Single existing target and multiple targets: `toContain("H1")`/`toContain("H2")` were vacuous, because both names always render in the history pickers. They became the success alert's history links, `["H1"]` and `["H1", "H2"]`. The multiple case checks the target checkboxes instead of assigning `wrapper.vm.targetMultiSelections`, and asserts `target_history_ids: ["h1", "h2"]`.
- New history: same text checks. The name is asserted as the alert link, and the request carries `target_history_name: "New History"`.
- Search input labels: unchanged.

The replacements fail when they should. If the copy answers with an unlisted id, both link checks fail. Without a typed name, the new-history link check fails. If `seedCurrentHistory` doesn't store the history, "not listed first" fails.

Coverage: no file lost lines or branches. `DatasetCopy.vue` is unchanged (104 lines, 84 branches). `historyStore.ts` went from 56/5 to 59/7, and the localization plugin and utils gained.

Reuse: `seedCurrentHistory` (added in this batch), `getFakeHistorySummary`, `withPlugins`, `useServerMock`.

Validation: 12 tests pass shuffled (seed `390101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and full `vue-tsc --noEmit` pass.

Guidance: `setCurrentHistoryId` on an unstored id is a silent no-op for `currentHistoryId`. The README's Pinia note could say "store the history first (or use `seedCurrentHistory`)".
