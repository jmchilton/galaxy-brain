# galaxy #23923 - Move GTable into @galaxyproject/galaxy-ui

- PR: https://github.com/galaxyproject/galaxy/pull/23923 (dannon)
- Reviewed head: `1f82e3d6323f668bc43af9536cf59715f52e2c24`
- Base: `dev`, merge-base `8f899e0a3d97`
- Prior review: mvdbeek (P2 a11y: checkbox names relied on `v-g-tooltip`). dannon pulled his fix in (445c01ef10b). Not repeated here.

## Verdict

Approve, with small suggestions. The move is faithful. The three cut client-only pieces behave the same. The two plain-Vue-3 fixes are real, and the package gains its first GTable tests (the client never had any). The remaining points are about reuse: hardcoded theme values and duplicated variant types. There is also a lint gap that leaves one of the two Vue 3 bugs unguarded.

## Faithfulness check

I diffed the client `GTable.vue`/`GTable.types.ts` at the merge-base against the package copies. Apart from imports and indentation, the only changes are these:

- **BFormCheckbox → GCheckbox**: `:checked`/`@change` becomes `:model-value`/`@update:model-value`. Both pass a boolean, so `onSelectAll($event)` receives the same value. `onRowSelect` ignores the value. `@click.stop` moves from the component to a wrapper `<span>`. Client consumer tests that use `input[id^='g-table-select-all-']` still pass, because GCheckbox puts `id` on the input.
- **LoadingSpan inlined** (`GTable.vue:938-943`). The markup matches LoadingSpan's spinner and `.loading-message`.
- **Theme SCSS import → constants** (`GTable.vue:951-959`). The values match `blue.scss`: `$body-bg` = `lighten(#f8f9fa, 15%)` = `#fff`. The breakpoints match `_breakpoints.scss`.
- The `.custom-checkbox` cursor rule is dropped. GCheckbox already sets `cursor: pointer` on its label and input, so nothing is lost.
- The lone `<template>` around rows is removed. Sortable headers gain keyboard support. A `:where()` baseline stylesheet is added.
- Types: `BootstrapVariant`/`BootstrapSize` are now defined inside the package's `GTable.types.ts`. The client shims re-export the rest unchanged.

`navigation.yml`'s library select selectors move to `.g-checkbox`. The other `.custom-control` selectors there (`remote_files_select_all` and similar) belong to consumer-owned BFormCheckboxes in slots, so they are unaffected.

## Verification

- Package `GTable.test.ts` + `GCheckbox.test.ts`: 15 passed (node 22.20.0).
- Package `vue-tsc` type-check: clean.
- Client consumers `SelectionDialog.test.js` (8) and `FilesDialog.test.ts` (15): pass.
- Red check 1: putting `@click.stop` back on GCheckbox (dropping the span) fails "selects a row once from its checkbox". That fix is pinned.
- Red check 2: putting back the directive-less `<template>` around `<tr>` passes all 10 GTable tests. That bug is **not** pinned (finding 3).
- All throwaway edits were reverted. The worktree is clean.

## Findings (by severity)

### 1. Low-Med: theme values hardcoded instead of using the package's tokens (`GTable.vue:951-959`)

The package already ships `styles/tokens.css`. A client sync test keeps it equal to the client theme, and sibling components read it via CSS variables (GButton, GHeading, GDropdown use `var(--color-grey-200)`, `var(--background-color)`, `var(--color-blue-600)`). The new constants map one-to-one onto those tokens:

| SCSS constant | token |
|---|---|
| `$brand-primary #25537b` | `--color-blue-600` |
| `$brand-secondary #dee2e6` | `--color-grey-200` |
| `$brand-light #f8f9fa` | `--color-grey-100` |
| `$body-bg #fff` | `--background-color` |

This creates a third copy of these values, outside the sync test. It also means a Tool Shed theme can't restyle the table. Within the same file, the new baseline block already uses `var(--color-grey-300)`/`var(--spacing-3)`, so the file now mixes two colour sources. Only the `lighten($brand-light, 0.3–0.5)` calls (`:1072`, `:1091`, `:1102`) need compile-time values. Those are under 1% lighter and could become `var(--color-grey-100)`, or `color-mix()` if the difference matters. The breakpoints can stay as SCSS (container queries can't take vars), but should be noted as copies of `_breakpoints.scss`.

### 2. Low: `BootstrapVariant`/`BootstrapSize` now defined twice

They are defined in the package at `client/packages/ui/src/components/GTable.types.ts:7-20` and in the client at `client/src/components/Common/index.ts:12-26` (used by `GCard.types.ts` and others). The established precedent is `ColorVariant`: it lives in the package's `componentVariants.ts`, and the client re-exports it (`client/src/components/BaseComponents/componentVariants.ts`). Suggested change:

- Move the two types to `packages/ui/src/components/componentVariants.ts`. They are not table-specific, and the next moved component (GCard) will want them.
- Have `Common/index.ts` re-export them from `@galaxyproject/galaxy-ui`.

### 3. Low: the plain-Vue-3 row-rendering bug has no guard

