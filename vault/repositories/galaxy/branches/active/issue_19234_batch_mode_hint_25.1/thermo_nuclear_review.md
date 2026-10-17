# Thermo-nuclear code quality review — issue_19234_batch_mode_hint_25.1

Acted on: the one structural finding — the "is this a batch submission" rule was written twice (`createValue`'s emitted `batch` flag and the new `showBatchInfo` computed). Extracted `isBatchSelection(variantBatch, values)` into `variants.ts`, **verbatim the same function the dev branch `issue_20657_input_processing_mode` already has**, and used it in both places. Hint and payload now share one rule by construction, and the dev branch rebases over an identical hunk. Commit `3f190777de0`, pushed. No behavior change; jest 27/27, eslint/prettier clean. Did not act on the rest — they're either backport-scope expansions or already over the line before this branch.

Not acted on:
- FormData.vue over 1k lines — already 1069 on `release_25.1`; branch adds ~16. Decomposition belongs on dev (20657 extracts `FormDataProcessingHint.vue`, `processingMode.ts`).
- Template message selection (`selectionMapsOver || (type == 'data' && src == COLLECTION)`) still inline in the template — pulling it into a computed / pure `getProcessingMode` is what 20657 does; doing a half version here adds churn that conflicts with that rewrite of the same block anyway.
- `selectionMapsOver` vs `isBatchSelection` both scan `map_over_type` — the span needs "maps over" separately from "is batch" (multi-dataset batch shows the other text). Two computeds of one line each; not worth a third helper.
- `currentVariant?.batch` / `currentVariant?.src` optional chains inside `v-if="showBatchInfo"` — needed for vue-tsc narrowing since the guard moved into a computed; harmless.
- No unit test for `isBatchSelection` — pure 1-line rule exercised by every FormData batch test (emit + hint); dev adds its own coverage via `processingMode.test.ts`.

## Details

### Scope reviewed
`git diff origin/release_25.1...HEAD` (head was `23fef90ed97`): `FormData.vue` +18/-3, `FormData.test.js` +146/-2 (one new describe block, plus selector `]` fixes). Compared against dev branch `issue_20657_input_processing_mode`'s FormData restructuring.

### Findings

1. **Duplicated batch rule (structural, acted on).** `createValue` computed `batch: batch !== BATCH.DISABLED || !!hasMapOverType` while `showBatchInfo` re-derived `currentVariant.batch !== BATCH.DISABLED || selectionMapsOver`. The fix's correctness depends on these two staying in lockstep (hint shown iff payload `batch: true`), but nothing enforced it. Code-judo: the dev branch already names this concept `isBatchSelection` in `variants.ts`. Back-porting that exact function makes the invariant structural, deletes the `hasMapOverType` local, and shrinks the dev rebase conflict surface (identical `variants.ts` hunk; `createValue` line becomes identical to dev's).

2. **Template conditional growth (spaghetti, not acted on).** The mapped-over `<span>` gained a second disjunct. On a backport this is the minimal readable form; the real remedy — a pure function choosing the hint and a dedicated component — exists on dev (`getProcessingMode`, `FormDataProcessingHint.vue`). Half-porting it would grow the diff and still conflict.

3. **File size (not acted on).** 1069 → ~1085. Pre-existing breach; not this branch's to fix on 25.1.

4. **Types/boundaries.** `isBatchSelection` takes `DataOption[]`; callers pass `currentValue.value ?? []` and the deduped `values` — no casts. `variants.ts` → `types.ts` import is type-only; `types.ts` imports only `@/api`, no cycle.

5. **Tests.** New describe block is well-shaped (shared `batchInfoText` helper, regex for HelpText-split text, asserts emitted payload alongside DOM). No changes needed.

### Verification
- `npx jest --config tests/jest/jest.config.js src/components/Form/Elements/FormData/FormData.test.js` — 27 passed.
- eslint + prettier on `FormData.vue`, `variants.ts` — clean (also passed pre-commit hooks).
- Baseline commit `9b6f39b7609` untouched, still first; new commit appended, no history rewrite.
