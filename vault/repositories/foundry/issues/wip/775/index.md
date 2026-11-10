---
related_records: foundry/branches/issue-775-verification-workflow-lint
---
# foundry#775: Verification CI lints with `planemo lint` instead of `workflow_lint`

[Issue](https://github.com/galaxyproject/foundry/issues/775) · branch [`issue-775-verification-workflow-lint`](../../../branches/active/issue-775-verification-workflow-lint/index.md)

Opened 2026-11-10, a follow-up from #765/#766. Work happens on branch `issue-775-verification-workflow-lint`, which needs no PR decision yet. It fixes the pins, renames `name:` to `label:`, and switches the CI step to `workflow_lint --skip best_practices`.
