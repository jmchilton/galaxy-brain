Runs 12 of the 13 tests in `test_workflow_management.py` under the Playwright
backend.

Twelve of the file's thirteen `selenium_only` decorators carried the blanket reason
"Not yet migrated to support Playwright backend". All twelve tests pass unmodified —
no production or framework code changes.

`test_view` keeps its decorator, with the blanket reason replaced by the actual
cause. It asserts that an external workflow link opens in a second tab:

```python
self.driver.switch_to.window(self.driver.window_handles[1])
```

`NavigatesGalaxy.driver` deliberately raises `NotImplementedError` under Playwright,
and there is no backend-neutral window/tab vocabulary yet. Playwright models tabs as
`page.context.pages`, which is a different model from Selenium's window handles, so
this belongs with the gesture/vocabulary work rather than a decorator sweep.

Verification: 12 passed, 1 skipped under Playwright. No Selenium run was needed —
this branch changes no shared code, and `selenium_only` only skips under Playwright.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
