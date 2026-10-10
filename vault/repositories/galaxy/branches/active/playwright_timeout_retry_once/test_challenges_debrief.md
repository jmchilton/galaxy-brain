# playwright_timeout_retry_once — test challenges debrief

No change. Branch stays at `7682a9a4e09`.

## Unit tests (`test/unit/selenium/test_retry_during_transitions.py`, 2 cases)

- **`test_a_playwright_timeout_is_retried_once`**: kept. It pins the behaviour change: it fails without the fix (12 calls, not 2). It tests a pure function's call count, not internals. It also fails if Playwright timeouts stop being retried at all (1 call), so it covers the surviving retry from `2825bb09e42` too.
- **`test_stale_elements_retry_every_attempt`**: kept. It passes before and after the fix, but it is the contrast case: a fix that capped every transition error would still pass the Playwright test and fail this one. It pins the pre-existing `previous_attempts > attempts` off-by-one (`10 + 2`). The comment documents that, and anyone who fixes the off-by-one should update the number.
- No mocks or `SimpleNamespace`. `_always` is a 6-line closure that records calls. A dataclass or a reusable stub would not read better. Parametrizing the two cases would save a few lines but lose the per-case comments, so they stay separate.
- I did not add a mixed stale/timeout sequence case. The review checked the counter logic by reading it, and John prefers small tests for test-infra changes.
- No overlap with API, integration or Selenium tests: nothing else exercises `retry_call_during_transitions` directly.

## E2E

None warranted. The change is timing behaviour inside the test harness. An E2E test can only show "a stuck action fails in 2 action timeouts rather than 12" by stalling for minutes, and it would depend on the timeout configuration. The unit test pins the same contract in under a second.

## Runs

- `test_retry_during_transitions.py`: 2 passed.
- Red check (`git show HEAD~1:lib/galaxy/selenium/navigates_galaxy.py`): 1 failed (the Playwright case), 1 passed. Restored after.
- ruff, black (`-l 120`) and isort are clean on both files.
