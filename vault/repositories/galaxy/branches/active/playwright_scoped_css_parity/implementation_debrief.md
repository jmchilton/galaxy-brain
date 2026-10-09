# playwright_scoped_css_parity — implementation debrief

Branch `playwright_scoped_css_parity` @ `e2eeec2f4b0`, one commit on top of
`playwright_text_table_parity` @ `1449e639c22`, 1 file / +2−4. Force-pushed over
`71cc99505e8`. No PR.

Drops `test_histories_list::test_tags`' `@selenium_only`. Two of the three remaining
decorators on dev after this: `test_change_password` (#23808) and `test_library_contents`
(the parent branch).

## The bug is in the test

`test_tags` fetches the tag editor by class and hands it to `add_tag`, which then asks that
same element for a descendant named by the same class:

```python
tags_cell = self.get_history_card(...).find_element(By.CSS_SELECTOR, ".stateless-tags")
...
tag_button = tags_cell.find_element(By.CSS_SELECTOR, ".stateless-tags button")
```

`.stateless-tags` is the root `<div>` of `StatelessTags.vue`, so the inner selector asks for a
`.stateless-tags` nested inside a `.stateless-tags`. Nothing renders that.

Selenium finds the button anyway: a scoped CSS find matches the selector against the whole
document and then filters to descendants of the context element, so the redundant prefix is a
no-op. Playwright matches relative to the element and reads the selector as written. The
decorator recorded the symptom as the tag editor never rendering under Playwright; it renders.

Fix is to drop the prefix — every button under `tags_cell` is already under a `.stateless-tags`,
so the matched set is identical on both backends.

## The rejected version, and why

The first implementation changed the adapter instead: `PlaywrightElement.find_element` /
`find_elements` routed every CSS locator through an in-page
`element.querySelectorAll` via `evaluate_handle` + `get_properties()`, reproducing Selenium's
document-then-filter semantics. 37 lines in `playwright_element.py`, plus a `basic.html`
fixture addition and a unit test.

Rejected 2026-10-05, same shape as the `PlaywrightElement.text` warp rejected on the parent
branch a week earlier — warping the adapter to imitate Selenium rather than fixing the test.
Three concrete costs:

- Every scoped CSS find in the whole suite pays a JS round trip, to reproduce a W3C quirk.
- It applied only to CSS; xpath and Playwright's text engines kept native relative scoping, so
  two locator types in the same class would scope differently.
- It hid a selector that is wrong on its own terms, under either backend.

**Blast radius was surveyed before committing to the test fix**: `add_tag` has exactly one
caller, and the other four `.stateless-tags` lookups in the tree pass a container that genuinely
*contains* the editor — `test_histories_list:293`, `test_histories_published:49`,
`navigates_galaxy:1844` and `:1861`. The suite being down to three `selenium_only` decorators
overall is the corroborating evidence that no other site hits this.

## Verification

Red first, with the decorator removed and the selectors untouched, under Playwright:

```
FAILED ...test_tags - Exception: No element found with css selector='.stateless-tags button'
1 failed, 13 deselected in 27.33s
```

Then the full file, green on both backends against a live Galaxy (Vite 5173):

- Playwright — `14 passed in 211.83s`
- Selenium — `14 passed in 274.10s`

No driver code is touched, so `test/unit/selenium/` is unchanged from the parent branch.
black / ruff / flake8 / prettier clean via pre-commit.

## Questions for John

- The parent branch's note still stands: its E2E test (`test_import_dataset_from_path`) has
  never been run against the shipped code on either backend. Worth a local run before the stack
  goes up, or let fork CI answer it?
- `test_histories_published.py:49` does the same `.stateless-tags` → `.tag` walk and passes
  today. Leave it, or pull both tag-cell helpers onto `navigates_galaxy` while the area is open?
