# PR 21961 — Replace BDropdown family with custom GDropdown components

- PR: https://github.com/galaxyproject/galaxy/pull/21961
- Author: dannon (plus a follow-on stack by itisAliRH: move into `packages/ui`, floating-ui placement, APG keyboard/a11y)
- Base: dev, +1949/-328, 52 files, not draft
- Head reviewed: `ebb729a48bb` (worktree `~/projects/worktrees/galaxy/pr/21961`, diffed against merge-base with fresh `origin/dev`)
- State: MERGEABLE / CLEAN, **APPROVED by itisAliRH** (their earlier CHANGES_REQUESTED — link cursor, links not closing menu, tooltip over open menu — is fixed and pinned by tests)
- CI (2026-09-25): 28/28 pass, including Selenium (3 shards), Playwright (3 shards), Integration Selenium, client-unit-test, client lint, build-client.
- Tests not run locally (read-only review; CI green covers it).

## Verdict

Good to merge. No bugs found. The component is careful, the migration is mechanical and complete, and e2e is green. There's one coordination point with #21959 (both hand-roll the floating-ui lifecycle) and two small test gaps. Nothing blocking.

## Summary of change

- New `client/packages/ui/src/components/GDropdown{,Item,ItemButton,Divider,Text,Group,Form}.vue` + `dropdownContext.ts` (`dropdownHideKey` inject), exported from `@galaxyproject/galaxy-ui`; thin re-export wrappers in `client/src/components/BaseComponents/`.
- GDropdown: Bootstrap 4 classes, BDropdown-compatible props (`text`, `variant`, `size`, `right`, `no-caret`, `dropup/left/right`, `block`, `split`, `toggle-class`, `menu-class`, `disabled`, `lazy`), `show`/`hide`/`click` events, exposed `show/hide/toggle`. Placement via `@floating-ui/dom` (`offset(2)`, `flip`, `shift`, same reference element as BDropdown for split/right-dropup). APG menu button: `aria-haspopup/expanded/controls`, `role=menu`/`menuitem`, arrows wrap, Home/End, Escape returns focus, focus-outside closes, Enter/Space-open focuses first item.
- `vGTooltip.ts`: hides the tooltip on toggle click (capture phase) and while a direct-child `aria-haspopup` toggle is expanded; moves the tooltip-derived `aria-label` onto the menu toggle unless the toggle already has a name. Covered by new `vGTooltip.test.ts`.
- 27 call sites migrated. Only leftover is `BNavItemDropdown` in `MastheadDropdown.vue` (intentional; it provides `dropdownHideKey` so `GDropdownItem` children close it). No other `BDropdown`/`b-dropdown` in `client/src` or `client/packages`.
- One selector change: `navigation.yml` `add_items_options` `... .dropdown-menu div a` -> `... .dropdown-menu a.dropdown-item` (the BV `<li>` wrapper is gone). Other Selenium selectors (`.dropdown-menu.show`, `a.dropdown-item`, `data-description`, `data-test-id`) still match, since `GDropdownItem` is always an `<a class="dropdown-item">` and non-prop attrs fall through to it the same way BV bound them to the inner `<a>`.

## Parity checks (all OK)

- Eager rendering: `lazy` defaults to false and the menu is `v-if="shouldRenderMenu"`. That matches BDropdown (eager unless `lazy`), so this is not the #21959 GPopover eager-mount problem. `lazy` is tested.
- Dropped props: `boundary="window"` (FilterMenuDropdown) and `no-flip` (DatasetDownload) go away because flip/shift against clipping ancestors replaces Popper. Stray `role="menu"`/`role="button"` on roots are removed, and `role` now sits correctly on the inner menu. `@show/@hide/@shown/@hidden` weren't used at any call site. `GTable`'s `@click.stop` on a non-split GDropdown was a no-op under BDropdown too.
- Item click closes the menu and refocuses the toggle only if focus was in the menu, same as BDropdownItem's `hide(true)`. Disabled router-link items render as plain `<a aria-disabled>` so they can't navigate (tested).
- Existing test edits are equivalent, not weakened (`bdropdownitem-stub[disabled]` -> `findAllComponents(GDropdownItem)` filtered on `props("disabled")`; `title` attr -> prop).

## Findings

### 1. Low (coordination / reuse) — second hand-rolled floating-ui lifecycle alongside #21959's `useFloatingPosition`

