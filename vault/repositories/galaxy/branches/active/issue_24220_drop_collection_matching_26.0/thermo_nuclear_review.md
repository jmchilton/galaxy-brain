# Thermo-nuclear review (post re-scope)

Reviewed `d45d2fdb3bc...4a1bd6c02ed` (6 commits) fresh; round 1 (`earlier_drafts/1/`) used only for reference. No structural blockers. Acted on one thing: flattened the collection branch of `canAcceptSrc` into guard clauses over one local `inputTypes`, and the refusal alert now lists that instead of the raw prop. Folded into the empty-`collectionTypes` commit (`4a1bd6c02ed` → `2db71555be5`); earlier commits unchanged. Everything else is a follow-up or kept as-is.

## Not acted on

- **Drop path matches twice.** `canAcceptSrc` (dragenter/drop) and `toDataOption` (emitted value) each call `getElementAttributes` and `matchCollectionType`. The code-judo move is one gate: `toDataOption` returns the match (or a refusal reason) and `canAcceptSrc` drops its collection branch. That reshapes the pre-existing two-gate `FormData.vue` flow; too much for a 26.0 backport. Follow-up on dev.
- **`matchCollectionType` belongs in `collectionTypeDescription.ts`**, next to `canMatch`/`canMapOver`, where the editor's deepest-first `_effectiveMapOver` could share it. A cross-module move complicates merge-forward (dev renamed `canMatch` → `accepts`). Follow-up on dev.
- **Map-over preservation lives inside the `formattedOptions` computed.** The new two lines patch the server's selected-DCE entry (no `map_over_type`) from the keep cache. Cleaner long term: the server's `DataCollectionToolParameter.to_dict` reports the map-over type for a batch DCE, and the client patch goes away. Server change, so follow-up. The client patch is narrow (same `id_src` key, only fills a missing value) and has a red/green test.
- **`collectionTypes` prop typed `Array<CollectionType>` but gets `null`.** The `restrictedCollectionTypes` computed handles it; widening the prop ripples into child components (tried in normal review 2). Kept.
- **Nested-nullable return `{ mapOverType: string | null } | null`.** Two meanings of null, but each is documented and it's the cheapest way to tell "direct" from "refused". Kept.
- **`[...inputs].sort` copies a fresh local array.** Harmless; nit.
- **`FormData.vue` > 1k lines.** 1069 at the base, 1064 after. Branch shrinks it. No action.
- **"keeps a dropped element mapped over" test repeats the drag sequence of `dropOnCollectionInput`.** The helper returns a value, not the wrapper, and this test needs a `setProps` after the drop. Making the helper return the wrapper too would touch every caller for one test. Kept.

<details><summary>Full review</summary>

### Structure / code judo

The branch already is the judo move for the bug: two ad-hoc `includes` + `endsWith` matchers (one HDCA-only in `toDataOption`, one in `canAcceptSrc`) became one pure helper over the canonical `CollectionTypeDescription.canMatch`/`canMapOver`. The `isHDCA` special case is gone; DCEs use the same path via `getElementAttributes().collectionType`. The two duplicated column-definition blocks (exact vs suffix match) became one guarded check. One shared `restrictedCollectionTypes` computed makes `null` and `[]` mean the same in both gates, deleting a latent disagreement. No new flags or modes.

The remaining structural smell is the double gate (see Not acted on). It predates the branch; the branch reduced it from two different matchers to one helper called twice. That is the right stopping point for a release branch.

### Spaghetti check

- `canAcceptSrc`: the branch left an `if / else if / else { if (match) { if ... } else { ... } }` pyramid. Acted on: guard clauses (throw, no restriction → accept, no match → alert, direct + bad columns → alert, accept). Same behavior, same alert strings, one less nesting level, and the alert lists the same `inputTypes` the match used instead of the raw prop.
- `toDataOption`: one `if (collectionType && restrictedCollectionTypes.value)` block; flat. Fine.
- `formattedOptions`: two added lines in an already busy computed (see Not acted on). The `value: option || null` → `option` change drops a dead fallback (`forEach` items are never falsy).

### Parity with server

Checked against `basic.py` `DataCollectionToolParameter.to_dict`: direct matches first, then `can_map_over` (deepest input first), then the `paired_or_unpaired` rewrite to `paired`/`single_datasets` by suffix. `matchCollectionType` follows the same order and rewrite; docstring names the server function. Column definitions only checked on direct use, like the server's `match_collections` vs `match_multirun_collections`. Selected DCE option from the server has no `map_over_type` — the reason for the `formattedOptions` patch.

### Types / boundaries

`matchCollectionType(collectionType: string, inputTypes: string[])` takes plain strings, avoiding casts at the DCE call site. No new `any`/casts in source. The test file's two `any` eslint warnings are pre-existing.

### Size

`FormData.vue` 1069 → 1064. `collectionMatch.ts` 28 lines. Test file grows by ~180 lines of table-driven cases; well-factored via `droppedHdca` / `droppedCollectionElement` / `dropOnCollectionInput`.

### Tests

Component tables drive real dragenter/drop events and assert the emitted payload or exact refusal. API test pins the one server fact the DCE map-over relies on. No tests changed this pass.

### Verification (after fixup)

- `vitest run src/components/Form src/components/Workflow`: 55 files, 338/338 pass.
- `vue-tsc --noEmit` clean; prettier clean; eslint 0 errors, 2 pre-existing `any` warnings in `FormData.test.ts`.
- `uvx ruff check` / `uvx black --check` on `lib/galaxy_test/api/test_tools.py` clean (Python untouched; no API test rerun).
- Baseline commit `622d604a43e` and the next four commits unchanged by the rebase.

</details>
