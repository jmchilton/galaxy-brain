# galaxy #23925 - Move the Tool Shed frontend onto galaxy-ui and the Galaxy brand

- PR: https://github.com/galaxyproject/galaxy/pull/23925 (dannon, +6662/-1633, 101 files, 58 commits)
- Head reviewed: `58f87d385276c2836e4652e342b12017f945a290`
- Base: merge-base with `origin/dev` = `50c165d1792`
- Builds on merged #23923 (GTable into galaxy-ui) and #23924 (galaxy-ui fixes for plain Vue 3)
- Worktree: `~/projects/worktrees/galaxy/pr/23925`
- Status: initial review written, draft unposted
- Verdict: **Comment**. Approve once the focus ring is fixed. Package-coupling items can be follow-ups.

## Summary

The shed frontend moves off Quasar onto `@galaxyproject/galaxy-ui`. Quasar is left only for three
`q-select`s. The PR also adopts `@galaxyproject/brand-tokens` and Atkinson Hyperlegible, and adds a
masthead, page headers, cards, a hero landing page and a two-column repository page.

The repository grid changes from a `q-table` to a hand-rolled paged `<ul>`, with a stale-response
guard. The PR also adds a few galaxy-ui test follow-ups: a `.native` portability check, and click
tests for GLink and GButton loading. The shed frontend CI now triggers on `client/packages/ui/**`.

Local checks, run with node 22.20.0 via pnpm:
- vitest: 173/173 pass.
- vue-tsc: clean.
- eslint: 0 errors, 10 non-null-assertion warnings.
- `vite build`: OK. JS is 657 kB (210 kB gzip) and CSS is 318 kB. The material icon webfonts are gone.

CI: Tool Shed frontend, all four Toolshed test matrix jobs (Playwright included), client unit and lint,
and Selenium/Playwright build-client are green. The red jobs are unrelated:
- "Test Galaxy packages" has Python collection errors in `galaxy.actions`/`galaxy.agents`.
- `test_history_options` failed on a Selenium `StaleElementReference` flake.

Tests were strengthened, not weakened. "Tidy the shed tests after Quasar" (`58f87d38527`) drops dead
`QPage` stubs, tightens RegisterPage's `mockPush` assertion to the actual route, and moves global and
timer cleanup into `afterEach`.
- Every removed Quasar-shaped assertion (`.q-chip` colour classes, `QExpansionItem` modelValue,
  `.q-icon` text) has a stricter replacement: badge modifier classes, `aria-expanded`/`aria-controls`
  on real buttons, and `data-icon`.
- `328b945195b` fixes an always-red RevisionsTab assertion by asserting more fields, not fewer.
- About 1,600 new test lines cover auth pages, the grid's paging and race handling, menus, the
  toolbar and util.

The Playwright selector updates in `lib/tool_shed/test/functional/` all resolve to classes that exist
in the new markup. The same goes for the `Locators` in `test/base/playwrightbrowser.py`, which I
checked one by one.

## Findings (ranked)

### 1. Global focus ring is now gold on white (accessibility regression), medium

- `lib/tool_shed/webapp/frontend/src/App.vue:81-83` sets
  `*:focus-visible { outline: 3px solid $accent !important }`.
- This PR changes `$accent` from `#63a0ca` to `#ffd700` (`src/quasar-variables.sass:7`).
- Gold on white is about 1.4:1, and on `--shed-page-bg` `#edf4fa` it is about 1.3:1. Both fail the
  3:1 non-text and focus-indicator contrast. Nearly all focusable content now sits on white cards or
  the light page.
- The rule's `!important` also overrides galaxy-ui's own focus styles. `GDropdown.vue:399` restyles
  `.dropdown-toggle:focus-visible` precisely because Bootstrap's ring fell below 3:1.
- Gold reads well on the dark masthead and page headers but not elsewhere. A fix could be:
  - a two-tone ring (dark outline plus gold halo);
  - primary blue on light surfaces with gold only inside `.shed-header`/`.page-header`;
  - or dropping the global `!important` and letting the package rings stand.
- This matters more because the PR leads with accessibility.

### 2. galaxy-ui leaks a client-only directive; the shed stubs it, medium (package abstraction)

- `client/packages/ui/src/components/GTable.vue:751,833,859,883` use `v-g-tooltip.hover`.
  galaxy-ui neither defines nor exports that directive.
