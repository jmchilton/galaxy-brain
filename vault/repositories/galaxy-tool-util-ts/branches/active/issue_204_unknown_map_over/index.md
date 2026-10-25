# Unknown upstream type leaves map-over unknown (#204)

- [Open PR](https://github.com/jmchilton/galaxy-tool-util-ts/compare/main...issue_204_unknown_map_over?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy-tool-util-ts/tree/issue_204_unknown_map_over)

## Status

Polished and pushed to `origin` at `e57c9157` (base `origin/main` `539c16c9`); ready for John's final review.

No PR yet.

Local gate (`make check`, `make test`) green; CI runs on PRs only.

## Links

[PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [implementation debrief](implementation_debrief.md) · [polish debrief](polish_debrief.md) · [normal review](subagents/normal_review.md) · [Codex review](codex_review.md) · [thermo review](thermo_nuclear_review.md)

## Notes

- Issue: [galaxy-tool-util-ts#204](https://github.com/jmchilton/galaxy-tool-util-ts/issues/204), record [issues/wip/204](../../../issues/wip/204/index.md).
- Worktree: `~/projects/worktrees/galaxy-tool-util-ts/branch/issue_204_unknown_map_over`.
- workflow_libs `AGENTS.md` has no project settings block; conventions inferred from earlier branch records: push to `origin`, gate `make check` + `make test`.
- Open decision: narrow trigger to unknown-source skips only? See polish debrief.
- Python twin (`connection_validation.py`) exists only on Galaxy's unmerged `wf_tool_state` branch and will diverge; parity follow-up there.
