# Scope evaluation: upload_datatypes_composable

**Recommendation: keep scope as implemented.** Every addition beyond the original plan in `review_datatypes_errors.md` fixed a defect that a reviewer found and confirmed in code. Those defects were a stale error after a retry, an in-place sort of the shared dbkey list, the Change Database/Build OK button setting every selected item to `?`, the picker hiding datatype failures, and the upload configuration never recovering. The largest addition, store-owned loading/error state, is what the Codex P2 recovery fix depends on, so it can't be split out cleanly. The non-test diff is moderate (17 files, +259/−187), and it follows mvdbeek's "handle this in callers". The remaining work is non-blocking follow-ups for separate branches, not scope changes for this one. Migrating the remaining Options API consumers and deleting the providers can happen after #23995 lands. `RuleCollectionBuilder` has the same bug class but nobody raised it. Caching for `useDetailedDatatypes` is a separate concern. Keep the branch stacked on #23995, which is approved, and rebase once the forward-merge reaches `dev`.

Measured at HEAD `962f6092f11`. The branch's own commits are `24c5e0c6530..HEAD`: 28 files, +857/−233, of which non-test is 17 files, +259/−187. The 20 `dev` commits after base `5deaa44ee72` touch none of the branch's files. #23995 is OPEN, APPROVED by mvdbeek, and its head is `aaf966c2e46`, which matches the cherry-pick base.

## 1. As implemented (recommended)

The cherry-picks of #23995 and the Vue Test Utils v2 test ports (`333b511c6d4`) come first. The branch then adds `useUploadDatatypes`/`useUploadDbKeys` as thin readers over stores that own loaded/loading/error state, and builds both providers from one `uploadListProvider` factory. `CollectionEditView`, `DirectoryDatasetPicker` and `useUploadConfigurations` move to the composables. `SelectionOperations`/`LibraryDataset` show dbkey errors, and `useDetailedDatatypes` gains an `error` ref.

| Pros | Cons |
|---|---|
| <ul><li>Each expansion has a confirmed defect and a red-first test behind it.</li><li>The stores are now the single source of truth. The composables and providers are both thin, which removes the line-for-line duplication flagged in the normal review.</li><li>It completes the plan's dbkey bullet ("same treatment for `DbKeyProvider`/`dbKeyStore`").</li><li>It removes the `// TODO: Maybe a store would be better` and the private loaders in `useUploadConfigurations`.</li><li>The production diff is modest and stays in one area (upload lists).</li></ul> | <ul><li>Reviewers see two parallel APIs (providers and composables) until the Options API consumers move.</li><li>The `uploadListProvider` factory becomes dead code once those consumers move.</li><li>`useDetailedDatatypes` gets a one-off `error` ref that `AvailableDatatypes` ignores.</li><li>The PR carries #23995's commits until the forward-merge.</li></ul> |

## 2. Contract: original plan only

Composables for datatypes and dbkeys, plus `CollectionEditView` and `useUploadConfigurations`. Leave the provider internals, picker, OK-disable and `useDetailedDatatypes` changes for later.

| Pros | Cons |
|---|---|
| <ul><li>Smaller first PR.</li><li>Closer to the literal plan.</li></ul> | <ul><li>Brings back the stale-error-after-retry bug, which only store-owned state fixes.</li><li>The P2 recovery fix in `useUploadConfigurations` depends on store-owned state, so it can't be kept without it.</li><li>The duplicated composables and providers come back.</li><li>Known bugs ship unfixed: the in-place sort and OK setting `?`.</li><li>The follow-up PR would redo review on the same files.</li></ul> |

## 3. Expand: migrate `SelectionOperations` to the composables

`SelectionOperations` already has `setup()`. It would call `useUploadDatatypes()`/`useUploadDbKeys()` there instead of using the providers, which removes the "provider triggers the load, setup reads the store error" arrangement.

| Pros | Cons |
|---|---|
| <ul><li>Cheap: it's a mechanical change from slot props to setup refs.</li><li>Removes the awkward split read of `dbKeysError` (the comment at `SelectionOperations.vue:236`).</li></ul> | <ul><li>It deletes nothing on its own, because `LibraryDataset` still needs both providers.</li><li>Its test currently stubs `DbKeyProvider` via `shallowMount`, so the test would need reworking.</li><li>It adds churn to a 515-line component for limited payoff while #23995 is still stacked.</li></ul> |

## 4. Expand: also migrate `LibraryDataset` and delete `DatatypesProvider`/`DbKeyProvider`

After step 3, add a `setup()` to `LibraryDataset`, which has none and is pure Options API. Then delete both providers, the `uploadListProvider` factory and their `storeProviders.test.js` cases. This is the plan's "then it can go".

| Pros | Cons |
|---|---|
| <ul><li>The real payoff: one API (the composables), less code overall, and less Options API render-function code in Vue 3 compat.</li><li>The factory added on this branch would no longer need to exist.</li></ul> | <ul><li>`LibraryDataset.test.js` stubs the providers with lines that #23995 itself added (`mockFailedDatatypesProvider`). Rewriting them while stacked makes the rebase harder; the test challenger already declined to touch them for this reason.</li><li>It deletes the factory this same branch just introduced. That is cleaner as a follow-up than as churn within one PR.</li><li>It moves the branch away from the review response and toward a provider cleanup.</li></ul> |

