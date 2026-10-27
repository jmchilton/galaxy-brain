# Codex review (re-harden, 2026-10-27)

Reviewed after rebasing onto `origin/dev` (HEAD `3f3287c9244`). Codex returned three findings:

- **Fixed (#1):** a confirmed load crash. The fix is `10c48845270`.
- **Left for John (#2, #3):** neither is a regression from dev. Both are policy calls.

## Not acted on
- **#2 Shadowed legacy alias on a discovered collection:** `resolve()` keeps the unqualified key when the qualified target is another input's legacy alias. Discovered collections have no legacy fallback, so the format still falls back. Dev behaves the same way, and the linter already errors on this case.
  - **Open question:** should profile 26.2+ make it a load error as well? If yes, that's a scope expansion.
- **#3 Mixed-type conditional cases:** `c|same` can be `data` in one case and `text` in another. `output_reference_problem` passes because it uses `any()`.
  - Switching to `all()` would make pre-26.2 tools drop a reference that works in their dataset case. That's a regression, so I kept `any()`.
  - **Open question:** should 26.2+ require `all()`? That's John's call.

<details><summary>Full findings</summary>

1. **P1, certain — CONFIRMED and fixed.** A `value_from` conditional (as in `upload.xml`) has no child `<param>`. `InputReferences._visit` called `parse_test_input_source()`, which asserts the child exists. Any tool with a `format_source` or `metadata_source` output plus such a conditional raised an `AssertionError` at load.
   - **Fix:** skip the test param when `value_from` is set.
   - **Test:** `test_value_from_conditional_without_test_param`, red before the fix and green after.
2. **P1, certain — NEEDS-DECISION.** The shadowed legacy reference is not usable for discovered collections (`output_references.py:165`). Discovered elements get the fallback format, and `metadata_source` raises a `KeyError`. Dev behaves the same, and the linter flags it.
3. **P2, likely — NEEDS-DECISION.** `any()` across matches accepts mixed-type conditional cases (`output_references.py:72`). See above.

Codex's coverage notes were empty. It reviewed every changed file plus the parser, actions, discover and wrapped modules.
</details>
