# upgrade_advice_structured_like — test challenges debrief

Challenged tests in `test/unit/tool_util/upgrade/test_upgrade_advice.py` against `writing_tests.md` and the challenge process.

## Verdict per test
- `test_26_0_unqualified_structured_like` — keep. Behavioral via `advise_on_upgrade` on real functional-test tools; covers nested hit, 24.2 target (no advice), top-level (no advice). Fails without branch (code absent).
- `test_26_0_unqualified_reference_in_section` — keep. Section path, not covered by fixtures.
- `test_26_0_qualified_reference` — keep. Negative case; guards against over-flagging.
- No mocks/SimpleNamespace to replace. No API/E2E layer applies (CLI/library advisor, no UI). Linter tests in `test_tool_linters.py` cover `InputReferences` via linter behavior — no direct tests of the moved helper needed.

## Added (coordinator scope)
- Partially qualified refs (`outer|input1` for input in outer>inner conditionals) resolve only through legacy alias. Dropped the `"|" in structured_like` short-circuit in `ProfileMigration26_0` (kept `qualified()` check).
- `test_26_0_partially_qualified_reference` — red before fix (no advice), green after; expects `'outer|inner|input1'`.

## Result
Commit on branch (not pushed). `pytest test/unit/tool_util/upgrade test/unit/tool_util/test_tool_linters.py`: 163 passed. ruff/black clean.
