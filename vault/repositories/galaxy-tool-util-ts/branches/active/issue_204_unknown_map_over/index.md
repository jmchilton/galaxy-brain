# Unknown upstream type leaves map-over unknown (#204)

- [PR #205](https://github.com/jmchilton/galaxy-tool-util-ts/pull/205)
- [View on GitHub](https://github.com/jmchilton/galaxy-tool-util-ts/tree/issue_204_unknown_map_over)

## Status

Polished and pushed to `origin` at `e57c9157` (base `origin/main` `539c16c9`); PR open.

PR [#205](https://github.com/jmchilton/galaxy-tool-util-ts/pull/205) opened 2026-10-25 on John's request.

Local gate (`make check`, `make test`) green; CI runs on PRs only.

## Links

[PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [implementation debrief](implementation_debrief.md) · [polish debrief](polish_debrief.md) · [normal review](subagents/normal_review.md) · [Codex review](codex_review.md) · [thermo review](thermo_nuclear_review.md)

## Notes

- Issue: [galaxy-tool-util-ts#204](https://github.com/jmchilton/galaxy-tool-util-ts/issues/204), record [issues/wip/204](../../../issues/wip/204/index.md).
- Worktree: `~/projects/worktrees/galaxy-tool-util-ts/branch/issue_204_unknown_map_over`.
- workflow_libs `AGENTS.md` has no project settings block; conventions inferred from earlier branch records: push to `origin`, gate `make check` + `make test`.
- Open decision: narrow trigger to unknown-source skips only? See polish debrief.
- Python parity: committed to Galaxy `wf_tool_state` as `8bf22007fcd` (pushed to `jmchilton`); 4 tests in `test_connection_validation.py::TestUnknownMapOver`.
