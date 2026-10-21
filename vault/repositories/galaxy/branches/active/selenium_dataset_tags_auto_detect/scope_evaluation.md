# Scope evaluation (round 2, after re-scope)

**Recommendation: keep as implemented.** Round 1's one expansion is done: the Attributes tab's Auto-detect button has `id="dataset-attributes-autodetect-metadata"` in its own commit (`433684ad9e2`), and `auto_detect_metadata_button` targets it. After the re-scope, the normal review, test challenges, polish, thermo-nuclear and Codex rounds found no new scope gap. Every remaining expansion was already weighed in round 1 and declined with reasons that still hold, or touches unrelated tests the sibling 26.2 branches also touch, or adds hooks with no caller. The bias toward modest expansion was spent on the id. Nothing in touched code is a related bug left unfixed. One non-scope item for John: thermo-nuclear asked whether `tags_add_from_button` should be `tagging_add_from_button` (existing helper is `tagging_add`; `tags_*` is a new prefix). That's a naming call, not a scope change.

## Possible decompositions

About 88 added / 16 removed lines across 6 files, 5 commits. Splits cleanly by test:

1. **Tagging PR:** `3f1900de910` (share `tags_add_from_button`) + `ade49b3e065` (tagging test, `content_item.tag_area_*`, `history_panel_item_add_tags`). Touches navigation.yml, schema.ts, navigates_galaxy.py, test_history_panel.py.
2. **Auto-detect PR:** `10f649d0e87` (`_click_and_assert_success_alert`) + `433684ad9e2` (Vue id) + `0f23fc4cf5a` (Auto-detect test). Touches DatasetAttributes.vue, navigation.yml (separate hunk), test_dataset.py.

Independent; either order. A finer variant lands `433684ad9e2` alone first as the only client change, but it's one line with no caller until the test.

## Scopes considered

### 1. As implemented (recommended)

Two missing 26.2 E2E tests (item Add Tags with name-tag propagation; Attributes-tab Auto-detect), two duplication-removing test-helper refactors, one behaviour-neutral Vue id.

| Pros | Cons |
|---|---|
| Closes the only issue every round-1 reviewer raised (sibling selector) | Touches client code, so it no longer matches already-deployed 26.2 servers (gxui) |
| Id matches its siblings `#dataset-attributes-default-save` / `#dataset-attributes-autodetect-datatype` | Without the id, the Auto-detect test fails at selector lookup, not at its own assertion (accepted in test challenges) |
| Green under Playwright and Selenium; Codex, thermo-nuclear and polish all found nothing to act on | |
| Id isolated in its own commit, easy to drop | |

### 2. Contraction: revert to `_alt_original_scope`

Drop `433684ad9e2` and use the `#dataset-attributes-default-save + button` sibling selector (branch `selenium_dataset_tags_auto_detect_alt_original_scope`).

| Pros | Cons |
|---|---|
| Test-only PR, zero client diff | Brings back the DOM-order selector every round-1 reviewer flagged |
| Selector works against deployed 26.2 servers that gxui drives | gxui can keep its own override; that's not a reason to weaken the upstream test |

### 3. Expansion: ids on the remaining id-less Attributes buttons

Datatypes-tab Save, Conversion and Permissions `GButton`s in `DatasetAttributes.vue` have no id.

| Pros | Cons |
|---|---|
| Every action button in the component gets a stable hook | No test or helper clicks them, so the ids would be hooks with no caller (Unused Infrastructure rule) |
| | Belongs with whichever test first needs them |

### 4. Expansion: move remaining hand-written tag entry onto `tags_add_from_button`

Convert `test_workflow_editor.py::test_pick_value_add_tags_pja` and `test_histories_list.py::add_tag`.

| Pros | Cons |
|---|---|
| More callers for the new helper | Unrelated test files; widens conflict surface with sibling 26.2 branches |
| | `add_tag` works on a raw grid-cell element with no component selectors; needs new navigation.yml entries |
| | Declined by four rounds now, no new reason |

### 5. Expansion: merge `tagging_add` with `tags_add_from_button` (or rename into `tagging_*`)

One tag-entry helper instead of three paths.

| Pros | Cons |
|---|---|
| Removes a naming outlier and a parallel path | Not equivalent: `tagging_add` has no toggle and no `UX_RENDER` sleep between tags; merging changes workflow-test behaviour |
| | A rename alone reruns every `history_panel_add_tags` caller on both backends; John's naming call |

### 6. Expansion: repair the stale `edit_dataset_attributes` interface in schema.ts

On 26.2 it lists keys that don't exist and misses most real ones.

| Pros | Cons |
|---|---|
| Fixes drift in a touched component | schema.ts is stale across many components on 26.2; one interface is arbitrary |
| | Nothing type-checks the Python callers against it |

### 7. Expansion: pull more missing tests into this branch

Add other `galaxy_ui_driver` QA tests or other Attributes-tab gaps (e.g. Conversion, Permissions).

| Pros | Cons |
|---|---|
| More 26.2 coverage per PR | The upstreaming plan assigns other tests to their own sibling branches; folding them here duplicates that work |
| | John scoped this branch to these two tests |

### 8. Contraction: split into two PRs

See Possible decompositions.

| Pros | Cons |
|---|---|
| Each PR tiny | John asked for one combined "missing tests" branch |
| | Tests are independent and green; split adds PR overhead with no review gain |