<details>
<summary>Why this is a follow-up rather than in scope</summary>

The clean order is: land #23995, forward-merge, rebase this branch and drop the cherry-picks, then open a small `dev` follow-up that migrates both Options API consumers and deletes the providers and factory in one step. Doing only step 3 now leaves the providers in place and yields almost nothing. Doing step 4 now conflicts with #23995's test lines while the stack exists. This branch's composables and stores are the precondition for that follow-up either way, so nothing here is wasted except the small factory.

</details>

## 5. Expand: `RuleCollectionBuilder`

`RuleCollectionBuilder.vue` (around line 1316) calls `UploadUtils.getUploadDatatypes`/`getUploadDbKeys` directly. It handles failures with `console.log`, carries `// TODO: provider...` comments, and gets neither the store sharing nor error display. Neither the plan nor any review mentions it.

| Pros | Cons |
|---|---|
| <ul><li>It has the same bug class as this branch's goal: silent empty selectors.</li><li>It is the last caller that bypasses the stores.</li></ul> | <ul><li>It is a large Options API file (more than 1300 lines) and outside the plan and review.</li><li>Showing an error there needs UI decisions in an unrelated builder.</li><li>It belongs in its own follow-up, which could be combined with option 4.</li></ul> |

## 6. `useDetailedDatatypes`: caching/store unification, or a picker swap

There are two variants. (a) Give `useDetailedDatatypes` a store with caching, for `AvailableDatatypes` and the picker. (b) Contract instead: move `DirectoryDatasetPicker` to `useUploadDatatypes`, and revert the new `error` ref on `useDetailedDatatypes`. The picker reads only `extension`/`description`/`descriptionUrl` and never the EDAM fields, so (b) is viable. It would also drop two EDAM requests per picker open and share the cached list, which fits #23977.

| Pros | Cons |
|---|---|
| <ul><li>(a) Deduplicates repeated three-endpoint fetches.</li><li>(b) Fewer requests, one datatype source for upload-like UIs, and no one-off `error` ref.</li></ul> | <ul><li>(a) Different endpoints (EDAM) and different consumers, unrelated to mvdbeek's comment. That is scope creep.</li><li>(b) Needs a shape mapping (`id`/`text`/`description_url` → `extension`/`descriptionUrl`), and the Codex P1 fix and its test would have to be redone. That churn comes after review was already finished.</li><li>Neither is needed for correctness. The current P1 fix works.</li></ul> |

Out for (a). (b) is an optional small polish or follow-up, not a scope change. `AvailableDatatypes` ignoring the new `error` ref is a separate small follow-up.

## 7. Stacking on #23995 vs. waiting for it to merge

The branch can stay stacked and rebase once #23995 merges and `release_26.1` forward-merges to `dev`. The alternatives are to rebuild it once that happens, or to hand `333b511c6d4` to whoever does the forward-merge.

| Pros | Cons |
|---|---|
| <ul><li>Stacked: work and review continue now.</li><li>#23995 is APPROVED, so it should merge soon.</li><li>No `dev` drift on the touched files, so the rebase should be clean.</li><li>`333b511c6d4` documents the exact fix the forward-merge needs.</li></ul> | <ul><li>A PR opened against `dev` while stacked shows #23995's diff a second time.</li><li>If the forward-merger fixes the same tests differently, `333b511c6d4` will conflict and need to be dropped.</li><li>The reply to mvdbeek is still unposted; this branch is effectively that reply.</li></ul> |

Keep it stacked. Open the `dev` PR only after the forward-merge, or as a draft that says it is stacked. Point the forward-merger at `333b511c6d4`.

## 8. Optional split: `SelectionOperations` OK-disable as a 26.1 backport

On `release_26.1`, the Change Database/Build modal has no `ok-disabled`, and `dbKeyStore` logs and swallows failures. A failed load leaves an empty selector with the default "unspecified (?)" item, and OK applies `?` to the selection.

| Pros | Cons |
|---|---|
| <ul><li>Small, a few lines.</li><li>Prevents an unintended metadata edit on 26.1.</li></ul> | <ul><li>On 26.1 it is also the default behaviour when the load succeeds, and the user can see "unspecified (?)", so the severity is low.</li><li>On 26.1 there is no store error state to bind to, so the backport would need its own small error plumbing.</li><li>It widens release-branch scope; skip unless someone reports it.</li></ul> |

## Follow-ups (non-blocking; for separate branches)

- After #23995 forward-merges: migrate `SelectionOperations` and `LibraryDataset` to the composables, then delete `DatatypesProvider`/`DbKeyProvider` and `uploadListProvider` (options 3 and 4).
- `RuleCollectionBuilder`: move to the stores and composables, and show load errors (option 5).
- Optional: switch the picker to `useUploadDatatypes` (option 6b). `AvailableDatatypes` should render `error`.
- Cosmetic: the exported `dbKeySort` still sits under `utils.js`'s "Local helper utilities." comment (from `codex_review.md`).
