# galaxy#23472 — Add a command palette (Cmd/Ctrl+K) with scoped search, actions and inline help

https://github.com/galaxyproject/galaxy/pull/23472 · author itisAliRH · head reviewed `322cc31967c` · 2026-09-26

Client-only, 65 files, +8854/-17. Worktree: `~/projects/worktrees/galaxy/pr/23472`.

## Summary

Adds a provider-based command palette (histories, datasets, tools, workflows, invocations, pages,
visualizations, interactive tools, navigation, actions) with scopes, MRU, inline help. Architecture
(provider interface + state machine) is reasonable. One real regression in shared history store use.

## Prior review (davelopez)

COMMENTED 2026-09-21, APPROVED 2026-09-25 after author replies. Addressed points check out; GalaxyAI
router fix is sound (#23526 is in base). But much of his point 2 and parts of 4/5 were deferred to
draft #23473 and remain in this head:
- store-first / recent-row / limits duplication (`dedupeById`, `latestFirst`, `fetchQuietly`, recent fallback ×6)
- `actions.ts` → `workflows.ts` import (`actions.ts:22`)
- `createTitledPage` retrying on regex match of "must be unique"
- `extends PaletteItem` with underscore-stripped fields
- `as unknown as` casts in `histories.ts`
- per-provider `trim()`

Ask: cherry-pick those #23473 commits here, or merge back-to-back.

## Findings

### Blocker
None.

### Major
1. **History switcher pagination regression.** Palette is the only caller of `loadHistories(false, …)`;
   that path resets `historiesOffset` to 0 (`historyStore.ts:497`) and holds `historiesLoading`.
   `refreshListWhenStale` repeats it every 60s (`providers/histories.ts:185`). A concurrent
   `HistoryScrollList.loadMore` is silently dropped (`historyStore.ts:534-536`) and next page restarts
   at offset 0. Fix: merge-only fetch that leaves pagination state alone + store test.
2. **Activity gating now in three places.** `providers/navigation.ts:74-91` copies user-defined-tools,
   interactivetools, galaxyai checks from `ActivityBar.vue:137-147,151-156`. Extract shared
   `isActivityAvailable`.

### Minor
- Named history create: legacy `create_new_current` already takes `name` (`controllers/history.py:354`);
  pass through `createAndSelectNewHistory` instead of new POST + set-current (which can skip selecting).
- Cmd/Ctrl+K listener ignores `event.defaultPrevented` (Monaco editors — verify); `event.key` misses
  non-Latin layouts (consider `event.code`).
- Root tool searches flip shared `toolStore.loading`; first open can start two full toolbox fetches in parallel.
- `void setCurrentHistory` / `void createNewHistory` can reject with no toast.
- `useRecentPaletteItems` reimplements `useUserLocalStorage`; stores entity names in localStorage that survive logout.
- `utils/slug.ts` vs `SlugInput.vue` slug rules disagree.
- `h:` "My histories" can list foreign histories opened by id.
- a11y: no active-descendant / live region while category row selected; masthead button accessible name is just "⌘K".

### Nits
- `PAGE_MRU_TYPE` breaks `*_RECENT_TYPE` naming.
- Dead / test-only exports: `reset`, `scope`, `clearRecentItems`, `ResultSection`.
- English "updated " baked into `utils/dates`.
- Very long docstrings.

## Reuse opportunities
`useUserLocalStorage`, `createAndSelectNewHistory` w/ `name`, shared activity-availability helper
with `ActivityBar.vue`, single slug util shared with `SlugInput.vue`.

## Tests
Not run: `client/node_modules` absent, local node 25.6.1 (needs pinned 22.20.0).
~260 cases (~4.3k lines), mostly meaningful; no existing tests weakened (Masthead count 4→5 correct).
Low value: `useCommandPalette.test`, exact-label check in `categories.test`, `rankPaletteItems` cases.
Missing: Selenium/Playwright smoke test; test for history offset/loading interaction.
No `v-html` — rows plain text, no XSS surface.

## Suggested verdict
COMMENT. No blockers; fix Major 1 before merge.

## Draft GitHub review

> Note: reconstructed from the reviewer's findings (original draft lost to a disk-full write failure).

*Posted by Claude (AI assistant) on behalf of @jmchilton — not authored by them personally.*

Thanks for this — the provider/state-machine structure reads well and the test suite is substantial. A few things before merge:

**History switcher regression (please fix).** The palette is the only caller of `loadHistories(false, …)`, which resets `historiesOffset` to 0 and holds `historiesLoading` (`historyStore.ts:497`). `refreshListWhenStale` re-runs it every 60s (`histories.ts:185`), so a `HistoryScrollList.loadMore` that lands meanwhile is dropped (`historyStore.ts:534-536`) and the next page restarts from 0. A merge-only fetch that leaves pagination state alone, plus a store test for the interaction, would cover it.

**Activity gating duplicated.** `navigation.ts:74-91` repeats the availability checks from `ActivityBar.vue:137-156`. Could these share one `isActivityAvailable` helper so they can't drift?

**Deferred items from the earlier review.** Several points from the prior review were moved to #23473 but are still in this head (provider dedupe/recent-fallback duplication, `actions.ts` → `workflows.ts` import, `createTitledPage` retry on "must be unique", `as unknown as` casts in `histories.ts`, per-provider `trim()`). Would you consider pulling those commits in here, or merging the two back-to-back?

Smaller things:
- `create_new_current` already accepts `name` (`controllers/history.py:354`); passing it via `createAndSelectNewHistory` would replace the new POST + set-current path.
- Cmd/Ctrl+K handler: respect `event.defaultPrevented` (Monaco), and `event.key` misses non-Latin layouts.
- Root tool searches toggle shared `toolStore.loading`; first open can fire two full toolbox fetches.
- `void setCurrentHistory` / `void createNewHistory` rejections surface no toast.
- `useRecentPaletteItems` could build on `useUserLocalStorage`; entity names persist in localStorage after logout.
- `utils/slug.ts` and `SlugInput.vue` use different slug rules.
- `h:` "My histories" can include foreign histories opened by id.
- a11y: no active-descendant/live region while the category row is selected; masthead button's accessible name is just "⌘K".
- Nits: `PAGE_MRU_TYPE` vs `*_RECENT_TYPE`; unused/test-only exports (`reset`, `scope`, `clearRecentItems`, `ResultSection`); English "updated " in `utils/dates`.

Finally, a Selenium/Playwright smoke test (open palette, search, select) would be valuable given the size.

## Follow-up

Merged as `c8708dd3cb3` on 2026-09-26. Four branches off the merge, none opened as PRs:

- `command_palette_selenium_tests` (`38a3762a158`) — the missing E2E coverage. Seven tests, 7/7 under both backends.
- `palette_history_list_pagination` (`e97df0f2e56`) — Major 1. `fetchOwnHistories`, a merge-only own-history fetch
  that leaves `historiesOffset` and `historiesLoading` to `HistoryScrollList`. Both halves of the regression
  reproduced red first (offset reset to 0; the concurrent paginated load never fetched).
- `shared_activity_availability` (`a0bcfac16fe`) — Major 2. The gates were duplicated in *three* places, not two:
  `ActivityBar.vue`'s getter, its setter with the conditions negated, and `providers/navigation.ts`.
- `palette_followup_fixes` (`c4e5f7e6d96`) — three of the smaller findings, one per commit:
  - `visualizations.test.ts` pinned to a fixed zone with `timezone-mock`, the way `utils/dates.test.ts` already does.
    Its fixture update time was midnight UTC, so the subtitle assertion only held at offset >= 0 — green in CI, red
    across the Americas. Verified under UTC, America/New_York and Pacific/Auckland.
  - Failed palette actions now toast. `handler` / `secondaryAction.run` may return a promise, and `CommandPalette.vue`
    catches it centrally, so a provider cannot drop a rejection by forgetting to catch. `createNewHistory` and the
    history "Set as current" secondary were both `void`ed.
  - Named history create collapsed onto `create_new_current`, which already takes a `name` and makes the history
    current in the same request. The old named branch POSTed `/api/histories` then called `setCurrentHistory`, whose
    `if (!changingCurrentHistory.value)` guard returns silently when a switch is already in flight — so the history
    was created and left unselected. Red-to-green store test drives a held-open switch concurrently.

Still unaddressed: the deferred #23473 items, and the rest of the Minor/Nit list above — notably `usePaletteModifiers.ts:34`
ignoring `event.defaultPrevented` (steals ⌘K from Monaco).
