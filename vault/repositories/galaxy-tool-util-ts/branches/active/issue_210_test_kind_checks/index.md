---
upstream_base_branch: main
parent_branch: issue_210_datatypes_snapshot
---

# validate-tests: collection shape and datatype checks (#210 Phase B)

- [Open PR](https://github.com/jmchilton/galaxy-tool-util-ts/compare/issue_210_datatypes_snapshot...issue_210_test_kind_checks)
- [View on GitHub](https://github.com/jmchilton/galaxy-tool-util-ts/tree/issue_210_test_kind_checks)

## Status

Polished; ready for John's final review. Pushed to `origin` at `1cb4b41a` on parent `issue_210_datatypes_snapshot` `dd7a4397`.

No PR yet.

Local gate (`make check`, `make test`) green; CI runs on PRs only.

## Links

[PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [verification](verification.md) · [implementation debrief](implementation_debrief.md) · [polish debrief](polish_debrief.md) · [normal review](subagents/normal_review.md) · [Codex review](codex_review.md) · [thermo review](thermo_nuclear_review.md)

## Notes

- Issue: [galaxy-tool-util-ts#210](https://github.com/jmchilton/galaxy-tool-util-ts/issues/210), record [issues/wip/210](../../../issues/wip/210/index.md), [plan](../../../issues/wip/210/plan.md).
- Worktree: `~/projects/worktrees/galaxy-tool-util-ts/branch/issue_210_test_kind_checks`.
- Covers issue asks 1 + 2; opener is "Toward" so the PR doesn't auto-close #210 (ask 3, output `ftype`, deferred).
- Defaults pending John: `filetype` ∉ `format` and map-over are warnings; `workflow_output_collection_type` is an error though planemo ignores it; output checks skipped when job collections differ from declared; `--cache-dir` read-only.
