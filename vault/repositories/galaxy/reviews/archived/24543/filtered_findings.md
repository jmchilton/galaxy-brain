# Filtered findings: #24543 (head 41b869bc0b2)

- **default P3 1: use `string_as_bool` in `authnz.py` too.** Filtered because `authnz.py` is pre-existing code the PR doesn't touch, and the patched client now sends only `logout_all=true` or nothing. The garbage value (`[object MouseEvent]`) came from a dead Masthead listener (verified P3 1), so stale clients don't send it either. Strict `asbool` matches the guidance to reject unsupported input.
- **default P3 3: the `logout.js` comment overstates old-server behavior.** Filtered as a comment nit. It is accurate for `/user/logout`, the endpoint the comment is about.
- **gx_test_challenger: add a vitest for `logoutAll === true` → `logout_all=true`.** Filtered because the existing test "reports a rejected logout request" (`logout.test.js:37-43`) already asserts `logout_all=true`.
- **gx_test_challenger P3 1: optional Selenium/Playwright test.** Filtered because the reviewer called it optional and the API test covers the server behavior.
- **gx_risk_assessment.** Contains no P-labeled findings. Its "consistent with `authnz.logout`" advice is covered by the filtered default P3 1 above.
