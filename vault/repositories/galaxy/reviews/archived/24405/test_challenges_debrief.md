# Test challenges debrief: PR #24405

Reviewed commit e277999b9f0 (base release_26.2). Read-only review; tests not run (no .venv in worktree).

## Tests in the PR

`test_capture_propagates_failure_flushing_unrelated_pending_objects` (test/unit/workflows/test_modules.py)

- Not implementation-mirroring: uses MockTrans's real SQLite session, a real duplicate-PK History, and asserts observable behavior (IntegrityError reaches caller).
- Red-to-green: without the added `flush()`, `begin_nested()` flushes the duplicate, the broad `except Exception` swallows it and returns `(None, None, None)`, so `pytest.raises` fails at its own assertion. Good.
- Right layer: provoking an unrelated pending-object flush failure mid-scheduling is impractical via API/integration tests; unit is appropriate.
- Mocks: `_PersistableFakeTool` with `bunch.Bunch` tool_source is minimal and consistent with the existing `_CaptureFakeTool` fixture; a dataclass rewrite would not read better here.
- E2E: not warranted (scheduler-internal transaction behavior).

## Gaps / suggestions

1. The other half of the contract is untested: a failure *inside* the savepoint (ToolRequest persistence, e.g. `tool_source.to_string` raising) should return `(None, None, None)` and leave the outer session usable (a later flush/commit of other objects succeeds). The new `_PersistableFakeTool` makes this cheap. This guards the comment's claim that the savepoint isolates best-effort failures, and the reason the new flush must sit outside it.
2. No happy-path test that a ToolRequest is actually persisted with `history`, `tool_source`, and `request_state` set; also cheap with the new fixture. Lower value for a release-branch fix.
