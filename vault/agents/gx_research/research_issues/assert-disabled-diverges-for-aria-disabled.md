# `assert_disabled` disagrees between Selenium and Playwright on aria-disabled GButtons

- Area: E2E test framework (`HasDriver` / `HasPlaywrightDriver`)
- Found while: [[Component - Galaxy UI Buttons and Tooltips]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

GButton and GLink mark disabled only with `aria-disabled="true"`, never with native `disabled` (`client/packages/ui/src/components/GButton.vue:146`, asserted by `client/src/components/BaseComponents/GButton.test.ts:43-52`).

- `lib/galaxy/selenium/has_driver.py:211-215` `assert_disabled` asserts `not element.is_enabled()`. Selenium's `is_enabled()` reflects only native `disabled`, so the assertion **fails** on a disabled GButton.
- `lib/galaxy/selenium/has_playwright_driver.py:393-399` uses Playwright's `Locator.is_enabled()`. Playwright's actionability rules treat an element under `aria-disabled="true"` as disabled, so the same assertion **passes**.
- Clickability waits (`wait_for_and_click`) likewise accept a disabled GButton. Tests work around this with `:not([aria-disabled])` selectors (`navigation.yml:1833,1880`, comments at `lib/galaxy_test/selenium/upload_activity_helpers.py:286,391`) or by asserting the attribute directly (`test_history_dataset_state.py:77`, `test_workflow_extraction.py:202`).

No test calls `assert_disabled` on a GButton today, but the helper is a trap for the most common button in the client.

## Evidence / repro

Call `component.assert_disabled()` on a disabled GButton, for example the history edit button for a queued dataset. It fails under Selenium and passes under Playwright.

## Suggested fix

Make `assert_disabled`, and possibly a new `assert_enabled`, backend-neutral: treat the element as disabled when `element.is_enabled()` is false **or** `aria-disabled == "true"`. Document the `:not([aria-disabled])` convention for "wait until enabled" selectors in the E2E writing guide.

## Related

- [[Component - E2E Tests - Writing]]
- [[Component - E2E Tests Smart Components]]
