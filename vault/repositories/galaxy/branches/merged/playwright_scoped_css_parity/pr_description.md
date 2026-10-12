Run `test_tags` under Playwright by fixing tag editor selectors that repeat their own `.stateless-tags` scope.

The test has been `@selenium_only("Tag editor never renders under Playwright - no .stateless-tags button")`. The tag editor renders fine. The test finds the `.stateless-tags` element and then, inside it, asks for `.stateless-tags button`, which is a `.stateless-tags` nested in a `.stateless-tags`. `.stateless-tags` is the root `<div>` of `StatelessTags.vue`, so that nesting never exists. The two backends read the selector differently:

| Backend | How a scoped CSS find matches | `.stateless-tags button` under the editor |
| --- | --- | --- |
| Selenium | against the whole document, then keeps the context's descendants | the editor's button ✅ |
| Playwright | relative to the context element, as written | nothing 😬 → `No element found` |

```python
# before - only works because Selenium ignores the scope while matching
tag_button = tags_cell.find_element(By.CSS_SELECTOR, ".stateless-tags button")
tag_input = tags_cell.find_element(By.CSS_SELECTOR, ".stateless-tags input")

# after - relative to tags_cell, named like navigation.yml's tag_area_button / tag_area_input
tag_button = tags_cell.find_element(By.CSS_SELECTOR, ".toggle-button")
tag_input = tags_cell.find_element(By.CSS_SELECTOR, ".headless-multiselect input")
```

The new selectors name the editor's open button and input the same way `navigation.yml` (`tag_area_button`, `tag_area_input`) and the workflow list's tag helper already do. ***On Selenium they find the same button and input as before, so its coverage doesn't change.*** They also stop relying on the card having no tags. With tags present, a bare `button` would be a tag's delete button.

***This is test-only. No client or server code changes, and the test's steps and assertions are unchanged.***

***The test is fixed, not `PlaywrightElement.find_element`. Playwright keeps its relative scoping, so CSS, xpath and text locators all scope the same way.***

***It now runs in both the Selenium and Playwright CI jobs.***

<details><summary>Why no other test hits this</summary>

`add_tag` has one caller, `test_tags`. The other four element-scoped `.stateless-tags` lookups in the tree (`test_histories_list.py`, `test_histories_published.py` and two in `navigates_galaxy.py`) pass a container that holds the editor, not the editor itself.

</details>

## Risks

Risks are minimal - this change only touches one test, so it doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Builds on 🔀 #23820 and 🔀 #23808, part of moving the Selenium suite onto Playwright. With 🔀 #24009 (merged) and 🔀 #24010 (`test_history_pages`), this removes the last `@selenium_only` decorator on a test.

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? If the tag editor doesn't render, `add_tag` fails to find `.toggle-button` inside the tags cell.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A. No unit tests. The E2E test still checks that searching by the new tag filters the histories list.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests run</summary>

- With the decorator removed and the old selectors kept, `test_tags` fails under Playwright with `No element found with css selector='.stateless-tags button'`.
- With the prefix dropped (bare `button` / `input`), all 14 tests in `test_histories_list.py` pass locally under Playwright and under Selenium.
- The final `.toggle-button` / `.headless-multiselect input` selectors are verified by fork CI's Playwright and Selenium jobs.
- CI's Playwright job (`playwright.yaml`) skipped `test_tags` while it was `@selenium_only`. It runs there now.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
