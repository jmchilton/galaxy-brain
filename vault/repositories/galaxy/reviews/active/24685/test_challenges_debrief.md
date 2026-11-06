# Test challenges debrief — #24685

Profile `gx_test_challenger`, Opus 5.5 (claude-opus-5-5), medium effort. Reviewed commit `150cb834122` (base `dev`, merge-base `5ab3087a566`).

Nothing was edited in the PR; everything below is a recommendation.

**Verdict:** the tests are behavior-focused and mount the real `GLink`, which is right for a migration. One real coverage gap (no browser test clicks a `BreadcrumbHeading` link) and some trimming.

**Not run:** Vitest (`client/node_modules` absent in this worktree) and E2E. CI `client-unit-test` passes on the PR. Code sketches below are reasoned, not executed.

## Unit test challenges

### `CollectionCreatorIndex.test.ts` (new)

Keep both tests. They cover the failure and success alerts, then click through to `resetCreator`. No existing test covers these paths: E2E has no simple way to force a create error and doesn't click "Create another collection".

Challenges:

- `vi.mock("@/api/datasetCollections")` should be `useServerMock`. The README calls MSW the preferred approach, and the sibling `ListCollectionCreator.test.ts` and `PairCollectionCreator.test.ts` use it. `createHistoryDatasetCollectionInstanceFull` is a thin `GalaxyApi().POST("/api/dataset_collections")`.
- The mock also fakes the failure shape. `mockRejectedValue("Collection name is invalid")` rejects with a string, but the real function goes through `rethrowSimple`, which throws `Error(...)`. The component stores that with `error as string`. An MSW error response tests what actually happens. `toContain` should still match, though the rendered text may carry an `Error: ` prefix; that is existing behavior and worth a look when the mock is swapped.
- `useHistoryDatasets` mock: keep. It is effectively a noop implementation, and the real composable needs history stores and a fetch cycle to reach `initialFetchDone`.
- `findLinkByText` finds elements by `.g-link`, GLink's internal class. Finding `button` by text is enough and doesn't depend on that class.
- `expect(retry.element.tagName).toBe("BUTTON")` (and the `another` twin) restates GLink's element choice; see the `.g-link` note below.

### `BreadcrumbHeading.test.ts`

- "resolves a named route location into the link target": keep. It uses a real router and pins the only new logic in the PR (`resolvePath`).
- No `to: {` caller found passes `query`, so `fullPath` vs `path` doesn't need a separate test.
- Drop the two `expect(link.classes()).toContain("g-link")`. The remaining active-class, `href` and `title` assertions predate or are outside this challenge.

### `PersistentTaskProgressMonitorAlert.test.ts`

- Swapping the crash-workaround `BLink` stub for `GLink: false` is a real improvement, and `toBe("Download here")` is a strengthening.
- Drop `toContain("g-link")` and `tagName` `"A"`: the `href` assertion already implies an anchor. The E2E test only waits for `.download-link` to be present, so the `href` assertion stays at this layer.

### `DatasetDetails.test.ts`

- Most of this test duplicates `test_dataset_change_dbkey`, which clicks `.dbkey .value` and waits for the edit form. That E2E test covers the selector and the click-to-edit path, so `tagName`, `.value` and `text` add nothing.
- The unique value is `outerClick` not being called: `.stop` keeps the click from reaching the history item. E2E wouldn't notice that. Keep it and focus the test on it.
- The inline template wrapper with `v-bind="$attrs"` isn't needed for this. A listener on the component's root `<div>` sees the bubble, and the file's existing `shallowMount` style with `stubs: { GLink: false }` (same as the PersistentTask spec) renders the real link:

```ts
const wrapper = shallowMount(DatasetDetails as object, {
    localVue: getLocalVue(),
    pinia,
    propsData: { id: "abc", itemUrls: {} },
    stubs: { GLink: false },
});
const outerClick = vi.fn();
wrapper.element.addEventListener("click", outerClick);

await wrapper.get('.dbkey [data-label="Database/Build"]').trigger("click");

expect(wrapper.emitted("edit")).toHaveLength(1);
expect(outerClick).not.toHaveBeenCalled();
```

### The `.g-link` and `tagName` assertions

`.g-link` is GLink's own class, and which element it renders is `useClickableElement`'s decision, covered in `GLink.test.ts`. These assertions fail on a GLink refactor without any change in behavior in these components, and they say nothing the behavior assertions next to them don't. This is the "testing the implementation directly" case.

### Checked, no action

- No layout faking, no trivial prop-to-class tests (`thin` and `font-weight: inherit` are rightly not asserted; jsdom can't verify them).
- The `@ts-expect-error` override of `getHistoryItems` is a one-off in the tree, but seeding the real getter needs more setup than it saves. Left alone.
- The `fromSelection` gate on "Create another collection" is untested but unchanged by this PR.

## E2E challenge

The PR says it ran `test_dataset_change_dbkey` and `test_workflow_export_file_native`, which cover the dbkey and download links. Status per element:

| Element | Browser coverage | Action |
| --- | --- | --- |
| dbkey link | `test_dataset_change_dbkey` clicks it, edit form opens | none |
| `.download-link` | `test_workflow_export_file_native`, presence only | none; `href` is unit tested, and a real download adds little |
| "Try again" | none; no simple way to force a create error in E2E | unit test is enough |
| "Create another collection" | none | unit test is enough; a click on a native button has no browser-specific risk |
| Breadcrumb link | **none**: nothing under `lib/galaxy_test` or `navigation.yml` targets `BreadcrumbHeading` (the admin `#breadcrumb` is `BBreadcrumb`) | **add** |

The breadcrumb is the one element whose wiring changed beyond a tag swap (`to` is now a resolved string through `RouterLink`). It is step 1 of the PR's manual test plan and is cheap to automate: `test_history_storage_accessibility` already lands on `StorageManager`, whose breadcrumb targets `{ name: "StorageDashboard" }`, and then re-navigates to the dashboard through the masthead.

## Test plan

1. **E2E, breadcrumb back-navigation (add).** In `client/src/utils/navigation/navigation.yml` under `storage_dashboard.selectors`:

   ```yaml
   breadcrumb_link: '.breadcrumb-heading-header-active'
   ```

   In `lib/galaxy_test/selenium/test_history_storage.py::test_history_storage_accessibility`, replace the second `self.navigate_to_storage_dashboard()` with:

   ```python
   self.components.storage_dashboard.breadcrumb_link.wait_for_and_click()
   self.components.storage_dashboard.free_space_link.wait_for_visible()
   ```

   Run that one test under Playwright and Selenium. `schema.ts` has no `storage_dashboard` entry, so it needs no update.
2. **`CollectionCreatorIndex.test.ts`:** replace the API `vi.mock` with `useServerMock`, returning a 400 with `err_msg` for failure and the created collection for success. Look up links by `button` and text.
3. **`DatasetDetails.test.ts`:** rewrite as sketched above; drop `tagName`, `.value` and `text`.
4. **`BreadcrumbHeading.test.ts`, `PersistentTaskProgressMonitorAlert.test.ts`, `CollectionCreatorIndex.test.ts`:** drop `.g-link` and `tagName` assertions.
5. Run the four specs with `pnpm test:watch <name>`.
