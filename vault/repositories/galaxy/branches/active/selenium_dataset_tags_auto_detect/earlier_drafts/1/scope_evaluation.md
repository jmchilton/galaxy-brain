# Scope evaluation

**Recommendation: expand, modestly.** Add an id to the Attributes-tab Auto-detect button in `DatasetAttributes.vue`, for example `id="dataset-attributes-autodetect-metadata"` to match the Datatypes tab's `#dataset-attributes-autodetect-datatype`. Point `edit_dataset_attributes.auto_detect_metadata_button` at that id instead of the `#dataset-attributes-default-save + button` sibling selector. Optionally, assert in `DatasetAttributes.test.ts` that the button emits the autodetect submit. Every review round (normal, test challenges, polish, thermo-nuclear) flagged this selector, and each one deferred it only because "the plan rules out client changes on 26.2". The scope policy rejects that reason: Galaxy is liberal about release branches, and the sibling `selenium_history_datatype_citations` already adds `data-description`s to 26.2 client code. The change is one attribute in markup, with no behaviour change. Leave everything else as implemented. The other expansions all touch unrelated test files or helpers that the sibling 26.2 branches also touch, which adds merge risk for little gain.

## Possible decompositions

The branch is about 87 added and 16 removed lines of non-generated code, just over the threshold. It splits cleanly by test:

1. **Tagging PR:** `3f1900de910` (share `tags_add_from_button`) plus `fb0283ee475` (tagging test, `content_item.tag_area_*`, `history_panel_item_add_tags`). Touches navigation.yml, schema.ts, navigates_galaxy.py and test_history_panel.py.
2. **Auto-detect PR:** `10f649d0e87` (`_click_and_assert_success_alert` refactor) plus `142b0facd30` (Auto-detect test, plus the proposed id if expanded). Touches navigation.yml (a different hunk), test_dataset.py and, if expanded, DatasetAttributes.vue.

The two pieces don't depend on each other and can land in either order. The only shared file is navigation.yml, in separate components.

## Scopes considered

### 1. As implemented

Two missing 26.2 E2E tests: item Add Tags with name-tag propagation, and Attributes-tab Auto-detect. Two test-helper refactors, and no client changes.

| Pros | Cons |
|---|---|
| Test-only, so there's no risk to the release | `auto_detect_metadata_button` depends on DOM order. Reordering the buttons or inserting one would silently retarget it or break it |
| Merge-tree clean against all four sibling 26.2 branches | Leaves the selector problem that every reviewer raised as a "dev follow-up" that nobody owns |
| Both refactors remove real duplication with existing callers | |
| Green under Playwright and Selenium | |

### 2. Modest expansion: id on the Attributes-tab Auto-detect button (recommended)

Add an id to the second `GButton` in the Attributes tab of `DatasetAttributes.vue` and use it in navigation.yml. Optionally, add a vitest assertion that clicking it submits `autodetect`.

| Pros | Cons |
|---|---|
| Fixes the one open item that every review round flagged | Adds a client file to a test-only branch, so the client has to be rebuilt before the E2E run |
| Matches the Datatypes tab's existing id convention, so the two Auto-detect buttons are symmetric | The vitest file has button-count assertions. An id doesn't change the count, but those tests need rerunning |
| Precedent: `selenium_history_datatype_citations` already adds client `data-description`s on 26.2 | |
| No behaviour change, and the Vue change is very unlikely to conflict with the sibling branches | |

<details>

The button is `v-if="!datasetAttributes['metadata_disable']"`. With the sibling selector, a hidden button makes `+ button` match nothing, which happens to be the right outcome. If any element is ever inserted between Save and Auto-detect, the selector goes wrong silently. An id makes the test fail loudly instead. Per Local Checks, run vitest under the node version in `client/.node_version`.

</details>

### 3. Expansion: move the remaining hand-written tag entry onto `tags_add_from_button`

Convert `test_workflow_editor.py::test_pick_value_add_tags_pja` and `test_histories_list.py::add_tag` (a raw `.toggle-button` lookup on a grid cell) to the new helper.

| Pros | Cons |
|---|---|
| Gives the new abstraction more callers, as the reuse rules prefer | Touches two unrelated test files and widens the conflict surface with the sibling 26.2 branches |
| | `add_tag` works on a raw grid-cell WebElement that has no component selectors, so converting it needs new navigation.yml entries |
| | Three review rounds already declined this, with no new reason since |

### 4. Expansion: merge `tagging_add` and `tags_add_from_button`

Combine the raw-CSS workflow tag helper (`navigates_galaxy.py:~1929`) with the component-based one.

| Pros | Cons |
|---|---|
| Leaves one tag-entry helper instead of two | The two aren't equivalent: `tagging_add` has no toggle and re-clicks the input when `auto_closes` is set |
| | Would touch the workflow-management tests. Better suited to dev |

### 5. Expansion: repair the stale `edit_dataset_attributes` interface in schema.ts

On 26.2 the interface lists `save_btn` and `database_build_dropdown`, which don't exist in navigation.yml, and it's missing most of the real keys.

| Pros | Cons |
|---|---|
| Fixes a related, pre-existing type drift in a component this branch touches | schema.ts is hand-maintained and stale across many components on 26.2, so fixing one interface is arbitrary |
| | Nothing type-checks the Python callers against it, so there's no user-visible benefit |

### 6. Contraction: split into two PRs, or drop one test

Ship the tagging test and the Auto-detect test as separate PRs, or ship only one of them.

| Pros | Cons |
|---|---|
| Each PR would be very small and easy to review | John asked for one combined "missing tests" branch |
| | Both tests are standalone, green, and serve the same goal (26.2 coverage gaps), so splitting adds PR overhead for no review benefit |

