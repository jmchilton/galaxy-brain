# Rescope review: selenium_tool_form_helpers

**What changed:** I added a real-DOM red→green E2E for `f29fcf6`, made the cap on section expansion raise instead of falling through silently, moved repeat-instance counting into a `NavigatesGalaxy` method that the unit test reuses, and shaped the fixture's repeat blocks like FormCard. I kept the xpath insert targets, not the `data-repeat-path` client attribute. Reviewed `origin/dev...f29fcf6abfe`. The fixes are folded into `88fe5b4` and `f29fcf6`. New head is `a455e58946f`, and the final tree is otherwise identical.

Not acted on:
- **`data-repeat-path` on `FormRepeat.vue`.** It would be cleaner, but it only works against clients that ship the attribute, and `galaxy-selenium` drives deployed servers. The ambiguity guard can't fire on real tools: a scan of `test/functional/tools`, `tools/` and `lib/galaxy/tools/bundled` found no same-named repeats sharing a scope (every collision sat in different `when` branches, which never render together).
- **No E2E for `repeat_insert_in_instance` (nested repeats).** No test tool has a repeat inside a repeat. Only the fixture covers this target, so it could drift if `FormRepeat`'s `${prefix}_clone` id or the `repeat block` fallthrough changes. Accepted, and noted here.
- **No E2E for a repeat inside a collapsed section.** No test tool has a repeat in a section. The fixture covers it, and the new `section` E2E covers the collapsed-section xpath against the real DOM.
- **Sections inside a conditional case revealed during the fill stay collapsed.** This is dev behavior, and no test tool has a section in a conditional. A follow-up could expand again before the deferred retry pass.
- **Merging the two `_Page` shims** (`test_select_set_value.py`, `test_add_repeat_instances.py`). They're two small shims that borrow different methods, so a shared base would be over-built.
- **The unused `section_header` target** stays in navigation.yml, which is shared.
- **`_assert_data_selected` runs only for int hids.** String labels come from the harness, which builds them as `"hid: name"` itself.

<details>
<summary>Full review</summary>

## `0ca0652` collection hid map-over

- Correct. `history_contents()` is fetched once per fill, and only when there is int data. The collection-mode click is conditional on the button being present, so `data_collection` params skip it. The selection assert uses `startswith("N: ")`, so hid 1 can't match "10: …".
- `select.find_elements(By.CSS_SELECTOR, …)` follows the established pattern (`rule-column-selector`). `PlaywrightElement.find_elements` supports it.
- It doesn't switch back to single-dataset mode when a dataset hid lands on a field already in collection mode. It fails loudly through the assert, which is acceptable.
- E2E passes under both backends.

## `88fe5b4` repeats in conditionals, sections and repeats

- The xpaths match the real DOM:
  - `FormRepeat` renders each instance as a `FormCard` whose root `.ui-portlet-section` gets `data-description="repeat block"` by attribute fallthrough.
  - The clone button `${prefix}_clone` sits in `.portlet-header .portlet-operations`.
  - The insert span carries `data-repeat-name="${input.name}"` outside the instance cards.
- `ancestor::repeat block[1]` from the clone button is the instance card. The insert of the inner repeat is its descendant.
- The top-level target (`not(ancestor::repeat block)`) is right for repeats in a conditional or section.
- `repeat_instance_counts` sorts by depth, so parents come first: a parent path is a strict prefix with fewer `|`.
- Collision scan: the guard would fire only on same-named repeats in sibling sections, or at the top level beside a section. No such tool exists, because all collisions found are in different `when` branches, and `FormInputs` renders only the active case (`v-if`). So there is no harness regression versus dev's first-match click.
- Reuse: the counting loop was duplicated in the unit test. It's now `_repeat_instance_count`.
- Fixture fidelity: blocks were bare `div`s with the clone button as a direct child. They're now FormCard-shaped (`ui-portlet-section card`, header > operations > clone, content). That checks both the `ancestor` lookup and that the collapsed-section xpath ignores repeat-block headers.
- The `data-path` attribute only drives the page, and the fixture says so. It's a reasonable trade-off given there's no nested-repeat test tool.

## `f29fcf6` expand only collapsed sections

- Real DOM: `FormCard` uses `v-show="expanded"` on `.portlet-content`, which writes `style="display: none;"`. The xpath keys on that and skips headers with a hidden ancestor.
- Every `FormCard` that can render collapsed is collapsible: sections, editor `FormOutput` / "Assign columns", and the workflow run steps. Conditional portlets and repeat blocks never get `display: none`. So a click always makes progress.
- It used to fall through silently after 50 clicks. Now the cap is 100, sized so the editor's two cards per output aren't a problem, and hitting it raises.
- Dev's old click-every-header logic collapsed `expanded="true"` sections. New E2E `test_tool_form_fill_expands_only_collapsed_sections` (the `section` tool: int expanded, float collapsed) proves it:
  - Red against `62f1d2e`, the parent of `f29fcf6`: `int|inttest` timed out becoming visible, because the toggle collapsed the open section.
  - Green under both backends.
- Like dev, the xpath isn't scoped to the tool form. In the editor it also expands `FormOutput` cards, as dev did. That's harmless, and the editor test passes.
- Harness (`RunsToolTests`): `section_0` and `gx_section_boolean_0` both fill and run. They fail only at the known legacy-submission assertion.

## Whole branch

- `lib/galaxy/selenium` imports nothing from galaxy_test, and its imports sit at the top of the module.
- mypy is clean (from `lib/`), and pre-commit with the sample config is clean.
</details>
