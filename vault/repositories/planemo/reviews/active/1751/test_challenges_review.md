# planemo#1751 test challenges review

- Profile: [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md)
- Model: Opus 5.5, effort: medium
- Reviewed commit: `3fcaae47`
- Debrief: [test_challenges_debrief.md](test_challenges_debrief.md)

Verdict: tests are reasonable for a small PR. The autoupdate test is a good behavioral red-to-green test. The shed_lint call site is untested, and the fallback/upstream parametrization is a no-op under the current pin.

### P2 1: shed_lint version comparison is untested

`lint_shed_version` (changed in two places) has no test, so the `+galaxy10` vs `+galaxy9` fix there is unverified. Add a test in `tests/test_planemo_linters.py` that writes a one-tool repo with version `1.0+galaxy10`, patches `planemo.shed_lint.tool_shed_instance` with a small fake shed class (not `mock.Mock`), and asserts via `LintContext`/`_messages`: TS `1.0+galaxy9` -> no `ShedVersion` (red on master), TS `1.0+galaxy10` -> exactly one `ShedVersion` error with its exact text. The exact-text assertion would also catch that the error now prints the normalized fallback form (`1.0+galaxy.10`) instead of the tool's declared version; formatting the message from the raw `tool_source.parse_version()` string fixes that.

### P3 1: parametrize over `parse_tool_version`/`_parse_tool_version` runs the same function twice

With `galaxy-tool-util>=25.1,<26.2` (resolves 26.1.1), upstream has no `parse_tool_version`, so both cases test the fallback; the upstream path runs nowhere. Replace with a fallback ordering test plus a parity test that skips unless upstream exposes `parse_tool_version` and compares orderings against `_parse_tool_version`. Drop the redundant `galaxy10 > galaxy9` assert (implied by the sort assertion).
