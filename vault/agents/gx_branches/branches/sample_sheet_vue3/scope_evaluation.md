# sample_sheet_vue3 — scope evaluation

**Recommendation: keep the scope as implemented. No scope change.** The branch does what John asked: it reviews the sample sheet grids' ag-grid use after the Vue 3 move and rewrites them to Vue 3 patterns. The six bugs are the evidence for that rewrite. The shared pieces it touches (the compat `MODE: 3` opt-in in `useAgGrid`, and the FetchGrid watcher and fresh row array) are needed by the same fix or come from the same bug class, so splitting them out would cost more than it saves. Leave `AgRowData` narrowing, `useGridHelpers` validation for `file_type`/`dbkey`, FetchGrid E2E and the ag-grid 36 upgrade as follow-ups or separate branches. The one open decision is the rejected-edit toast. It is small, matches the toast convention in `Landing/gridHelpers.ts`, and John can take it or leave it at read-through. It doesn't change the scope either way. One process note: `ag_grid_36` is still stacked on the pre-rebase `4dd34fe8db3`. Restacking it onto `29fce0cf9e5` will hit an add/add conflict on `FetchGrid.test.ts`. The `FetchGrid.vue` fresh-array hunk is identical on both branches.

Branch: `02a2e659909..29fce0cf9e5`. 4 commits, 13 files, +731/−595. Client only, plus one E2E file and its navigation hooks.

## Scope A — as implemented (recommended)

The sample sheet grid and the sheet view move to a watched row source with `v-model` and a pure typed parser, which fixes six editing and view bugs. `useAgGrid` gets one shared module-level async wrapper with the compat `MODE: 3` opt-in and a default `resize`, which reaches all five grids. FetchGrid gets the same never-fires watcher fix and a fresh row array.

| Pros | Cons |
| --- | --- |
| • Matches the request: a Vue 3 rewrite, not a patch set<br>• Each bug has a red-first test, and payload tests pass on the old and new component<br>• Reuses `enforceColumnUniqueness` and follows the `SortableList.ts` compat precedent<br>• Leaves the grids in the shape ag-grid 36 needs (36 deep-copies rows, so `v-model` write-back is required anyway) | • `SampleSheetGrid.vue` gets a large rewrite (639 lines changed), which is a bigger read for reviewers<br>• `MODE: 3` reaches all five ag-grid users, though E2E covers the builders and rules, and a real-grid vitest covers FetchGrid<br>• Stricter float parsing makes silent reverts more common unless a toast is added |

## Scope B — bug fixes only, no reshape (contraction)

Fix each bug in place on dev's component: fix the watcher getter, check the right field (`list_identifiers`), stop the boolean editor inference, guard against `NaN`, and fix the spinner/error order. Leave out `useSampleSheetGrid`, the parser and the column builders.

| Pros | Cons |
| --- | --- |
| • A much smaller diff, and five of the six fixes are one-liners<br>• Doesn't change `useAgGrid`, so the other four grids are untouched | • Doesn't do what John asked (a Vue 3 rewrite)<br>• Doesn't fix the stale `element_identifier` dropdown, which needs `v-model` and therefore `MODE: 3` anyway<br>• Keeps the hand-rolled per-type validation, which is where the boolean and `NaN` bugs came from<br>• ag_grid_36 would then have to do the row write-back reshape on its own |

## Scope C — split shared-grid changes into their own PR (contraction; candidates d, e)

Ship only the sample sheet changes here. The `useAgGrid` `MODE: 3` opt-in and default `resize`, and the FetchGrid watcher and fresh-array fix, go in a separate PR first.

| Pros | Cons |
| --- | --- |
| • Each PR has a smaller blast radius<br>• FetchGrid reviewers don't have to read sample sheet code | • `SampleSheetGrid` `v-model` can't work without the `MODE: 3` wrapper, so this PR would depend on the other one and the two would merge in sequence anyway<br>• A per-grid opt-in would need a second async wrapper, which is the duplication this branch removes<br>• The FetchGrid fix is about 10 lines plus one test, from the same bug class and the same raw-array finding, so a PR of its own is overhead<br>• ag_grid_36 already makes the identical FetchGrid change, so it is going to land in this area regardless |

<details>

