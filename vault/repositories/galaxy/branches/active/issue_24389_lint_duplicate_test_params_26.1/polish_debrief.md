# Polish debrief

- Built 2026-10-26 from `issue_24389_duplicate_test_params_26.1` after bernt-matthias asked on #24450 that 26.1 only lint. Rebased the 5 commits onto `release_26.1` `4d652be1cd8`, added `88151f3a8d6` (flag `reject_conflicting_duplicates`: on for lint, off at load; off keeps first-at-top-level / last-in-repeat).
- Reordering so the dicts fix precedes the main fix conflicted; flag kept as its own last commit so the 26.2 branch reverts it.
- Tests: duplicates, linters, test-case suites pass; `test/unit/tool_util` reds only in CWL schema, watcher and network mulled tests (unrelated). mypy: only pre-existing `convert.py` redundant-cast. black clean.
- Checklist subagent: ship; all claims verified, lint/JSON tests fail on base, load tests pass on base by design. Applied: bold-italic sentence on why the `edit_attributes` fix belongs here. Optional left over: API test that `test_data` returns 200 for an `edit_attributes` tool.
- Fork CI not yet checked.

```
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/issue_24389_lint_duplicate_test_params_26.1/differential-review/snapshots/20261026T170033Z-polishing-88151f3a8d66.json
  polishing @ 88151f3a8d66 vs origin/release_26.1 (merge-base 4d652be1cd8b)
  first snapshot: 6 commits, 5 files, 16 hunks
```
