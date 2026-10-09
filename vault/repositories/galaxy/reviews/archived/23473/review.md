# galaxy#23473 — Command palette: configuration options, anonymous access and a navigation scope

https://github.com/galaxyproject/galaxy/pull/23473 · author itisAliRH · head reviewed `96281292860` · 2026-10-05
(previous pass at `312d2fbe6a3`, 2026-09-28; that draft was never posted)

70 files, +3979/-1977, base dev. Worktree: `~/projects/worktrees/galaxy/pr/23473`. Merge base
`931bdcff826` (dev after the Vue 3 merge #20787). CI: 60 pass, 2 skipped, mergeable.

## Thread since last pass
- davelopez agentic review (09-29, at `312d2fbe6a3`): factory for histories/workflows/reports,
  split `usePaletteSearch`, centralize anonymous gating, fold datasets/invocations into
  `StoreFirstList`, shared row helpers, `useRegistrationTarget`, computed context, slug policy to the
  api layer, and questioned the options (keep 2, drop `allow_anonymous` and `placeholder`).
- Author (10-01): did all of it except the `usePaletteSearch` selection/fan-out split (offered as
  follow-up) and `Promise<void>`. Reports keeps its own provider; datasets stays off `StoreFirstList`.
- davelopez approved (10-02, at `8a32f946eb3`).
- Author rebased onto post-#20787 dev (10-05), plus three commits: VTU 2 ports of the new palette
  spec helpers, typed lookups, and `useCommandPalette` reading `useConfigStore()` directly (no
  `useConfig()` mount reload; fixed `App.test.ts`).

## Summary
Now two options only: `enable_command_palette` (default true) and
`command_palette_disabled_providers` (UI-only, unknown ids warn in the console). Anonymous users get
the palette whenever it's enabled; `wp:`/`hp:`/`rp:`/`n:` and the root search's public results are
open to them, login-only providers are skipped centrally (`isProviderAvailable`). The
`defineListingProvider` factory (`listingProvider.ts`) is a clean reuse of `StoreFirstList` and
removes most of the triplication. The config-store gate is correct: the store loads itself on
creation, and `paletteEnabled` waits for `isLoaded`. No Vue 3 fallout found. One open concern of
substance remains: root search request volume.

## Status of previous draft findings

| Old finding | Status at `96281292860` |
|---|---|
| **Major 1: root fan-out sends ~6 backend searches per keystroke** | **Still present.** `rootListItems` (`storeFirst.ts:104-125`) still searches each root listing per debounced keystroke (`SEARCH_DEBOUNCE = 150`, `usePaletteSearch.ts:16`); signed-in: histories shared+published, workflows shared+published (`histories.ts:175`, `workflows.ts:14`), published reports (`reports.ts:130`), plus tools from 3 chars, 25 rows each (`limits.ts`). Stale results are dropped (`usePaletteSearch.ts:195`) but nothing is aborted. Anonymous now always gets the 3 published searches (allow_anonymous was dropped); the only admin lever is disabling whole providers, which also removes `hp:`/`wp:`/`rp:`. davelopez noted the load but treated `disabled_providers` as the answer. Also new: first root search hydrates the own list once (`hydrateOnce`, `storeFirst.ts:88`) — one-off, fine. |
| **Major 2: activity gating duplicated** | **Still present.** `navigation.ts:75-92` vs `ActivityBar.vue:136-161` (getter + negated setter). Our `shared_activity_availability` branch (`isActivityAvailable` in `activitySetup.ts`) still fits. |
| 3: `disabled_providers` unvalidated, `interactiveTools` camelCase, `pages` id | Partly fixed: console warning on unknown ids (`providers/index.ts:48-55`), docs list valid ids. `pages` is moot (option never shipped). **`interactiveTools` camelCase remains** in a snake_case admin config — becomes permanent once released. No schema `enum`; warn-only is acceptable. |
| 4: docs don't say UI-only | Fixed (schema/sample/rst). |
| 5: `paletteEnabled` treats unloaded user as registered | Obsolete: `allow_anonymous` dropped; gate is config-only (`useCommandPalette.ts:22`). |
| 6: login/registration copied from masthead | Registration fixed (`useRegistrationTarget.ts`, used by both). Login still diverges: palette row always `/login/start?redirect=` (`CommandPalette.vue:107`), masthead `performLogin` jumps to a single OIDC provider when local accounts are off (`Masthead.vue:62-69`). One extra click on those instances; dropped as minor. |
| 7: row caps outside `PALETTE_LIMITS` | Fixed (`limits.ts`, every section 8). |
| 8: stores diverging; visualization `isLoading` shared across keys | Divergence reduced by the factory. Shared `isLoading` (`visualizationStore.ts:98,120`) remains but matched pre-PR behavior; dropped. |
| 9: Cmd/Ctrl+K ignores `defaultPrevented`; slug regex | Slug fixed (`api/pages.ts:102-122`, `err_code`). Cmd/Ctrl+K unchanged (`usePaletteModifiers.ts:47`), pre-existing from #23472; dropped here. |
| 10: `provider.id === "tools"` | Fixed: `rootScore` on the provider (`tools.ts:109`, `usePaletteSearch.ts:126`). |
| Nits (`configuration.py` comment, dense comments, `PAGE_MRU_TYPE`, "updated ") | Remain (`configuration.py:240`, `reports.ts:21`, `utils/dates.ts:51`). Dropped as preference. |

## New since `312d2fbe6a3`
- `defineListingProvider` / `StoreFirstList`: good. `rootListings: {anonymous, signedIn}` declares
  the anonymous split instead of branching per provider. `StoreFirstList.isComplete` contract now
  documented. Reports staying off the factory is justified in a comment (`reports.ts:115`).
- `historyStore.ownHistoriesLoaded` (`historyStore.ts:123,538-541,611`): only an unfiltered,
  short-of-limit fetch counts as the own listing — fixes the "current history alone looks loaded"
  case. Correct.
- Config-store gate: correct, no concern.
- Ported tests: the palette spec still passes `{ localVue, router, pinia }` to `mount`; that's the
  repo-wide VTU adapter (`tests/vitest/__mocks__/vue-test-utils-adapter.ts`), not a leftover.
- Vue 3 fallout: none functional. Stale comment `usePaletteSearch.ts:205` ("Vue 2 never sees a
  section replaced in place") — trivia, not raised.
- Selenium `test_command_palette.py` section id updated to `navigation:results`; not run.

## Tests
- `pnpm install --frozen-lockfile` was needed (node_modules predated Vue 3). Ran 37 vitest files with
  node 22.20.0: CommandPalette/**, useCommandPalette, useRegistrationTarget, Masthead, pageStore,
  visualizationStore, historyStore(.lists), api/pages, entry/analysis. **486/486 passed.**
- No weakened tests seen in the new commits; VTU 2 ports are mechanical.
- Still no E2E for the logged-out flow; not worth blocking on.

## Risks

Mostly a two-way door; the one-way part is the two new `galaxy.yml` options — their names and the provider id list (including camelCase `interactiveTools`) become admin config that needs a deprecation path to change.

<details><summary>Risk Details</summary>

- `enable_command_palette` and `command_palette_disabled_providers` are new admin-facing config; renaming either, or any provider id they accept, later breaks existing galaxy.yml files silently (unknown ids only warn in the browser console).
- `interactiveTools` is the only camelCase value admins will type in an otherwise snake_case config.
- Anonymous access is unconditional when the palette is enabled; public instances get published history/workflow/report searches from every logged-out visitor typing in the palette. Client-only and tunable later, so two-way, but it's a load change on day one.
- Everything else (providers, scopes, `n:`, factory/refactors, store bookkeeping) is client code that can be changed without user-facing commitments beyond learned shortcuts.

</details>

<details><summary>Risk Review Advice</summary>

Settle the provider ids now, since they are the part that can't be cheaply walked back after a release: either accept the camelCase id knowingly or switch to `interactive_tools` before merge. For the root fan-out, judge whether five or six parallel 25-row searches per debounced keystroke is acceptable on usegalaxy.* scale with anonymous traffic, or whether aborting superseded requests / a longer debounce for backend root searches should land with or soon after this PR.

</details>

## Suggested verdict
APPROVE. davelopez's structural points are addressed and the code is in good shape. Two non-blocking
notes: root fan-out volume (abort/debounce follow-up) and the `interactiveTools` id before release.
Mention the activity-gating helper branch as an offer, not a request.

## Draft GitHub review

*Drafted by Claude (AI assistant) on behalf of jmchilton - not personally authored.*

Approving. The `defineListingProvider` factory and the central login-only gating read much better than the previous pass, and the config-store gate is right (the store loads itself, `paletteEnabled` waits for it). Palette, masthead and store vitest suites pass locally on the rebased head (486/486, node 22.20).

Two non-blocking notes:

- **Root search volume.** Each debounced keystroke (150 ms, ≥2 chars) still sends the shared and published history searches, shared and published workflow searches and published reports, plus tools from 3 chars, 25 rows each (`storeFirst.ts:104-125`). Superseded answers are dropped but the requests aren't aborted, and logged-out visitors now always send the three published ones. Disabling a provider is the only lever, and it also removes `hp:`/`wp:`/`rp:`. Aborting superseded root searches, or a longer debounce for the backend part of the root search, seems worth a follow-up.
- **`interactiveTools` id.** It becomes a value admins write in `command_palette_disabled_providers`, and it's the only camelCase one in an otherwise snake_case config. Worth deciding before this ships, since changing it later means a deprecation path.

Separately, the activity checks in `navigation.ts:75-92` still mirror `ActivityBar.vue:136-161`. I have a branch extracting a shared `isActivityAvailable` into `activitySetup.ts` and can open it as a follow-up.
