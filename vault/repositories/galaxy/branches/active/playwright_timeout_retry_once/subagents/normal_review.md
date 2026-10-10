# Normal review (2026-10-10)

No blockers and no security issues. **Acted on**, amended into `7682a9a4e09`:
- The test imports the `PlaywrightTimeoutException` alias from `has_playwright_driver`, replacing an `importorskip` of the private module that could never fire.
- Both tests use `pytest.raises`.
- The expected 12 calls is written as `10 + 2`, with a comment.
- In the debrief: 11 → 12 action timeouts. The callers line now says "every caller of `retry_call_during_transitions`", which is more than the 24 decorators. A note says `wait_for_*` timeouts are covered too.

**Not acted on**, all pre-existing:
- **The `previous_attempts > attempts` off-by-one.** Changing it would change timing for every caller, beyond this PR.
- **`_exception_indicates_playwright_timeout`'s in-function import of `playwright._impl._errors`.** The import is needed because Playwright is optional at runtime. `playwright.sync_api.TimeoutError` is the same class, so the cleanup belongs in a separate PR.
- **Selenium `TimeoutException` is still not retried.** The backends differ deliberately.

## Details

The review confirmed that the counter logic is correct, including mixed stale/timeout sequences. Every retry helper goes through `retry_call_during_transitions`: `retry_index_during_transitions` (`navigates_galaxy.py:221`), `retry_assertion_during_transitions` (`framework.py:361-365`), `test_tool_form.py:218` and `open_toolbox` (`navigates_galaxy.py:1991`). Nested decorated calls multiply retries but stay bounded.

`has_playwright_driver.py:591-642` re-raises Galaxy's `wait_for_*` timeouts as Playwright `TimeoutError`, so the cap covers them too. The PR description should say so.

Test run by the reviewer: `test_retry_during_transitions.py`, 2 passed.

Note: this review predates the process doc and was not given `REVIEW_FOCUS.md`. The codex review that follows covers that ground.
