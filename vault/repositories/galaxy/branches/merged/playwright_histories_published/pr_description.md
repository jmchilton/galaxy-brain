Removes `@selenium_only` from all 7 tests in
`lib/galaxy_test/selenium/test_histories_published.py`, so the file runs under
the Playwright backend. No source change was needed - the tests pass as written.
The unused `selenium_only` import goes with them.

### Verification

Full file under the Playwright backend against a dev server: **7 passed** in 92s,
no failures, no skips.

### Why this one needed no porting

Two tests reach past the smart components into raw element APIs -
`test_published_histories_tag_click` calls
`card.find_element(By.CSS_SELECTOR, ".stateless-tags")` on a history card, and
`test_published_histories_search_advanced` calls `send_keys` on an element
returned by `wait_for_visible`. Both are already covered by the backend
abstraction: `find_element(by, value)` and `send_keys` are part of
`WebElementProtocol`, and `PlaywrightElement.find_element` translates the
Selenium locator via `_selenium_locator_to_playwright_selector`. The `By`
import is a locator constant, not a driver call, so it stays.

`TestPublishedHistories` is a `SharedStateSeleniumTestCase` that registers its
own two users in `setup_shared_state`, so it does not depend on the ambient
login user and is unaffected by the shared-history state problems seen in some
other files.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