- **(d) MODE 3 to all five grids.** Compat decides per vnode, and the wrapper is now a module-level singleton, so you can't opt in for the sample sheet alone without forking the wrapper. Grid by grid: the paired/unpaired builder and the rule builder have Playwright E2E. FetchGrid has `FetchGrid.test.ts`, which mounts the real ag-grid. The sheet view has the new `test_collection_sheet.py`. The polish round showed that removing the wrapper opt-in turns five unit tests red. Keep it.
- **(e) FetchGrid fixes.** The watcher had the same `() => { props.target; }` getter as the sample sheet. On dev, a replaced target never showed. The fresh array is what makes the fix hold past the second replacement (the Codex finding). Shipping the watcher fix without the fresh array would be a partial fix, and leaving both out leaves a known bug of the same class next to the fix. Keep both in this PR.

</details>

## Scope D — expand with the small follow-ups (candidates a, b, c)

Also narrow `AgRowData` to a `UriRow | ModelObjectRow` union, validate `file_type`/`dbkey` extra columns with `useGridHelpers().makeExtensionColumn/makeDbkeyColumn`, and toast on rejected edits.

| Pros | Cons |
| --- | --- |
| • The toast is about 3 lines in `setCellValue` (return a message from `parseSampleSheetValue`). It matches the toasts `enforceColumnUniqueness`, `makeExtensionColumn` and `makeDbkeyColumn` already show, and it offsets the stricter float parsing<br>• `useGridHelpers` for extra columns would close a validation gap FetchGrid already handles<br>• The union type would drop the `as` casts in `SampleSheetGrid.vue` (lines 119, 219, 228, 263, 300, 305) | • The union type touches every row access and is pure typing churn in an already large diff<br>• `file_type`/`dbkey` validation predates the branch. It needs `useUploadConfigurations` wired into the sheet grid, and the dbkey list is large. That is new behaviour with its own tests and edge cases (the `"?"` fallback)<br>• The toast is a visible behaviour change that is already flagged as John's call |

<details>

- **(c) Toast:** this is the only expansion small enough to fold in at read-through. If John wants it, have `parseSampleSheetValue` return `{ valid: false, message }`, Toast in `setCellValue`, and add one grid test. Otherwise the PR description already documents the silent revert. Either answer keeps scope A.
- **(b) `useGridHelpers`:** note that `makeExtensionColumn` and `makeDbkeyColumn` set their own `valueSetter`, which would replace `setCellValue` for those columns. Doing this properly means composing the two setters, not just calling the helper. That's a good reason to give it its own small PR.
- **(a) `AgRowData` union:** the debriefs already deferred this. It fits better after ag_grid_36 lands, since 36 changes the row copy semantics.

</details>

## Scope E — add FetchGrid E2E (expansion; candidate f)

Add a Selenium/Playwright test that drives a fetch landing through FetchGrid, edits cells and submits.

| Pros | Cons |
| --- | --- |
| • FetchGrid is behind the `MODE: 3` wrapper and has no E2E<br>• ag_grid_36's debrief also flags the gap | • The gap predates this branch<br>• `FetchGrid.test.ts` now mounts the real ag-grid with nothing stubbed, which covers the changed path (target replacement)<br>• A landing-page E2E needs landing request setup, which is a separate, sizeable piece of test infrastructure |

## Scope F — fold in ag_grid_36 (expansion; candidate g)

Squash the 31.3.4 → 36.2.0 upgrade (module registration, legacy theme, row-copy write-back in the paired builder, renderers as objects, global `animateRows: false`) into this PR.

| Pros | Cons |
| --- | --- |
| • One review of the `useAgGrid` and grid surface instead of two<br>• Avoids the restack, which is already overdue | • #23938 already shipped the CVE fix, so 36 is optional and its value (and +40–90 KB gzip) is Dannon's call<br>• Mixes a dependency upgrade with bug fixes, so reverting one reverts both<br>• It touches the paired builder and the rule builder in ways unrelated to sample sheets<br>• This branch's fixes stand on their own on 31.3.4 and should ship first |

<details>

Keep the stack (dev → `sample_sheet_vue3` → `ag_grid_36`). Restack `ag_grid_36` onto `29fce0cf9e5` and expect these conflicts:

- `FetchGrid.test.ts`: both branches add the file (add/add).
- `FetchGrid.vue`: the fresh-array hunk is identical on both branches. The `v-model` binding is only on 36.
- `SampleSheetGrid.test.ts`: 36 changes it, and this branch has since collapsed one case.

Re-run vitest and the chipseq and builder E2Es after the restack.

</details>
