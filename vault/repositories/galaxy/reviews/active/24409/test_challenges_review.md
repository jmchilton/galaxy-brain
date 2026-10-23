# Test challenges review - PR #24409

Profile: gx_test_challenger. Model: claude-opus-5-5. Effort: low. Reviewed commit: 234b345ca41.

Tests are well placed: two API tests through existing populators, red without the fix, no unit-test mocks, no E2E needed. Details in [test_challenges_debrief.md](test_challenges_debrief.md).

### P3 1: Conditional repeat test asserts only element count
`test_repeat_connection_with_conditional_without_fill_defaults` passes if two elements exist, regardless of which datasets landed. Assert element contents/order (`a`, `b`) via collection details so misconnection fails.

### P3 2: Default-filling of non-data repeat children not directly asserted
New `get_initial_value` loop is only exercised indirectly (invocation not failing). If a test tool with a repeat containing a non-data param that affects output exists, assert its default took effect.

### P3 3: Positional `hid=3` lookup
First test reads output by hid; using invocation step outputs would be less brittle. Nit.
