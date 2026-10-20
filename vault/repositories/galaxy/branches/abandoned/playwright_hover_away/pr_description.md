Adds `hover_away()` to the backend-neutral gesture vocabulary and stops `HasPlaywrightDriver` handing out a fake action-chain builder.

### Why

`_clear_tooltip` was the last use of `action_chains()` in shared code that was not already behind a `backend_type == "selenium"` branch. Under Playwright it reached `HasPlaywrightDriver.action_chains()`, which returned `self`, so `move_by_offset` raised `AttributeError` on the driver. Every tooltip assertion was therefore broken under Playwright.

Nothing caught this. `integration_selenium.yaml` has no Playwright matrix, and the four `assert_tooltip_text_contains` calls in `test_dataset_details_source_transforms.py` are the only live callers of the tooltip helpers.

### `hover_away()`

Selenium keeps exactly what it had, `move_by_offset(100, 100)`.

The Playwright side is deliberately **not** a faithful port. Selenium's version is *relative* to the current pointer, and Playwright exposes no read of that position; parity would need the driver to track every mouse move. It cannot reliably do that today, because `mouse_drag`'s Playwright branch still moves the mouse from `navigates_galaxy`, outside the driver, so a cached position would go stale and be silently wrong — the exact failure class this vocabulary exists to remove.

So the Playwright implementation asks the page which element is hovered (`document.querySelectorAll(":hover")`), takes the innermost one, and moves clear of its box. No stored state.

Known limit: it clears the *innermost* hovered element, so a trigger that is an ancestor of what the pointer sits on could survive. Selenium's blind offset has the same hole, and `_clear_tooltip` already retries twice before raising a named message, so this fails loudly rather than silently.

### `action_chains()` now raises under Playwright

The stub returned `self`, which made every chain method an `AttributeError` on the driver rather than a clear refusal. It now raises `NotImplementedError` naming the gestures to use instead.

This cannot regress anything: the stub already made any *use* of the returned object fail. The only code that survived it was `test_action_chains`, which asserted `chains is not None` — precisely the one thing a stub satisfies. That test now asserts the per-backend contract rather than being deleted.

Every remaining `action_chains()` site in `navigates_galaxy.py` (1245, 3012, 3045, 3088) is already inside a Selenium branch, so shared code never reaches the refusal. Porting those, plus the remaining test-suite callers, is the separate enforcing step that deletes `action_chains()` from the protocol entirely.

### Verification

- `test_hover_away` added beside `test_hover`, reusing the existing `#hover-target` / `#hover-indicator` fixture and its `:hover + sibling` CSS, so it runs against real browsers on all three fixture params (Selenium, Playwright, proxied Selenium). Confirmed load-bearing by stubbing both implementations and watching it go red on all three.
- `test/unit/selenium/test_has_driver.py`: 309 passed, 1 skipped.
- The real-Galaxy tooltip path was probed separately with a throwaway test doing two `get_tooltip_text` reads with `click_away=False`, so the second can only succeed if `_clear_tooltip` dismissed the first. Green under both backends. That probe also covers the ancestor-trigger case, since `MastheadItem` puts the tooltip directive on the `<li>` while the pointer lands on the `<a>` inside.

No `selenium_only` decorators are dropped here — the tooltip tests were never decorated, just never run under a backend that worked.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
