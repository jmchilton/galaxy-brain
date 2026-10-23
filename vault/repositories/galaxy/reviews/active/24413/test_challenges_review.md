# Test challenges review — PR #24413

Profile: gx_test_challenger. Model: claude-opus-5-5. Effort: low. Reviewed commit: 4f2e4126a6b.

Verdict: test is at the right layer (API), uses existing populator helpers, and is red-to-green for the 500. Only a minor strengthening suggested. See [test_challenges_debrief.md](test_challenges_debrief.md).

### P3 1: Strengthen post-update assertion to check subworkflow content

`test_update_with_unchanged_export_of_workflow_with_subworkflow` only asserts one subworkflow step exists after the PUT. That passes even if the embedded subworkflow were rebuilt empty or altered. Assert the inner `cat1` tool step is still present in the re-exported subworkflow (e.g. `subworkflow_steps[0]["subworkflow"]["steps"]` contains a step with `tool_id == "cat1"`), so the test also guards the round trip, not just the absence of a 500.
