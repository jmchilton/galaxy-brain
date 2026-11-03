---
upstream_base_branch: dev
related_records:
  - galaxy/branches/subworkflow_mapping
---
# workflow_test_timeouts

- [View on GitHub](https://github.com/jmchilton/galaxy/tree/workflow_test_timeouts)

## Status

Status: `abandoned`. Single commit `a5226c06c15` "Allow slow workflow tests to set a timeout" on `dev` `238bf001549`; pushed, never a PR. Added a `timeout` field to the `TestJob` schema in `tool_util_models`.

## Abandoned — 2026-11-02

John abandoned it: no `timeout` field in the workflow test schema. Instead, the framework runner keeps a `SLOW_WORKFLOW_TIMEOUTS` map (workflow test name → seconds; unknown names fail at collection), done in #23676 as `amend!` fixup `4d38ff04a81` of `485c68ba354`. No worktree.

- Standing branch: [subworkflow_mapping](../../../../../agents/gx_standing/standing_branches/subworkflow_mapping/index.md).
