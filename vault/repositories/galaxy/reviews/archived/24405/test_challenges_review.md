# Test challenges review: PR #24405

Profile: gx_test_challenger. Model: claude-opus-5-5, low effort. Reviewed commit: e277999b9f0.

The added unit test is well-targeted: real SQLite session, real duplicate-PK flush failure, fails without the fix at its own assertion. No drops or rewrites recommended. Details in [test_challenges_debrief.md](test_challenges_debrief.md).

### P3 1: Cover savepoint isolation of ToolRequest persistence failures

The fix relies on a split: unrelated pending state fails loudly (now tested), while failures inside `begin_nested()` stay best-effort and leave the session usable (untested). Add a sibling test using `_PersistableFakeTool` whose `tool_source.to_string` raises: assert `(None, None, None)` is returned and a subsequent `trans.sa_session.add(model.History(...)); commit()` succeeds. This pins why the new `flush()` must stay outside the savepoint.

### P3 2: Optional happy-path persistence test

No test asserts a ToolRequest is minted with `history`, `tool_source`, and `request_state`. Cheap with the new fixture; optional for a release-branch fix.