- The shed registers a no-op in `src/main.ts:27`, and again in `vitest.setup.ts:8`. galaxy-ui's own
  `GTable.test.ts:43` stubs it too.
- So GTable's action tooltips silently become native `title`s in the second consumer. Every future
  consumer has to know to register the stub or face a warning on every render.
- The fix belongs in galaxy-ui: export a `vGTooltip` directive built on GTooltip, or move GTable onto
  the `GTooltip` component. Either way the package stops assuming a host-registered global.

### 3. galaxy-ui internal markup is now a styling contract, medium (one-way-ish)

- `src/styles/shed.css` restyles package internals by class name:
  - `.tabs .nav-tabs .nav-link(.active)` (lines 135-166);
  - `.g-table-container .g-table.table th/td`, `thead th.g-table-sorted` and `.g-table-compact`
    (171-219);
  - `input.g-form-input` and `.g-form-label .label-text` (228-256);
  - the content-link exclusion `a:where(:not(.dropdown-item, .nav-link, .g-button, .g-link))` (48, 59).
- Scoped `:deep()` rules also reach into `.dropdown-item`, `.g-button.g-transparent` and
  `.tab-content`. See `ShedToolbar.vue:122-157`, `ActionMenu.vue:37-64` and the HelpPage and Landing
  components.
- The client renames or reshapes these freely today. Now any such change silently breaks shed
  styling, and no test guards it.
- The reusable abstraction would be theming through package tokens, for example
  `--g-table-header-bg`, `--g-tab-active-indicator` or `--g-form-input-radius`, set from the shed's
  `:root`. Then the shed can stop re-declaring rules with extra qualifiers to outrank scoped package
  CSS. At minimum, galaxy-ui should document which class names are public.

### 4. Inconsistent v-model contracts in galaxy-ui; the shed works around them in 17 places, low-medium

- The shed's own `CLAUDE.md:134` says `GTabs`/`GCollapse` take `value` and emit `input`, so "v-model
  silently does nothing" on them under plain Vue 3. `GFormInput`/`GCheckbox` use `modelValue`.
- That is Vue 2 API debt in a package whose peers are now Vue 3 only, after #23924. It belongs in
  galaxy-ui. `RevisionsTab.vue:90` and `ToolHistoryTab.vue:123` hand-wire `:value` plus separate
  toggle state as a result.
- `GFormInput` does support `modelValue`, but the shed still unrolls it at 17 sites:
  `:model-value="x" @update:model-value="x = $event ?? ''"`. Examples are `LoginForm.vue`,
  `RegisterPage.vue`, `LandingSearchBox.vue` and `PaginatedRepositoriesGrid.vue:142-146`.
- The client writes plain `v-model` on GFormInput (about 15 sites in `client/src`). The shed only
  unrolls because the emit is `string | null` and its refs are `ref("")`.
- Either use `ref<string | null>` with `v-model`, or make GFormInput emit `string` for a non-null
  `modelValue`. Either is better than repeating the adapter.

### 5. Accretion: brand backdrop copied 3x while the shared utility is unused, low

- The grid-mesh gradient (dark to primary at 135deg, with the 24px mesh) is pasted into
  `PageHeader.vue:37-48`, `ModalForm.vue:29-40` and `LandingSearchBox.vue:~58-68`.
- `shed.css:128` defines `.shed-grid-dark` for the mesh, and nothing uses it.
- Fold the three copies into one `.shed-brand-backdrop` utility in `shed.css`, or into a token.
- Similarly, `.shed-visually-hidden` (`shed.css`) duplicates the `sr-only` the client gets from
  Bootstrap. A tiny visually-hidden utility or class in galaxy-ui would serve both consumers.

### 6. PaginatedRepositoriesGrid robustness, low

- `requestPage` (`PaginatedRepositoriesGrid.vue:71-99`) has no `try/finally`.
  - A rejected `onRequest` leaves `tableLoading` true forever: pager disabled, spinner stuck, and an
    unhandled rejection.
  - The q-table version had the same gap, but the new code owns the loop now, so it's cheap to fix.
- The filter fires a request per keystroke with no debounce. That is also unchanged from q-table, but
  `RepositoriesBySearch` already debounces, so the grid's own filter is now the odd one out.
- `<h2 class="grid-count">` (line 136) renders empty until the first response arrives. Render it
  only once `rowsNumber` is defined.
- A `rows_per_page` query of `abc` gives `NaN` for `pageCount`/`lastShown`. This predates the PR.

