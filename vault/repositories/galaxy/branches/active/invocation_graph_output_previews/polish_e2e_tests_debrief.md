Run via claude-opus-5-5 at high effort.

# Polish E2E tests debrief: invocation_graph_output_previews

`test_hover_previews_step_outputs` now goes through a per-output `invocations.graph_step_output` sub-component, asserts the collection preview's element names through a new DOM hook, and waits for the image to finish loading before its screenshot. Everything was folded into the E2E commit, now `53652c7aa3a`. The other two commits (`94c3576a979`, `a5abc580b62`) are unchanged.

## Changes

- **navigation.yml.** The seven flat `graph_step_output_*` selectors each repeated the `[data-description="invocation step outputs"] [data-output-name="${name}"]` prefix. They are now one `invocations.graph_step_output` sub-component, whose `_` is that prefix. Its children `label`, `table`, `table_row`, `text`, `image` and `collection_element_name` use `${_}`, following the `workflow_editor.node` pattern. The popover-level selectors stay flat: `graph_step_outputs`, and `graph_step_outputs_loading`, renamed from `graph_step_output_loading` because it covers the whole popover.
- **Test helpers.** `_hover_outputs` now returns the hovered output's component (`graph_step_output._(name=...)`), so the test body reads `output.label` and `output.table_row` instead of passing `name=` again on every call. `_assert_output_text` was removed. It was used only once, and its check of the collection header text is replaced by the element assertion below.
- **Collection assertion (DOM decoration).** `CollectionTree.vue` (the Markdown collection display) gets `data-description="collection element name"` on each element's label. The test now asserts the output label `lines` and the elements `["1", "2"]`, which proves the collection's contents render. Before, it checked only the card header. The change is one attribute, and `CollectionTree.test.js` still passes.
- **Multi-output step.** The test also asserts that `output_b` is listed under its workflow-output label, `numbers_b`. Before, the test checked only its value.
- **Screenshot settling.** `_wait_for_image_loaded` waits for `img.complete && naturalWidth > 0`, using a `_wait_on` over `execute_script`, which works on both backends. Until the image loads, the popover can be captured blank or at the wrong size, because floating-ui repositions it as the image grows. All four `self.screenshot(...)` calls are kept. The table, collection and text screenshots already follow element-specific waits, so they needed no extra settle.

## Checked and left alone

- **Sleeps.** The hover test has none. The only sleep in the file is `test_isolate_selected_step_lineage`'s commented `UX_RENDER` wait for a CSS opacity transition. It comes from dev, not this branch.
- **Tag selectors inside a preview.** `table.g-table`, `pre` and `img` are scoped to a single output's preview, which holds exactly one dataset display, so they are unambiguous. `g-table` is GTable's stable class and is used elsewhere in navigation.yml. Decorating `HistoryDatasetDisplay` or `DatasetAsImage` would touch shared Markdown components and make no assertion stronger.
- **Shared abstractions.** `_hover_outputs` and `_wait_for_image_loaded` are used only in this file, so they stay as file-local helpers rather than going into `NavigatesGalaxy`.
- **Client refactoring.** None needed. The popover, preview and label hooks were already in place from earlier steps.

## Verification

- `test_hover_previews_step_outputs` was run against the running servers (Playwright backend): it passed before the changes (98s) and after them (86s). I checked all four screenshots after the change. The image is fully drawn, and the collection shows elements 1 and 2.
- I didn't run the whole file. The only shared code touched is navigation.yml, and only the selectors this branch added changed there. grep finds no other users of them.
- Vitest on `Markdown/Sections/Elements/HistoryDatasetCollection/` and `Workflow/Invocation/Graph/`: 5 files, 17 tests, all pass. ruff, black and prettier are clean.
