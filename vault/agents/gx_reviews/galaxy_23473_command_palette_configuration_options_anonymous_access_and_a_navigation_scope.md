# galaxy#23473 — Command palette: configuration options, anonymous access and a navigation scope

https://github.com/galaxyproject/galaxy/pull/23473 · author itisAliRH · head reviewed `312d2fbe6a3` · 2026-09-28

63 files, +3571/-1710, base dev. Worktree: `~/projects/worktrees/galaxy/pr/23473`.
Merge base `07420debd2e` already has #23472 (`c8708dd3cb3`), #23750 (pagination) and #23749 (follow-up
fixes). `git diff $(merge-base) HEAD` matches `gh pr diff` (63 files, +3571/-1710), so none of the
#23472 commits are in it. No reviews yet. The only comment is the author's rebase note.

## Summary

The PR adds four config options, opens `wp:`/`hp:`/`rp:` and the root search's public results to
anonymous users, adds an `n:` navigation scope, and adds an incremental root fan-out that now searches shared and
public listings on the backend. It also contains most of the refactors deferred from #23472 (`storeFirst.ts`,
`workflowRows.ts`, `Gated<T>`, `toPaletteHistory`, `usePaletteSearch.ts`). Most of the -1710 is
the `pages` → `reports` rename and the move of search logic out of `CommandPalette.vue`. No
regressions found. The anonymous work is safe: every endpoint an anonymous user reaches is already
public, and the backend still enforces ownership. The main concern is backend load from the new root
fan-out.

## Findings

### Blocker
None.

### Major

1. **Root fan-out now sends up to six backend searches per keystroke, and anonymous access is on by default.**
   In #23472 the root search was cache-only for histories and pages. The test "filters the cache in the
   unscoped fan-out and never fetches there" was removed. Now each debounced keystroke (150 ms,
   `usePaletteSearch.ts:15`) with ≥2 characters runs:
   - shared + published histories (`histories.ts:239-243`)
   - shared + published workflows (`workflows.ts:74-78`)
   - published reports (`reports.ts:126-129`)
   - tools, from 3 characters on

   Each request asks for 25 rows (`storeFirst.ts:91-109`). A stale epoch only drops the answers
   (`usePaletteSearch.ts:214`). The requests are never aborted and aren't reused across keystrokes.
   Typing "rnaseq" sends about 25 requests. `command_palette_allow_anonymous` defaults to `true`, so on
   usegalaxy.* every logged-out visitor sends the published searches too. Options: a higher minimum or
   a longer debounce for root backend searches, an `AbortController`, or an admin switch that keeps
   the root search cache-only. At minimum, the config docs should say the root search queries public
   listings.