### 7. Lockfile coupling to galaxy-ui's package.json, low (process)

- `"@galaxyproject/galaxy-ui": "file:../../../../client/packages/ui"` resolves galaxy-ui's own deps
  and peers into the shed `pnpm-lock.yaml` (around line 2231).
- Any change to galaxy-ui's `dependencies` or `peerDependencies` now fails the shed's
  `--frozen-lockfile` until someone regenerates it. The new `client/packages/ui/**` CI trigger will
  surface that, which is good. Worth a line in the package README so client-side contributors know.
- `file:` installs by hard link, so editors that save atomically, and new files added to galaxy-ui,
  aren't picked up in shed dev until `pnpm install`.
- The barrel comment in `client/packages/ui/src/index.ts:1-2` still says the package is "consumed by
  the main Galaxy client through a Vite source alias". That is no longer the whole story.

### 8. Nits

- `src/quasar-variables.sass:5`: the comment about "auth pages use it as a backdrop and the fab
  clusters" is stale. The fabs are gone and the auth pages use the brand backdrop.
- `App.vue:29`: the "Skip link" comment now sits above the heading-metrics block. The masonry-grid
  rules (`App.vue:90-108`) look dead too.
- `RepositoryPage.vue:119-121`: three `console.log`s in `isUnknownRevision`. They predate the PR, but
  the file is heavily rewritten here, so drop them.
- `LandingSearchBox.vue`: hand-rolled Enter handling (`onEnter` with `repeat`/`isComposing` guards)
  plus a `role="search"` div. A `<GForm role="search" @submit.prevent>` with `type="submit"` gets
  Enter, IME and button behaviour natively, as `LoginForm` already does.
- `galaxy_logo.svg` is byte-identical to `static/favicon.svg` (repo root) and to the new
  `lib/tool_shed/webapp/frontend/static/favicon.svg`, which makes three copies.
- Out of scope and predating the PR: `RepositoryActions`/`RevisionActions` chain
  `.catch(notifyOnCatch).then(notify success)`, so the success toast fires after an error too.
  openapi-fetch also resolves on HTTP errors rather than rejecting.
- Out of scope, follow-up awareness: `test/base/playwrightbrowser.py:177` still targets
  `.q-menu .q-item` for SelectUser. That's fine now, but it will break with the q-select follow-up.

## Draft GitHub review (unposted)

