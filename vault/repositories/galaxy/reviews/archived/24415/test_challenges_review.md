# Test challenges review — PR #24415

Profile gx_test_challenger, claude-opus-5-5, low effort, reviewed commit 84910093a8c.

Tests sit at sensible layers (real-engine unit test for the string helper, API test for user-visible `misc_info`), use existing populators, no mocks. No drops. No E2E needed. Details: test_challenges_debrief.md.

### P3 1: Unit test's "no script positions" check may pass vacuously

`assert "<input>" not in message` proves nothing unless the raw error contains `<input>`. Add `assert "<input>" in str(exc.value)` before it.

### P3 2: API test doesn't pin message shape

`": TypeError" in misc_info` also passes if the full stack trace leaks into `misc_info`. Add a negative assertion (e.g. no `"<input>"` / no `"\n  at "`) so the API test covers the trimming that is the point of the change.

### P3 3: `ExpressionTemplateError` passthrough branch untested

New `except ExpressionTemplateError: ... raise` in `global_tool_logs` has no test in the diff showing the message reaches the user unwrapped. If no existing test covers it, add a small API case (or fold into the existing one) asserting the original message survives.
