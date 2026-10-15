# Numeric list-default CI regression — 2026-10-15

Verdict: implementation regression introduced during the release rebase; keep the existing test unchanged.

Evidence: [API job](https://github.com/galaxyproject/galaxy/actions/runs/38671680526/job/116216000829?pr=24140), head `6c9ef2e4ae2099a6c005af62ce17b6d9367782e4`. Downloaded artifact `11945823496` reports **886 passed, 1 failed, 2 skipped**. The sole failure is `TestWorkflowsApi::test_value_restriction_selects_multiple_numeric_text_list_default`: expected runtime value `["1", "2"]`, got `None`; both options have `selected: false`.

The YAML default `[1, 2]` contains integers, while `multi_select_numeric` exposes string option values. Release commit `299a59367472` (merged through #24108) explicitly converts list defaults to strings before matching. The rebase replaced that block with `_is_default_option`, which compares raw list entries, inadvertently losing the conversion. This is supported release behavior, not an obsolete expectation or an unrelated CI failure.

## Local correction and verification

Restored list-default string conversion inside `restrict_options` before its single-connection/intersection branches. The shared matcher remains intact, including empty-string support; static restriction behavior is unchanged. No tests or assertions were changed. [Reviewable patch](numeric_default_fix.patch).

- Before fix: the existing numeric-list test fails with the same `None` result; string-list and new static-default API tests pass (**1 failed, 2 passed**).
- After fix: all **8 value-restriction API tests pass**, including numeric defaults and the new static/labeled/empty defaults.
- Workflow unit suite: **194 passed, 1 skipped**.
- `git diff --check`: clean.

Tests used the existing `issue_21015_multiple_text_param/.venv` with this branch's `lib` on `PYTHONPATH`; API tests started their own server with conda auto-init disabled and beta workflow/tool formats enabled. Raw local reports are `/tmp/pr24140-red.log`, `/tmp/pr24140-green.log`, `/tmp/pr24140-units.log`.

The three-line code correction is **uncommitted and unpushed** in `/Users/jxc755/projects/worktrees/galaxy/branch/issue_23980_static_restriction_default`. This investigation did not publish a Galaxy commit or PR comment. PR remains draft at the failing SHA; queue is `author_work` until the correction is published and fresh CI is assessed. Other red workflows were not diagnosed in this task.
