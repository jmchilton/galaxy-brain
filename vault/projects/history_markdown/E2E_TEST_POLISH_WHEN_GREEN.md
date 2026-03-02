# E2E Test Polish (post-green)

Items to address after confirming tests pass. None are blocking.

## 5. Remove unnecessary `sleep_for` calls

Two sleeps likely redundant — the next line already waits for expected state:

- `test_pages.py` `test_standalone_page_revisions`: `sleep_for(UX_RENDER)` after restore click, followed by `editor.wait_for_value()` which implicitly waits
- `test_pages.py` `test_standalone_page_back_button_returns_to_grid`: `sleep_for(UX_TRANSITION)` after back click, followed by `pages.activity.wait_for_visible()` which waits

**Action**: Remove both sleeps. If they turn out necessary, add comment explaining why the explicit wait isn't sufficient.

## 6. Remove `@managed_history` from standalone page tests

All 4 standalone page tests in `test_pages.py` use `@managed_history` but none create datasets. Pages are standalone (no history binding) and isolated by random slugs. `@managed_history` adds unnecessary history creation/deletion overhead per test.

**Action**: Remove `@managed_history` from:
- `test_standalone_page_unified_editor_round_trip`
- `test_standalone_page_revisions`
- `test_standalone_page_back_button_returns_to_grid`
- `test_standalone_toolbar_shows_permissions_not_history_controls`

## 7. Replace `has_class("disabled")` with proper assertion

In `test_history_pages.py` `test_save_button_disabled_when_clean`:
```python
assert not save_button.has_class("disabled")
```

Fragile — depends on CSS class rather than the element's `disabled` property. Could break across Selenium/Playwright or if component styling changes.

**Action**: Use `assert_not_disabled()` or check the button's `disabled` attribute directly via SmartComponent API.

## 8. Assert actual content in `test_view_published_page_content`

`test_published_pages.py` `test_view_published_page_content` only asserts `.markdown-wrapper` is visible. Doesn't verify rendered text. Setup puts `# Published Content` in the page but the test would pass even if the page rendered empty.

**Action**: After `wait_for_visible()`, assert the text "Published Content" appears in the rendered output.