Package tests run under `@vue/compat` (`client/vitest.config.mts:144`). As the PR description notes, compat hides the directive-less `<template>`, so the reintroduced bug passes the whole suite (red check 2). ESLint does catch it: `vue/no-lone-template` fires. But it is only a warning, and this exact pattern was sitting in the client file before. Promoting `vue/no-lone-template` to `error` (at least for `packages/**`) is a cheap, durable guard for every future move. A plain-Vue-3 test lane for the package would be the bigger fix and is out of scope here.

### 4. Nit: empty wrapper span when select-all is hidden (`GTable.vue:747-749`)

`v-if="showSelectAll"` sits on the GCheckbox inside the new span, so the span renders even when there is no select-all. Move the `v-if` to the span.

### 5. Note: checkbox appearance changes

GCheckbox renders a native `<input type=checkbox>`, while BFormCheckbox rendered Bootstrap's custom-control. Every selectable client table (histories list, workflow list, datasets list, library folder, selection dialogs) will show native checkboxes. That fits the #23812 direction, but the description's "render the same" applies to the baseline CSS, not to the checkboxes. It's worth a glance during manual testing.

### 6. Note: GCheckbox `indeterminate` is consistent with #23908

It is a one-way prop next to `modelValue` and emits nothing. BFormCheckbox had `update:indeterminate` (`.sync`). GTable derives indeterminate from `selectedItems`, so no `.sync` is needed. The `ariaLabel` prop is declared, so it doesn't fall through to the root `<label>`, which is correct.

Optional a11y aside: APG's sortable-table pattern puts a `<button>` inside the `<th>` rather than making the `th` focusable. The current approach works and is tested. A button would announce as actionable, but it changes header DOM that consumers may style or select, so it is fine to leave.

## Tests

No coverage was lost: there was no client `GTable.test.ts` before this PR. The new package tests cover selection (including the one-select-per-click regression), partial-selection state, aria names without the directive, aria-sort/tabindex, Enter/Space sorting, Space `preventDefault`, and slot-control passthrough. These are behaviour-level tests, not trivial ones.

## Risks

Risks are minimal. This change doesn't lock Galaxy into choices that are hard to reverse (a two-way door). Client importers go through one-line shims, and the visible changes (native checkboxes, focusable sortable headers) are obvious and easy to revert.

<details><summary>Risk Details</summary>

- The package's exported type names (`TableField`, `BootstrapVariant`, etc.) become API that the Tool Shed frontend will build against. Moving `BootstrapVariant`/`BootstrapSize` (finding 2) is cheapest before that consumer exists.
- Selenium library selectors changed (`navigation.yml:1537-1539`). Out-of-tree tests or scripts that select `.custom-control` in GTable's select column will break.
- Every sortable table gains a tab stop per sortable header, which changes keyboard tab order client-wide.

</details>

<details><summary>Risk Review Advice</summary>

Humans should glance at a selectable table (library folder, histories list) to confirm the native checkboxes look acceptable and that clicking the select column toggles exactly once. Before the Tool Shed starts consuming the package, decide where the shared variant types live.

</details>

---

## Draft GitHub review (unposted)

> *Posted by Claude (AI assistant) on behalf of jmchilton. Not authored by jmchilton personally.*
>
> Looks good. I diffed the old client GTable against the package copy. Beyond imports and the described changes, it's faithful: the theme constants match `blue.scss`/`_breakpoints.scss`, the inlined spinner matches LoadingSpan, and GCheckbox's `cursor: pointer` covers the dropped `.custom-checkbox` rule. Package tests, the package type-check, and the SelectionDialog/FilesDialog consumer tests pass locally. I confirmed that the one-select-per-click test fails if `@click.stop` goes back on the component. A few small suggestions:
>
> 1. **Use the package tokens instead of hardcoded theme values** (`GTable.vue:951-959`). `tokens.css` already carries these exact values, with a sync test against the client theme, and sibling components read them as CSS variables: `$brand-primary` → `--color-blue-600`, `$brand-secondary` → `--color-grey-200`, `$brand-light` → `--color-grey-100`, `$body-bg` → `--background-color`. Only the `lighten($brand-light, 0.3–0.5)` calls need compile-time values, and those differ from `--color-grey-100` by under 1%. As written, this is a third copy outside the sync test, and the Tool Shed can't theme the table.
> 2. **`BootstrapVariant`/`BootstrapSize` are now defined twice**: in the package's `GTable.types.ts` and in the client's `components/Common/index.ts`. Could they live in the package's `componentVariants.ts`, with the client re-exporting them the way it does `ColorVariant`? GCard will want them when it moves.
> 3. **The lone-`<template>` fix isn't guarded.** Package tests run under `@vue/compat`, so putting the directive-less `<template>` back around the rows still passes all GTable tests. ESLint's `vue/no-lone-template` does flag it, but only as a warning, which is how it survived in the client file. Promoting that rule to an error (at least for `packages/`) would protect future moves.
> 4. Nit: `v-if="showSelectAll"` could move from the GCheckbox to the wrapping `.g-table-select-control` span, so the span isn't rendered when select-all is hidden.
>
> One note for manual testing: the selection checkboxes switch from Bootstrap's custom-control look to native checkboxes on every selectable table. That fits the #23812 direction but is visible, so it's worth a glance.
