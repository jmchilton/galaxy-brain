# Galaxy sync report

2026-11-09, agent dir `vault/agents/gx_branches`.

- Merged: #24555 (`issue_3899_pulsar_container_deps`) — entry removed, record moved to `merged/`, worktree removed (clean, pushed).
- Closed unmerged: none new (#23345 `optional_input_gating` still parked in final_review; #23817, #24450, #24578 in need_decision).
- Moved: none otherwise. Not re-diagnosed: reds on ready #24539 (5), #24786 (1), #24483 (1); attention #24211/#24228 undiagnosed reds.
- Fork CI (needs_ci): no entry has a settled green run on its current head; none promoted. `harden_url_abstractions_{25.1,26.0,26.1}` runs pending.
- Untracked open PRs: none.
- Mismatches: active records with no queue entry: custom_build_no_converter_400_26.0, issue_24199_workflow_numeric_bounds_26.0, job_parameters_input_access_25.1, mulled-hash, user_activation_register_masthead, vitest_stories, workflow_input_pipe_names_{nested,top_level,validation}.
- Worktrees: removed issue_3899_pulsar_container_deps.
- Stale task in TASKS.md: de-conflict for issue_3899_pulsar_container_deps (merged); John removes.
