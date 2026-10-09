# issue_23914_page_card_actions — polish debrief

Polished at `93a34e9a739` on `jmchilton/issue_23914_page_card_actions`, base `dev`.

## CI
- Fork CI on `617f8a2f6d0` was all queued when polishing started, with no reds. It needs checking on `93a34e9a739`.

## Checklist (GENERAL)
- Everything passed. The human-read item is left for John.
- Confirmed that with dev's `PageCard.vue`, exactly the 3 transition tests fail; the control and the 4 older tests pass.
- Inline `computed` is enough; a composable like #23909's isn't needed. Those composables serve two consumers each, and `PageCard` has one.
- Applied: `title` was also a plain object built at setup, the same bug. It's now `computed<Title>`, with a rename test that fails on the previous commit.
- Local checks: `PageEditor` + `GCard` suites 178/178, `vue-tsc` clean, eslint and prettier clean.

## Strengthening round (applied)
- The rename, delete and restore cases can't reach a mounted card today, for three reasons:
  - Cards are keyed by `page.id`, and `HistoryPageView` remounts the list on every load.
  - Titles sync only while the editor is open.
  - The list fetch doesn't include deleted pages.

  The table now shows only the user-store rows, which are the real bug. The prop rows moved to a details block that says plainly they're future-proofing.
- Added highlighted lines on why there's no composable, and that no other card on `dev` still builds plain action arrays.
- Reworded the "what does the user see when it fails" answer. It described the fix, not the failure.

## Left over / for John
- A Playwright test that delays `/api/users/current` would show the race in a browser and drop the "probably rare" hedge. It's a SCOPE QUESTION, given the cost.
- The checklist reviewer flagged zip-import components that build plain arrays from props at setup: `ZipImportSummary.vue:39,47`, `RegularZipView.vue:26`, `ZipFileEntryCard.vue:43` and `RoCrateZipView.vue:23`. They aren't cards and are lower risk. Not mentioned in the PR.
- The test file mixes mount styles. The older tests use Vue 2-style `localVue`/`propsData`; the new block uses VTU2 `global`/`props` with a real Pinia, which a real store needs. Left as is.
