# PR checklist: issue_24273_dataset_edit_alert_26.0_baseline

Head `498f65b48a3` on `release_26.0` (`f90a897bfbe`), 7 commits. Evaluated read-only on 2026-10-20 in a scratch worktree with node 22.20.0.

## Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails?
  The refactors don't change any failure UI. After the backport, a failed save shows the server's `err_msg` (for example "This dataset is encrypted.") instead of always showing "Unable to save dataset attributes." (`DatasetAttributes.vue` `submit()`, test "shows why saving failed").
  <details>

  - Form fetch failure: `fetchForms()` keeps base's `AxiosError` `err_msg` → fallback message and still sets `loadingFailed`. `fetchDatasetAttributes` is raw axios, so that path is correct. Covered by the existing test "doesn't render edit controls with error".
  - Preview HEAD failure: `checkPreview()` has the same try/catch body as before.
  - DatasetDetails load failure: `<BAlert v-else-if="datasetLoadingError" variant="error">` has no `show` and an invalid variant, so on base, and still on the main branch, the user sees nothing. This was already broken, the PR doesn't touch it, and no test covers it (see Issues).
  </details>
- [x] Is the diff free of unrelated or stale generated changes?
  Yes!
- [x] Are unit tests not just testing the literal implementation?
  Yes. They mount the components against MSW and assert on rendered DOM and text.
  <details>

  - All 3 "Baseline tests" commits pass on base component code (at `27be4062dab`: 9 files, 46 passed, 2 skipped). At the tip: 47 passed, 2 skipped.
  - The backport test "shows why saving failed" fails red when the pre-backport `DatasetAttributes.vue` (`9eb5612045e`) is swapped in. It expected "This dataset is encrypted." and received "Unable to save dataset attributes.".
  - Gap: the `DatasetDetails` tests only cover the loaded state. Nothing exercises the `loading` branch that `9eb5612045e` rewrites (see Issues 1).
  - `DatasetDetails.test.ts` stubs child components through `vi.mock` by module path. That is necessary for `<script setup>` imports, and the reason is commented.
  </details>
- [x] Are baseline tests in their own leading commits (if applicable)?
  Yes: `b7db9b4199a`, `976a7079009` and `27be4062dab` come first and touch only test files. Refactors come after (`f02f5b494c8`, `d339169598f`, `9eb5612045e`), then the backport (`498f65b48a3`).
- [x] Are the comments free of excess archeology?
  Yes. The only new comment is the stub rationale in `DatasetDetails.test.ts:14`.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve?
  N/A

## Refactor behavior assessment

- `f02f5b494c8` (DatasetAttributes `fetchForms()`): behavior is the same. The only difference: if `onError` threw, `loading` would no longer be reset (`finally` was removed). `onError` only assigns refs, so this can't happen.
- `d339169598f` (DatasetDisplay `checkPreview()`): a pure extraction. The watcher is still `immediate` and the body is the same apart from prettier reflow.
- `9eb5612045e` (DatasetDetails derived `loading`): low risk.
  - Before `onMounted`, the first render now shows the spinner instead of an empty div. Previously `onMounted` set `loading = true` synchronously, before its first await, so the spinner re-render was already happening before paint. Nothing visible changes.
  - The other difference is a fetch that resolves with a falsy dataset: the spinner would now stay up forever instead of showing an empty div. `fetchDatasetDetails` either returns `data` or throws through `rethrowSimpleWithStatus`, so this can't happen in practice.
  - `getDatasetDetails` is called only from `onMounted`, so there is no refetch path where the derivation differs (a refetch would no longer show the spinner, but there is none on base).
- `498f65b48a3`: the content matches upstream `9cb9df41c63` (range-diff shows only context lines and the cherry-pick trailer). Upstream is on `origin/dev` but not on `release_26.1`, so the merge forward should be clean or trivial.

## Lint

eslint on the 7 touched files: 0 errors and 3 warnings. Two warnings are new (`@typescript-eslint/no-explicit-any` at `DatasetDetails.test.ts:15` and `:20`). The third is the existing `vue/no-v-html` in `DatasetDetails.vue`. prettier is clean. vue-tsc was not run.

## Issues

1. **(Should fix) Pin the DatasetDetails loading state before refactoring it.** `9eb5612045e` rewrites `loading`, but no baseline test renders the spinner, so the tests would pass even with `loading` hardcoded to `false`. Add this to `27be4062dab` (it passes on base):
   ```ts
   it("shows a loading message until the details arrive", async () => {
       let releaseFetch: () => void = () => {};
       const fetchReleased = new Promise<void>((resolve) => {
           releaseFetch = resolve;
       });
       server.use(
           http.untyped.get("/api/datasets/:dataset_id", async () => {
               await fetchReleased;
               return HttpResponse.json(dataset);
           }),
           http.untyped.get("/api/jobs/:job_id", () => HttpResponse.json({ id: JOB_ID, state: "ok" })),
       );
       const wrapper = await mountDatasetDetails();
       expect(wrapper.text()).toContain("Loading dataset details...");
       expect(wrapper.find(".DatasetInformation").exists()).toBe(false);

       releaseFetch();
       await flushPromises();
       expect(wrapper.text()).not.toContain("Loading dataset details...");
       expect(wrapper.find(".DatasetInformation").text()).toBe("size 100");
   });
   ```
   The pattern is the same as the held fetch in `DatasetDisplay.test.ts` "shows a loading message until the dataset is stored". Then rebase the main branch onto it.
2. **(Nit) Clear the new `any` warnings in `DatasetDetails.test.ts`.** Change line 15 to `function stubComponent(name: string, render?: (props: { dataset: { file_size: number } }) => string) {` and line 20 to `render(this: { $props: { dataset: { file_size: number } } }, h: ...)`. Alternatively, use `Record<string, unknown>` with a cast at the `DatasetInformation` call site.
3. **(PR description, not code) Say the DatasetAttributes and DatasetDisplay extractions are prep work.** Standing alone, `fetchForms()` and `checkPreview()` each have a single caller, and the `f02f5b494c8` body says "so it can be reused", but nothing in this PR reuses them. On the main branch, `checkPreview` is reused by `onDatasetUpdated`, which justifies it. `fetchForms` is rewritten again there: the bool return and `loadDatasetAttributes` both go away. The description should say these are preparation for the follow-up fix and that the backport changes save-error behavior.
4. **(Out of scope, follow-up) The DatasetDetails load-error alert never shows.** `DatasetDetails.vue`: `<BAlert v-else-if="datasetLoadingError" variant="error">` has no `show`, and `"error"` isn't a Bootstrap variant. The fix is `<BAlert v-else-if="datasetLoadingError" variant="danger" show>`. It is still broken on the main branch. Don't fold it into this behavior-preserving baseline; consider a separate fix or the main branch.
