# thermo_review — PR #24585 (Add a GPagination component to galaxy-ui)

- Profile: thermo_review
- Model: Claude Opus 5.5 (`claude-opus-5-5`)
- Effort: medium
- Reviewed commit: `71178a56e3b` (base `dev`)
- Scope: `client/packages/ui/src/components/GPagination.vue` (426 lines, new), its tests, the `index.ts` export, and the two cross-package v-model contract tests.

Design decisions the PR description calls out are not reconsidered here: BPagination prop parity, `change` firing only on clicks, and the reset to page 1. The file stays well under 1k lines, and the new component follows sibling conventions: `prefix(size)` from `componentVariants.ts`, the `COMPONENT_V_MODEL: false` compat opt-out, `GFormInput`'s focus ring, and the `:where()` margin trick. The findings below are about how the logic is organized inside the component.

## P2 1: The page-window algorithm is a 55-line computed with two regimes and mixed idioms; extract it as a pure helper

`items` contains the whole windowing algorithm: two local closures (`pages`, `gap`), a separate `limit <= 3` regime with `let start/end` adjustments, and an ellipsis regime with three early returns. Within that one computed, the "pinned first/last page" concept is written two ways:

- compact regime: `...(lead && start > 1 ? pages(1, 1) : [])`
- ellipsis regime: `...pages(1, 1).slice(0, lead)` / `...pages(total, total).slice(0, tail)`

The `.slice(0, lead)` form uses a 0/1 number as a length so that the pinned page appears or not. The reader has to work this out, and the compact regime expresses the same idea differently a few lines above. `lead`/`tail` are booleans converted to numbers so they can serve as both flags and slot counts.

This is the only non-trivial logic in the component, and it depends only on `(total, current, limit, firstNumber, lastNumber, hideEllipsis)`. The cleaner structure:

- Move it to `client/packages/ui/src/utils/pageWindow.ts` (alongside `focusOrder.ts`, `escapeStack.ts`, which already follow this pattern) as `pageWindow(opts): Item[]`, with the `Item` union exported from there.
- Inside, use one helper for pinned ends (e.g. `const pinnedFirst = (show: boolean) => (show ? [pageItem(1)] : [])`) in both regimes, and keep `lead`/`tail` as booleans plus a single `pinnedSlots = Number(firstNumber) + Number(lastNumber)`.
- The component keeps `const items = computed(() => pageWindow({...}))`.

The existing DOM-level `visibleItems` tests can stay where they are, so no new unit-test layer is needed. The point is that the component's script becomes state, events, and focus only, and the window math can be read and changed separately.

## P3 1: Four copy-pasted first/prev/next/last button blocks

The template repeats an 11-line `<li><button>` block four times. The blocks differ only in visibility, item class, disabled condition, label, glyph, and target page. Each copy repeats `type`, `class`, `:aria-controls`, the `aria-hidden` span, and the `goTo(..., $event)` wiring. Adding one more shared attribute (e.g. `data-*` for tests or `title`) means editing four places.

Suggested shape: two small computeds (`leadingControls` and `trailingControls`) returning `{ key, page, text, label, itemClass, disabled }[]`, each filtered by `showFirstButton` and `showLastButton`, rendered with one `v-for` before and one after the page items. This removes about 30 template lines, and `showFirstButton`/`showLastButton`/`atFirst`/`atLast` become fields of one data structure instead of four separate computeds used once each.

## P3 2: Focus restoration is routed through a module-level side channel, a post-flush watcher, and an extra `nextTick`

`goTo` stores `event.currentTarget` in a mutable `let clickedButton`. A `watch(currentPage, …, { flush: "post" })` then reads it back, clears it, and calls `await nextTick()` before focusing, even though it already runs post-flush. The watcher also fires for non-click page changes (resets, parent-driven changes), and the null check exists only to ignore those.

The logic belongs to the click, so it can live there:

```ts
async function goTo(page: number, event: MouseEvent) {
    if (props.disabled || page === currentPage.value) return;
    const button = event.currentTarget as HTMLButtonElement;
    setPage(page); // see P3 3
    emit("change", page);
    await nextTick();
    if (button.disabled || !button.isConnected) {
        rootRef.value?.querySelector<HTMLButtonElement>('button[aria-current="page"]')?.focus();
    }
}
```

This removes the `clickedButton` variable, the watcher, and the redundant double deferral. The `focusLost` check against `document.activeElement` can probably go too, since a disabled or detached button cannot keep focus. Keep it only if a test shows otherwise.

## P3 3: Controlled/uncontrolled page state is written in two places and derived twice

- "Set the internal page and emit `update:modelValue`" is open-coded in both `goTo` and the reset watcher.
- `Math.floor(props.modelValue ?? internalPage.value) || 1` appears in `currentPage` and again in the reset watcher (as `requested`).

`GTabs` already handles this with a writable computed (`activeIndex` with `get`: prop ?? internal, `set`: internal + emit). Reusing that pattern here, with a single `requestedPage` computed that `currentPage` clamps, gives one getter and one setter for the page. Both writers then become `page.value = x`.

Separately, the reset watcher combines two policies into one tuple watch over `[safePerPage, numberOfPages, totalRows]` and compares old and new values. The `rows === oldRows` clause means a page-size change that arrives together with a row-count change is *not* treated as a page-size reset. The PR description doesn't mention that case, and the code doesn't comment on it. Two named watchers (`watch(safePerPage, resetIfNotFirst)` and `watch(numberOfPages, resetIfPastEnd)`) would make each policy readable on its own. If the simultaneous-change exception is intended, it deserves a one-line comment. Otherwise splitting the watcher drops it.

(GTabs, GCollapse, GPopover, and now GPagination each implement "prop if bound, else internal ref, plus emit" separately. A shared `useControllableModel` composable would be a reasonable follow-up, but it is not this PR's job.)

## P3 4: Coercion keeps never-meaningful numeric input alive

`safeLimit` copies BootstrapVue's sanitizer: `Math.floor(limit) || 1`, then a *negative* limit silently becomes the default 5 while `0` becomes 1. `safePerPage`, `numberOfPages`, and `currentPage` also floor values and treat NaN as a fallback. Every prop is typed `number`, and all `BPagination` call sites on dev pass bound numbers (`:limit="3"`, `:per-page="limit"`, etc.). None passes negative, fractional, or string values. Parity with BPagination's *props* (which the PR's decision covers) doesn't require reproducing its handling of invalid values. The inconsistent result for invalid limits (`0` → 1, `-1` → 5) is the kind of input nothing could rely on.

Suggested: clamp to valid ranges (`Math.max(limit, 1)`, `Math.max(perPage, 1)`, clamp page to `[1, numberOfPages]`) and drop the floor/NaN/negative-to-default branches and the comment explaining them. Bad values from a caller then show up as an obviously wrong pager or a Vue prop-type warning instead of being quietly corrected.

## Not raised

- No follow-up refactor issue: base is `dev`, so the refactors above fit in this PR.
- File size, placement in `packages/ui`, export, and the two v-model contract tests (Vue 2.7 compat and tool shed Vue 3) are consistent with GTabs/GCollapse precedent.
