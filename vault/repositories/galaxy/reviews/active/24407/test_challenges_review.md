# Test challenges review — PR #24407

Profile: gx_test_challenger. Model: claude-opus-5-5. Effort: low. Reviewed commit: `2273ae0bca5`.

Verdict: tests are at the right layer (single API workflow test, real tool, no mocks). Only minor strengthening suggested. Debrief: [test_challenges_debrief.md](test_challenges_debrief.md).

### P3 1: New tool's `<tests>` skip the failing path
`collection_creates_dynamic_list_failbool.xml` tests only `failbool=false`. Add `<test expect_exit_code="1" expect_failure="true"><param name="failbool" value="true" /></test>`, mirroring `collection_creates_dynamic_nested_fail.xml`.

### P3 2: Strengthen API test assertions
`invocation["messages"][0]["reason"]` is positional; assert message count (or find by reason) so extra messages surface. Also assert `steps[1]` (`per_element`) ran no jobs, not just the reducer.

### P3 3: Trim test comment
Three-line comment restates the test name; one line suffices.
