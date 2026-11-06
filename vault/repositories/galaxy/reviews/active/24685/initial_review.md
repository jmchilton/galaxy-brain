# Initial review: #24685, Replace BLink with GLink in four script-setup components

Profile: `default`. Model: Opus 5.5 (`claude-opus-5-5`). Effort: medium. Reviewed commit: `150cb834122ddd3e0b6eef5f1429ef41d2527958`.

## Verdict

Sound migration; no bugs found. One P3 cleanup, which doesn't block merge.

Reviewed by reading code only. `client/node_modules` is absent from the worktree, so nothing was run locally. CI on this head is green (22 pass, 1 skipping, including `client-unit-test`).

## Findings

### P3 1: `.prevent` is a no-op on the two new `CollectionCreatorIndex` buttons

`CollectionCreatorIndex.vue:237` and `:252` keep `@click.stop.prevent="resetCreator"`. With no `to` or `href`, GLink renders a `<button>`, which has no default action to prevent outside a form. None of the `CollectionCreatorIndex` hosts (`SelectionOperations`, `FolderTopBar`, `FormDataWorkflowRunTabs` via `FormData`) appear to sit inside a `<form>`; a grep of `<form>`/`BForm` in `client/src/components` turned up no enclosing form.

The same author already removed this modifier from the sibling in a47f40fdca9, "Drop no-op .prevent from GLink button clicks" (`CollectionCreatorNoItemsMessage.vue`).

```diff
-            <GLink thin @click.stop.prevent="resetCreator">
+            <GLink thin @click.stop="resetCreator">
```

Same change at line 252.

## Checked, no finding

- **Element and navigation:** the breadcrumb renders a RouterLink, so the href still includes the router base. "Download here" renders a plain `<a href>`. The other two render `<button>`.
- **Click handling:** GLink declares `click` and emits the native event, so `.stop` works on the component. The new `DatasetDetails` test covers this with an outer listener.
- **Keyboard:** `ContentItem.onKeyDown` ignores targets that aren't `.content-item`, so Enter or Space on the database build button doesn't also toggle the item.
- **Breadcrumb `font-weight: inherit`:** the selector outranks GLink's scoped `.g-link` rule, so the override holds.
- **`v-g-tooltip` on GLink:** the directive reads the native `title` GLink renders, the same as it did on BLink. Keeping it is a stated PR decision.
- **`resolvePath`:** `fullPath` excludes the router base, so RouterLink still builds the prefixed href.
- **Selectors:** `.dbkey .value` and `.download-link` in `navigation.yml` still match. No Selenium selector targets "Try again" or "Create another".
- **Tests:** they mount the real GLink and assert behaviour (reset, emit, propagation, href). No weakening; the old `BLink` stub is gone with the BLink.

## Not flagged

- A string-only `BreadcrumbItem.to` would remove `resolvePath`, since only two callers pass `{ name: "StorageDashboard" }` (static `/storage`), but resolving is the PR's stated choice.
- `thin` on "Try again" and "Create another collection" makes them regular weight, while sibling `CollectionCreatorNoItemsMessage` stays bold. The PR description calls this out as a visible change.
- `GLink`'s `<button>` has no `type="button"`. This is pre-existing and harmless for these hosts, but matters to any future host inside a form.
- Browsers lay out a `display: inline` `<button>` as inline-block, so a very long database build could wrap differently from the old anchor. Unverified in a browser, and speculative for typical build names.
