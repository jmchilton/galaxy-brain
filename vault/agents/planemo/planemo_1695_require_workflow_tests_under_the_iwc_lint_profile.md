# Planemo PR #1695 — Require workflow tests under the IWC lint profile

- PR: https://github.com/galaxyproject/planemo/pull/1695
- Reviewed: 2026-10-07
- Head: `db0a36fabf70229b7ad600ea36fe947257fa6b0a`
- Base: `b8547ffde67eb0c88998a818dfbdd075327c1ead`
- Recommendation: approve; no actionable correctness findings.

The change passes the existing `iwc_grade` profile flag into `WorkflowLintContext` and uses it only to select the severity of the existing missing-test diagnostic. A workflow without discovered cases remains a warning outside IWC and becomes an error under `--iwc`, including when `--fail_level error` is selected. Test discovery, structural validation, and skip handling continue through the existing abstractions. The constructor defaults the flag to false for direct context callers.

The added CLI regression test exercises the actual command and asserts both the exit code and the missing-test error text. It preserves the previous checks for default warning failure and ordinary `--fail_level error` success; no assertions were weakened. Existing IWC tests also cover workflows with discovered cases.

Validation:

- `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=. /Users/jxc755/projects/repositories/planemo/.venv/bin/python -m pytest -q -p no:cacheprovider tests/test_cmd_workflow_lint.py`: **22 passed**, with three dependency deprecation warnings. The initial sandbox run passed 18 and failed four on public Tool Shed DNS resolution; repeating with approved network access passed the complete suite.
- Additional CLI checks using temporary copies of native and gxformat2 fixtures with empty test arrays: each passes outside IWC at `--fail_level error`, fails under IWC at that threshold, and passes when the tests linter is explicitly skipped. All six assertions passed.
- `git diff --check` passed.

Worktree: reused `/Users/jxc755/projects/worktrees/planemo/branch/issue-1693-iwc-missing-tests-error` read-only because its clean HEAD exactly matches the PR. It remains clean; no PR worktree was created, and no branch changes, reviews, or comments were published.
