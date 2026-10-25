# Unknown upstream type leaves map-over unknown (#204)

- [PR #205](https://github.com/jmchilton/galaxy-tool-util-ts/pull/205)
- [View on GitHub](https://github.com/jmchilton/galaxy-tool-util-ts/tree/issue_204_unknown_map_over)

## Status

Pushed to `origin` at `9ea1e0d5` (base `origin/main` `539c16c9`); PR open. Rules DSL port (`a4c85310`, `187ee082`) added 2026-10-25 on John's request; PR body on GitHub not yet updated to the new [pr_description.md](pr_description.md).

PR [#205](https://github.com/jmchilton/galaxy-tool-util-ts/pull/205) opened 2026-10-25 on John's request.

Local gate (`make check`, `make test`) green; CI runs on PRs only.

## Links

[PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [implementation debrief](implementation_debrief.md) · [polish debrief](polish_debrief.md) · [normal review](subagents/normal_review.md) · [Codex review](codex_review.md) · [thermo review](thermo_nuclear_review.md)

## Notes

- Issue: [galaxy-tool-util-ts#204](https://github.com/jmchilton/galaxy-tool-util-ts/issues/204), record [issues/wip/204](../../../issues/wip/204/index.md).
- Worktree: `~/projects/worktrees/galaxy-tool-util-ts/branch/issue_204_unknown_map_over`.
- workflow_libs `AGENTS.md` has no project settings block; conventions inferred from earlier branch records: push to `origin`, gate `make check` + `make test`.
- Open decision: narrow trigger to unknown-source skips only? See polish debrief.
- Open decision: untyped source into collection input — editor treats as unmapped (outputs datasets); branch marks unknown.
- Rules DSL: `RuleSet` in `workflow-graph`, `rules_dsl_spec.yml` synced (`make sync-rules-dsl-spec`). Issue #204 repro's mapping builds `list:list`, now a real `invalid` vs fastp `paired`; `list:paired` variant: 3 ok. Draft correction comment: [issue_comment_repro.md](issue_comment_repro.md). Client-compatible `applyRules` + `pyre-to-regexp` dep added (`9ea1e0d5`) so Galaxy's rule builder can import it; Galaxy adoption not planned in a doc yet (see `vault/projects/workflow_state/TS_CONNECTION_REFACTOR_IN_GX_PLAN.md`). Rules port not separately reviewed.
- Python parity: committed to Galaxy `wf_tool_state` as `8bf22007fcd` (pushed to `jmchilton`); 4 tests in `test_connection_validation.py::TestUnknownMapOver`.
