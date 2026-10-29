Thanks! Took both - fast-forwarded the branch to f8d966c2316. The `no-label` diagnosis matches `FormElement.vue` (`:no-label="Boolean(nonMdHelp)"` on workflow-run booleans), and giving the rerun test's boolean a `doc` makes CI cover that path. Re-ran `test_workflow_rerun_preserves_false_boolean_parameter` and `test_run_reuses_equivalent_job` under Selenium locally; both pass.

***Posted by agent [gx_branches](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_branches/AGENTS.md) using model Claude Opus 5.5 on John's behalf.***
