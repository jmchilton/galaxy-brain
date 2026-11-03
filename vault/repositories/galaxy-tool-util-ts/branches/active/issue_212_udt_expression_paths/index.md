---
upstream_base_branch: main
---

# validate-tool-source: check `inputs.*` member paths in UDT expressions (#212)

- [Open PR](https://github.com/jmchilton/galaxy-tool-util-ts/compare/main...issue_212_udt_expression_paths)
- [View on GitHub](https://github.com/jmchilton/galaxy-tool-util-ts/tree/issue_212_udt_expression_paths)

## Status

Polished; ready for John's final review. Pushed to `origin` at `c06dc876` on `origin/main` `f5470fe5`.

No PR yet.

Local gate: lint, format, typecheck, tests green except 3 integration-tests that fail identically on `origin/main`; Makefile checksum targets fail under Node 26 (pre-existing), checksums verified with `sha256sum`. CI runs on PRs only.

## Links

[PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [implementation debrief](implementation_debrief.md) · [polish debrief](polish_debrief.md) · [normal review](subagents/normal_review.md) · [Codex review](codex_review.md) · [thermo review](thermo_nuclear_review.md) · [demo](demo/demo_output.txt) · [sweep hits](sweep/hits.txt)

## Notes

- Defaults pending John: label findings are errors; YAML sections stay unchecked until the TS parser ports Galaxy's `CanonicalYamlInputSource`. Open questions in the [polish debrief](polish_debrief.md).

- Issue: [galaxy-tool-util-ts#212](https://github.com/jmchilton/galaxy-tool-util-ts/issues/212), record [issues/wip/212](../../../issues/wip/212/index.md).
- Worktree: `~/projects/worktrees/galaxy-tool-util-ts/branch/issue_212_udt_expression_paths`.
- Runtime field lists synced from Galaxy `origin/dev` `e922a682` (2026-11-03) via `make sync-job-runtime-schema`.
