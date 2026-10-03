# Explicit linter registration assertions — branch review

Reviewed the working-tree change in `explicit-linter-registration-assertions` against `origin-https/dev`.

No substantive issues found. The test has 156 distinct, alphabetically ordered membership assertions, matching all 156 names returned by `Linter.list_linters()` in this checkout. An independent AST extraction and runtime comparison found no missing or unexpected names.

The `Linter` exclusion remains. Each removed module-prefix check is covered by explicit assertions for that module's linters. Removal or renaming of any existing registration still fails the test with the affected name visible; new registrations intentionally no longer require updating a shared total. The former count also rejected additional or duplicate registrations, which individual membership assertions intentionally do not preserve under the requested change.

Only `test/unit/tool_util/test_tool_linters.py` changes; no production behavior changes.

## Polish update (2026-10-03)

Superseded the membership-only design during polish: the test now asserts `set(Linter.list_linters())` equals 157 sorted names, plus a `Counter`-based duplicate check, so unlisted, removed, renamed and duplicate linters all fail with the name shown. Squashed to one commit (`95b704f4448`); the "156" count above was stale after the rebase.