> *Posted by Claude (AI assistant) on behalf of jmchilton. Not written by them personally.*
>
> This is a nice migration, and the test work stands out. The Quasar-shaped assertions were replaced
> with stricter ones (`aria-expanded`/`aria-controls` on real buttons, badge modifier classes,
> `data-icon`), not loosened. The shed suite roughly doubled in useful coverage, with auth pages, the
> grid's out-of-order responses, menus and util. I ran vitest (173/173), vue-tsc, eslint and build
> locally and all were clean. The shed Playwright jobs are green in CI.
>
> **One thing I'd fix before merge:**
>
> - **Focus ring contrast.** `App.vue` still has `*:focus-visible { outline: 3px solid $accent !important }`,
>   and this PR changes `$accent` from `#63a0ca` to `#ffd700`.
>   - Gold on white, or on the `#edf4fa` page background, is about 1.3-1.4:1. That is well under the
>     3:1 needed for a focus indicator, and most focusable things now sit on white cards.
>   - The `!important` also overrides galaxy-ui's own rings. GDropdown has one specifically because
>     Bootstrap's was under 3:1.
>   - Possible fixes: a two-tone ring (dark outline plus gold), gold only on the dark masthead and
>     page headers, or dropping the global override and letting the package rings stand.
>
> **galaxy-ui as a two-consumer package.** These aren't blockers for this PR, but I think they belong
> in the package rather than in the shed:
>
> - **`v-g-tooltip` leak.** GTable uses `v-g-tooltip`, which only the Galaxy client registers. The
>   shed and galaxy-ui's own GTable test both stub it as a no-op. Exporting a directive from
>   galaxy-ui, or moving GTable onto `GTooltip`, would stop every consumer having to know about it.
> - **v-model contracts.** `GTabs`/`GCollapse` still use `value`/`input`, while `GFormInput`/`GCheckbox`
>   use `modelValue`. The shed CLAUDE.md even warns that `v-model` silently no-ops on the first pair.
>   Now that the package is Vue-3-only, aligning them on `modelValue` seems worth a follow-up.
> - **GFormInput adapter.** The shed writes `:model-value="x" @update:model-value="x = $event ?? ''"`
>   at about 17 sites, where the client uses plain `v-model`. Either `ref<string | null>` with
>   `v-model`, or a GFormInput emit that doesn't widen to `null`, would remove the adapter.
> - **Internal class names.** `shed.css` and several `:deep()` rules restyle package internals by class
>   name: `.nav-tabs .nav-link.active`, `.g-table-container .g-table.table th`, `input.g-form-input`,
>   `.dropdown-item`, `.g-button.g-transparent`. That quietly makes them public API, and a rename on
>   the client side would break the shed with nothing failing. A handful of component-level tokens
>   (table header background, active-tab indicator, input radius) would give the shed a supported
>   theming hook. Failing that, a note in the package listing which classes are stable would help.
>
> **Smaller things:**
>
> - **`PaginatedRepositoriesGrid.requestPage`.** It has no `try/finally`, so a failed request leaves
>   `tableLoading` stuck and the pager disabled. The `grid-count` `<h2>` also renders empty until the
>   first response. The filter isn't debounced, unlike `RepositoriesBySearch`.
> - **Repeated grid-mesh gradient.** It is copied into PageHeader, ModalForm and LandingSearchBox,
>   while `shed.css` defines an unused `.shed-grid-dark`. One shared utility would do.
> - **Search box.** `LandingSearchBox` could be a `GForm` with a submit button rather than the manual
>   Enter, `repeat` and `isComposing` handling.
> - **Stale comments and dead CSS.**
>   - `quasar-variables.sass` still mentions fab clusters and auth backdrops.
>   - `App.vue`'s "Skip link" comment now sits on the heading block, and the masonry-grid rules look
>     unused.
> - **`RepositoryPage`.** It still has the three `console.log`s in `isUnknownRevision`. They aren't
>   new, but they're cheap to drop while you're in there.
> - **Package notes.**
>   - `client/packages/ui/src/index.ts` still describes the client as the only consumer.
>   - Changing galaxy-ui's `package.json` deps will now need the shed lockfile regenerated. The new CI
>     path trigger will catch it, but a line in the package README would help client contributors.

## Risks

Making galaxy-ui's internal class names, its mixed `value`/`modelValue` conventions and a
host-registered `v-g-tooltip` load-bearing for a second consumer is the one-way part. The shed visual
redesign itself is a reversible, UI-only change.

<details><summary>Risk Details</summary>

- The shed's `shed.css` and `:deep()` selectors depend on galaxy-ui internal markup: `.nav-tabs`,
  `.nav-link.active`, `.g-table.table`, `.g-table-sorted`, `.g-form-input`, `.label-text`,
  `.dropdown-item` and `.g-button.g-transparent`. Client-driven refactors of those components can
  silently break shed styling, and no test catches it.
- GTable's reliance on a client-registered `v-g-tooltip` is now baked into a second consumer as a
  no-op stub. Tooltips there degrade to native `title`.
- The `value`/`input` contract on GTabs and GCollapse is now relied on by shed code. Moving them to
  `modelValue` later becomes a cross-consumer migration.
- galaxy-ui `package.json` dependency or peer changes now need a shed lockfile regeneration, a new
  coupling for client contributors.
- User-facing: a substantial look-and-feel change for shed users. The navigation structure
  (Explore/user/Admin menus, login/help icons) and URLs are preserved, so there is little to relearn.
  The repository list is now a paged list without q-table chrome.
- Accessibility: the global gold focus ring is a regression on light surfaces, against otherwise real
  improvements (landmarks, skip link, single h1, labelled icon buttons, keyboard sort headers).
- The shed Playwright tests and `playwrightbrowser.py` selectors moved from Quasar to shed-owned
  class names. They all resolve today. The remaining `.q-menu .q-item` will move with the q-select
  follow-up.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should look less at the shed pages themselves, which are easy to iterate on, and more at
what this PR makes galaxy-ui promise. Decide whether the class names the shed restyles are now
public API. If they are, document or test them in galaxy-ui. If not, add component tokens before more
shed CSS accretes on them.

Also decide whether `v-g-tooltip` and the `value`/`input` components get fixed in galaxy-ui now,
while there are only two consumers, rather than after a third (Hub, IWC) adopts the package.

Before merge, check the focus ring on a keyboard pass over a white card page (repository page or
login), since that is the one user-visible regression found.

</details>
