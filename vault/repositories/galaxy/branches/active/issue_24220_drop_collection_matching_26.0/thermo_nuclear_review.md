# Thermo-nuclear review

Reviewed `d45d2fdb3bc...HEAD` (3 commits). No structural blockers; diff deletes more branching than it adds. Acted on one thing: `matchCollectionType` docstring now names `DataCollectionToolParameter.to_dict` (the server code it mirrors) so the two can be kept in step. Folded into the fix commit. Everything else is a follow-up or kept as-is.

Commits after: `59d9f797cc3` baseline (unchanged), `34d230970c2` collection match fix, `cad546e2159` DCE fix.

## Not acted on

- **`matchCollectionType` belongs in `collectionTypeDescription.ts`** (with the editor's `effectiveMapOver` deepest-first pick, see normal review 1). Right layer long term, but moving it on 26.0 complicates merge-forward (dev renamed `canMatch` → `accepts`). Follow-up on dev.
- **Drop path matches twice** (`canAcceptSrc` then `toDataOption` each call `matchCollectionType`, each re-run `getElementAttributes`). Two-gate structure is pre-existing; collapsing it is a `FormData.vue` refactor. Follow-up.
- **`canAcceptSrc` and `toDataOption` disagree on empty `collectionTypes`**: `toDataOption` treats `[]` as "no constraint", `canAcceptSrc` as "nothing matches" (alert). Pre-existing, unchanged by this branch (old `includes`/`endsWith` also failed on `[]`). Prop is typed `Array<CollectionType>` but receives `null` from `attrs.collection_types`. Follow-up.
- **Nested-nullable return `{ mapOverType: string | null } | null`**: two meanings of null, but each is documented and the wrapper is the cheapest way to tell "direct" from "refused". Kept.
- **`endsWith("paired")` also matches `paired_or_unpaired`**: guarded by the preceding check; verbatim mirror of server `basic.py`. Kept for parity.
- **`FormData.vue` > 1k lines**: already 1069 before; branch shrinks it to 1055. No action.
- **`dropOnCollectionInput` branches on alert vs input**: asserts on both sides of the branch (strengthened in test challenges). Kept.

<details><summary>Full review</summary>

### Structure / code judo

The fix is the code-judo move already: two ad-hoc `includes` + `endsWith` matchers (one in `canAcceptSrc`, one HDCA-only in `toDataOption`) replaced by a single pure helper over the canonical `CollectionTypeDescription.canMatch`/`canMapOver`. Net -14 lines in `FormData.vue`, one duplicated condition block (column-definition check for exact vs map-over match) collapsed into one, and the `isHDCA` special case removed so DCEs flow through the same path via `getElementAttributes().collectionType`. No new flags or modes.

### Parity with server

Checked against `lib/galaxy/tools/parameters/basic.py` `DataCollectionToolParameter.to_dict` and `history_query.py` `can_map_over`: server tries direct matches first, then input types sorted by rank (deepest first), then rewrites a `paired_or_unpaired` map-over to `paired`/`single_datasets` by the dropped type's suffix. Helper follows the same order and rewrite. Docstring now names the server function (acted on).

### Layering

Helper lives next to `FormData.vue` and imports from the workflow editor module. Canonical home is `collectionTypeDescription.ts`, which would also let the editor's `_effectiveMapOver` share the deepest-first pick. Deferred: moving across modules on a release branch fights merge-forward (`canMatch` vs dev `accepts`).

### Types

`matchCollectionType(collectionType: string, inputTypes: string[])` takes plain strings to avoid casts at the DCE call site. `SINGLE_DATASETS` constant is single-use but names a server magic string; fine.

### Remaining smells (pre-existing)

- Double evaluation of attributes/match per dropped item across `canAcceptSrc` and `toDataOption`.
- `[]` vs `null` `collectionTypes` semantics differ between the two gates; prop type hides the `null`.

### Tests

Component tables drive real drop events and check emitted values; covers both gates together. API test pins the server fact the DCE fix relies on and checks the mapped level. No weakening.

### Verification

- `vitest run src/components/Form src/components/Workflow`: 330/330.
- `vue-tsc --noEmit` clean; prettier clean; eslint 2 pre-existing `any` warnings.
- `ruff`/`black` clean on `test_tools.py` (unchanged by this pass; no API test rerun).

</details>