`GDropdown.vue:139-171` manages `computePosition` + `autoUpdate` + start/stop directly. #21959 (open, sibling) adds `packages/ui/src/composables/floatingPosition.ts` (`useFloatingPosition(reference, floating, active, getConfig)`) for exactly this lifecycle, including a generation guard against stale `computePosition` results that GDropdown lacks. The missing guard is harmless here: a late result only writes `top/left` onto a hidden menu. The two PRs only touch the same file in `packages/ui/src/index.ts` (adjacent export lines, trivial rebase).

Suggestion: whichever PR lands second moves GDropdown onto `useFloatingPosition(getMenuReference, menuEl, isOpen, () => ({placement, middleware}))`. The one thing GDropdown needs beyond that is "wait for the first position before focusing an item" (`menuPositioned`, `:80,124,220`). That could be `await update()` from the composable's return value, or the composable could expose a first-position promise. This is a follow-up, not a blocker.

### 2. Nit (tests) — two production paths without a direct test

- Outside mouse click closing the menu (`document` click capture, `GDropdown.vue:127,193-197`). Only the focus-outside path is tested (`GDropdown.test.ts:498`).
- Split button emitting `click` (`GDropdown.vue:271-273`), which `FormDataContextButtons.vue:135-141` depends on. Only split naming and placement are tested.

Both are a few lines each in the existing harness (`#outside` button is already mounted).

### 3. Nit — PR description is stale

It still says "Bootstrap 4 CSS classes for menu positioning" and "Migrates 27 files". It doesn't mention the move into `@galaxyproject/galaxy-ui`, floating-ui placement, APG keyboard support, or the `v-g-tooltip` behaviour change (a global directive). Worth refreshing for reviewers and the changelog.

## Reuse / abstraction assessment

Positive: lives in `packages/ui` next to GButton/GTooltip with thin BaseComponents wrappers. It reuses `useUid`, and the inject-based hide lets BNavItemDropdown host `GDropdownItem`s without a special-case component. The `vGTooltip` menu awareness is generic (`[aria-haspopup]`), so it also covers BNavItemDropdown.

Overlap:
- Positioning duplicates #21959's `useFloatingPosition` (finding 1).
- Outside-click/Escape handling now exists in `usePopper.ts`, GPopover (#21959) and GDropdown. GDropdown's version is menu-specific (focus-outside, focus return, nested-menu ownership), so it's reasonable to keep it local for now.
- `GDropdownItem` picks `router-link` vs `<a>` itself instead of `useClickableElement`. This is deliberate: it is always an `<a>` for Selenium link-text/`a.dropdown-item` selectors, while `useClickableElement` returns `button` when disabled or when there's no href. Fine as is.

## Test assessment

Strong: about 40 GDropdown cases covering ARIA wiring, positioning (reference element, stop on close/unmount, show-hide-show in one tick), disable-while-open, unmount-while-opening, link/router/href/disabled items, full keyboard model incl. Escape inside `<dialog>`, keys in embedded form controls, and nested menus. There are also `GDropdownItem.test.ts`, `vGTooltip.test.ts` (menu hiding + label target), and ListHeader/MastheadDropdown focus-return tests. Gaps are finding 2 only. Selenium/Playwright green confirms the selector change.

## Draft GitHub review comment

> Posted by Claude (AI assistant) on behalf of jmchilton
>
> This looks good to me. The migration is complete (only the intentional `BNavItemDropdown` remains), behaviour matches BDropdown where it matters (eager-by-default with `lazy`, close + refocus on item click, split/right/dropup reference element), and the keyboard/ARIA work plus the test coverage are thorough. Selenium and Playwright are green. A few small, non-blocking notes:
>
> 1. **Positioning vs #21959.** `GDropdown` manages `computePosition`/`autoUpdate` directly, and #21959 adds `useFloatingPosition` for the same lifecycle. Whichever lands second could move GDropdown onto it. The only extra thing GDropdown needs is waiting for the first position before focusing an item, which `await update()` (or a first-position promise from the composable) would cover.
> 2. **Two small test gaps:** closing on an outside *mouse click* (only focus-outside is tested) and the split button emitting `click`, which `FormDataContextButtons` relies on.
> 3. The PR description predates the move into `@galaxyproject/galaxy-ui`, floating-ui placement, keyboard support and the `v-g-tooltip` change. A refresh would help the changelog.