2. **Activity gating is still in three places (carried from #23472 Major 2).** `navigation.ts:75-91`
   repeats `ActivityBar.vue:138-156` (the getter, and the setter with the conditions negated). `n:`
   now makes this list user-facing and reachable by anonymous users, so the three copies drifting apart matters more. The branch
   `shared_activity_availability` (`a0bcfac16fe`) already extracts a shared helper.

### Minor

3. **`command_palette_disabled_providers` isn't validated** (`config_schema.yml:4758`).
   - A typo does nothing, silently.
   - The id `interactiveTools` is camelCase in an admin config that is otherwise snake_case.
   - This PR renamed `pages` to `reports`, so an admin who writes `pages` gets no effect and no warning.

   The schema already uses `enum` (e.g. `config_schema.yml:705`). An enum on the sequence items would
   reject bad ids at startup. Consider accepting `interactive_tools`. `default: []` would also remove
   the null normalization in `CommandPalette.vue` `buildContext` and the "never unset" note in
   `types.ts:17`.
4. **The docs don't say the options only affect the UI.** `command_palette_allow_anonymous: false` and
   `disabled_providers` hide UI only. The APIs stay reachable, which is fine because they are public
   or owner-checked. Admins may still read them as access controls, so one sentence in each
   description would help.
5. **`paletteEnabled` treats an unloaded user as registered** (`useCommandPalette.ts:22-27`).
   `isAnonymousUser(null)` is `false`, so with `allow_anonymous: false` the button and Cmd/Ctrl+K
   work for a moment after config loads and before the user loads. Also require a loaded user, like
   the existing "stays disabled until the configuration has landed" test does for config.
6. **The login and registration logic is copied from the masthead, and the copy has drifted.**
   - `CommandPalette.vue:88-110` repeats `Masthead.vue:61-99` (`performRegistration`, `hasOIDCRegistration`).
   - The palette's login row always goes to `/login/start`. The masthead's `performLogin` sends
     `disable_local_accounts` + single-OIDC instances straight to the provider.

   One composable (e.g. `useLoginRegistration`) used by both would fix the drift and give the
   palette the redirect for free.
7. **Row caps aren't all in `PALETTE_LIMITS`, despite the PR description.** `usePaletteSearch.ts:17-21`
   declares its own 8/5/15. `rootListItems` caps at `rootOwn + rootListing` = 8
   (`storeFirst.ts:108`), but the fan-out then cuts to 5 (`usePaletteSearch.ts:186,220`). So the
   8-row cap is never reached, and the "3 rows per variant" the PR describes only appears when those
   rows outrank the user's own.
8. **The stores are diverging, not converging on one pattern.**
   - Four stores now keep their own in-flight promise map: history, workflow, page, and visualization (new here).
   - There are three conventions for "a search that isn't the listing": `record: false` in the
     history and page stores, a per-query list key in the workflow store, and `if (!search)` in the
     visualization store.
   - The new visualization dedupe keys by variant/search/limit, but `isLoading` is shared, so the
     first request of several with different keys to finish clears it (`visualizationStore.ts:120`).

   A small shared in-flight helper would leave something reusable behind. Not a blocker.
9. **Carried from #23472:**
   - Cmd/Ctrl+K still ignores `event.defaultPrevented` and matches on `event.key`
     (`usePaletteModifiers.ts:47`), so it can take the shortcut away from Monaco.
   - The slug retry still regex-matches "must be unique". It moved to `pageStore.ts:34` but wasn't fixed.
10. `sectionScore` hard-codes `provider.id === "tools"` (`usePaletteSearch.ts:143`). A provider flag
    such as `backendRanked` would keep the orchestration free of provider names.

### Nits
- The comment at `configuration.py:242` says these keys are "intentionally visible to anonymous
  users". Every key in `ConfigSerializer` is visible to all users, so the comment is redundant and
  suggests the others aren't. Drop it.
- The comments are still dense, even after "trim the palette provider docs". There are several
  paragraph docstrings in `usePaletteSearch.ts`, the same `record` docstring is duplicated in
  `historyStore.ts` and `pageStore.ts`, and `Masthead.vue` has "the narrower the masthead…".
- `PAGE_MRU_TYPE` (`reports.ts:21`) still breaks the `*_RECENT_TYPE` naming. The English "updated "
  is still hard-coded in `utils/dates.ts:51`.

## Focus areas

- **Config:** all four options are in `config_schema.yml`, `galaxy.yml.sample`, `galaxy_options.rst` and
  `_galaxy_config_schema_attributes.py`, and in `ConfigSerializer`. `test_configuration.py` checks the
  keys for all users. Defaults load correctly (`True True None None`, checked with a
  `GalaxyAppConfiguration` load). The descriptions are good, apart from findings 3 and 4.
- **Anonymous:** the new anonymous paths reach public listings only: `is:published` workflows,
  `/api/histories/published`, published pages, and tools. Own, shared, dataset, invocation and
  visualization scopes stay `requiresLogin`, and the providers return `[]` for anonymous users. No
  backend change was needed or made. The MRU is stored per user (`useUserLocalStorageFromHashId`), so
  an anonymous session doesn't see the previous user's recents.
- **Navigation:** it reuses `defaultActivities` from `activitySetup.ts`, which is good. Five extra routes are
  hard-coded (`/user`, `/user/notifications`, `/tours`, `/datatypes`, `/about`). That's acceptable,
  because no registry for them exists. The gating copy is Major 2.
- **Deletions:**
  - `pages.ts`/`pages.test.ts` became `reports.ts`/`reports.test.ts`; the tests moved and grew.
  - Slug-retry and seeding tests moved to `pageStore.test.ts`.
  - The dead `reset()` and `fetchOrFail` were removed.
  - `ACTIONS` and `EXTRA_DESTINATIONS` were restructured to `Gated<T>`.
  - Nothing regressed.
- **Python:** only schema/serializer entries changed. No imports were added.

## Tests
- Ran 23 vitest files with node 22.20.0 (CommandPalette/*, useCommandPalette, Masthead, pageStore,
  visualizationStore, historyStore.lists). **390/390 passed.**
- Coverage of the config toggles and anonymous behaviour is good:
  - the enable × anonymous × user matrix in `useCommandPalette.test.ts`
  - Masthead hide and placeholder
  - the login prompt, lock icons, and disabled providers in `CommandPalette.test.ts`
- No tests were weakened. The removed assertions either moved with the rename, or changed on purpose
  because the root search now fetches.
- Missing: an E2E smoke test for the anonymous flow (logged out: Cmd+K, `hp:` finds a published
  history, `w:` shows the login row). The unmerged `command_palette_selenium_tests`
  (`38a3762a158`) would be the natural base. The API test for the new keys is sufficient; I didn't
  run it.

## Status of #23472 findings

| #23472 finding | Status here |
|---|---|
| Major 1: history switcher pagination | Fixed by #23750 (in base). `histories.ts` keeps `fetchOwnHistories`, and the root searches the own list cache-only. Not reintroduced. |
| Major 2: activity gating duplicated | **Carried.** Now more visible through `n:` (Major 2 here). |
| Deferred: dedupe/recent/fetchQuietly duplication | Fixed: `storeFirst.ts`, `recent.ts`, `dedupePaletteItemsByEntity`. |
| Deferred: `actions.ts` → `workflows.ts` import | Fixed: `workflowRows.ts`. |
| Deferred: `extends PaletteItem` + underscore stripping | Fixed: `Gated<T>` / `visibleFor`. |
| Deferred: `as unknown as` in histories | Fixed: `toPaletteHistory`. |
| Deferred: per-provider `trim()` | Fixed: the query is trimmed once. |
| Deferred: `createTitledPage` regex retry | **Moved, not fixed** (`pageStore.ts:34`). |
| Named history create | Fixed by #23749. |
| Cmd/Ctrl+K `defaultPrevented` / `event.key` | **Carried** (`usePaletteModifiers.ts:47`). |
| Root tool searches flip `toolStore.loading` | Carried (tools.ts unchanged in substance); not re-verified. |
| `void` rejections without toast | Fixed by #23749 (`runHandler`). |
| `useRecentPaletteItems` storage | Resolved: stored per hashed user. |
| `slug.ts` vs `SlugInput.vue` | `SlugInput.vue` no longer exists. The remaining slug editor (`EditableUrl.vue`) wasn't compared. |
| `h:` lists foreign histories opened by id | Carried (still `historyStore.histories`). |
| a11y active-descendant / masthead button name | Improved: `aria-activedescendant` is wired, and the button now has visible text. Live region not checked. |
| Nits (`PAGE_MRU_TYPE`, dead exports, "updated ") | `reset` removed and `ResultSection` now used. `PAGE_MRU_TYPE` and "updated " remain. |

## Suggested verdict
COMMENT. The config and anonymous work are sound. Ask for a decision on the root fan-out load (Major 1)
and the shared activity-availability helper before approving.

## Draft GitHub review

*Posted by Claude (AI assistant) on behalf of jmchilton - not personally authored.*

Thanks, this pulls in most of the refactors deferred from #23472 (`storeFirst.ts`, `workflowRows.ts`, `Gated<T>`, `toPaletteHistory`, `usePaletteSearch.ts`). The palette vitest suites pass locally (390/390). The anonymous access looks safe: every endpoint a logged-out user can now reach is already public, and the own, shared, dataset and invocation scopes stay gated.

**Root search load.** Before this PR, the root search answered histories and pages from the cache. Now every debounced keystroke (150 ms, ≥2 characters) sends shared and published history searches, shared and published workflow searches, published reports and tools. That's up to six requests of 25 rows each (`storeFirst.ts:91-109`, `histories.ts:239`, `workflows.ts:74`, `reports.ts:126`). Stale answers are dropped, but the requests are never aborted, and anonymous access is on by default, so on large public instances every visitor will send them. Could the root backend searches use a higher minimum or a longer debounce and abort superseded requests? Or could admins get a switch that keeps the root search cache-only?

**Activity gating is still copied.** `navigation.ts:75-91` repeats the checks in `ActivityBar.vue:138-156`, and `n:` now shows that list to anonymous users as well. A shared `isActivityAvailable` helper would keep them from drifting apart. I have one on a branch if that's useful.

Smaller things:
- `command_palette_disabled_providers` isn't validated. A typo or the old `pages` id does nothing and gives no warning, and `interactiveTools` is camelCase in an otherwise snake_case config. An `enum` on the sequence items (the schema already uses `enum`) would catch this at startup. `default: []` would remove the null normalization in `buildContext`.
- The option descriptions should say they only affect the UI (hiding the palette or a provider doesn't restrict any API), so admins don't treat them as access controls.
- `paletteEnabled` treats a user that hasn't loaded yet as registered (`isAnonymousUser(null)` is false), so with `command_palette_allow_anonymous: false` the shortcut works for a moment before the user loads.
- The login/register rows copy the masthead's logic (`CommandPalette.vue:88-110` vs `Masthead.vue:61-99`), and the copy has drifted: the palette always goes to `/login/start`, while `performLogin` sends single-OIDC instances straight to the provider. Could both use one composable?
- `usePaletteSearch.ts:17-21` declares its own 8/5/15 caps next to `PALETTE_LIMITS`. `rootListItems` caps at 8, but the fan-out then cuts to 5, so the "3 rows per variant" only shows when those rows outrank the user's own.
- Four stores now have their own in-flight promise maps, and there are three different ways to say "this search isn't the listing" (`record: false`, a per-query key, `if (!search)`). A small shared helper would be worth considering. Also, the new visualization dedupe shares one `isLoading` across different keys.
- Still open from #23472: Cmd/Ctrl+K ignores `event.defaultPrevented` (`usePaletteModifiers.ts:47`), and the slug retry still regex-matches "must be unique" (now in `pageStore.ts:34`).
- `sectionScore` checks for `provider.id === "tools"`. A provider flag would keep provider names out of the orchestration.
- Nit: the comment at `configuration.py:242` isn't needed, since every key in `ConfigSerializer` is visible to anonymous users.

A Selenium or Playwright smoke test of the logged-out flow (`hp:` finds a published history, `w:` shows the login row) would be good to add.
