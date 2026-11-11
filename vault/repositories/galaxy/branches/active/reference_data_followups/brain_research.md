Run via Claude Sonnet at high effort.

```yaml
documents:
  - path: vault/repositories/galaxy/reviews/active/24798/verified_review.md
    why: The verified findings (P2 1-3, P3 1, 3, 4) this branch ports, with the review-branch design (parse_reference_data(), reference_data_runtime_json(), ToolDataTable.readable_by()).
  - path: vault/repositories/galaxy/reviews/active/24798/round_0_rev_0_branch_details.md
    why: Commit-by-commit list of the review branch (pr_24798_round_0_rev_0) to cherry-pick or crib from; the worktree already carries the first three (harness, closed-table tests, admin API test) and the XML-guard/authoring-model commits are mid-conflict in factory.py and basic.py.
  - path: vault/repositories/galaxy/reviews/active/24798/context_issue_23888.md
    why: The #23888 parser-vs-authoring-model dialect problem; frames the "load reference_data through its authoring model" slice and the dump-policy matrix (full / exclude_unset / exclude_none).
  - path: vault/research/Component - YAML Tool Parser and Authoring Model Boundary.md
    why: Every site where a dict becomes a parser, which model/dump policy gates it, canonical vs legacy InputSource dialect (CanonicalYamlInputSource vs YamlInputSource).
    load_when: Implementing parse_reference_data() or the parity test across GalaxyTool / GalaxyUserTool and dump policies.
  - path: vault/repositories/galaxy/branches/merged/yaml_boolean_defaults/test_challenges_debrief.md
    why: How the user tool contract harness (test_user_tool_contract.py, loaded_tool fixture, 3 load paths x 3 input formats) was built and red/green checked.
    load_when: Adding the *_user.json twins and contract tests.
  - path: vault/repositories/galaxy/branches/merged/yaml_boolean_defaults/implementation_debrief.md
    why: Canonical-dialect decisions on the same parser and test infrastructure (helpers, DescribeUserTool, fixtures).
  - path: vault/repositories/galaxy/reviews/active/24798/test_challenges_debrief.md
    why: Test-challenge findings behind the closed-table and admin-path test gaps.
    load_when: Strengthening closed-table tests or the admin GalaxyTool API test.
  - path: vault/repositories/galaxy/reviews/active/24798/learning_galaxy.md
    why: Architecture walk-through of reference_data across authoring, loader, factory, runtimeify and the legacy to_cwl path; names the two runtime resolution paths that can drift.
    load_when: Merging the runtime list/single dumping or tracing job-time access checks.
  - path: vault/research/Component - YAML Tool Runtime.md
    why: runtimeify vs the legacy to_cwl path and setup_for_runtimeify; context for sharing list/single dumping between convert.py and evaluation.py (note predates reference_data).
    load_when: Touching runtimeify or UserToolEvaluator.
  - path: vault/research/Component - Tool Data Tables.md
    why: ToolDataTable loading and same-name merging (merge is where user_accessible is OR-ed); note doesn't mention user_accessible or reference_data.
    load_when: Adding ToolDataTable.readable_by() or reasoning about merged tables.
  - path: vault/research/Component - User-Defined Tools.md
    why: GalaxyTool (admin, trusted) vs GalaxyUserTool trust split behind the table access rule and the admin API test.
    load_when: Writing the admin GalaxyTool test or reviewing trust-source consistency.
  - path: vault/repositories/galaxy/issues/wip/23888/proposed_converge_yaml_disk_and_database_representation.md
    why: Umbrella pitch; the model-backed InputSource adapter (slice 2) that reference_data becomes the first instance of.
    load_when: Deciding how far to generalize parse_reference_data() (out of scope: other types, filter in ReferenceDataConfig).
  - path: vault/research/Component - API Tests Tools.md
    why: API test patterns for tool build/execute used by the new closed-table and admin API tests.
    load_when: Writing the API tests.
  - path: vault/repositories/galaxy/branches/active/tool_parameter_references/reverification_2026-11.md
    why: Another recent branch touching the same user_tool_contract harness and parser; check for overlapping edits or conflicts.
    load_when: Rebasing or hitting merge conflicts in test_user_tool_contract.py.
research_requests:
  - vault/agents/gx_research/todo/reference_data_parameter.md
  - vault/agents/gx_research/todo/user_tool_contract_tests.md
```

Gaps: no note covers reference_data or `user_accessible` (queued above); no note describes the contract harness (queued). Stale-ish: `Component - YAML Tool Runtime` and `Component - Tool Data Tables` predate #24798.
