---
upstream_base_branch: main
pr: 226
---

# draft-validate --concrete: top-level `concrete_errors` and step labels (#216)

- [PR #226](https://github.com/jmchilton/galaxy-tool-util-ts/pull/226)
- [View on GitHub](https://github.com/jmchilton/galaxy-tool-util-ts/tree/issue_216_concrete_errors)

## Status

Polished; awaiting John's final review. Pushed to `origin` at `bf3a5b6b` on `origin/main` `f5470fe5`; merges cleanly with `origin/main` `68451c8e`.

Draft PR [#226](https://github.com/jmchilton/galaxy-tool-util-ts/pull/226) opened 2026-11-10, titled "Explain `draft-validate --concrete --json` failures from the top of the report", labelled `bug`.

CI pending on `bf3a5b6b`.

## Links

[PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [implementation debrief](implementation_debrief.md) · [polish debrief](polish_debrief.md) · [normal review](subagents/normal_review.md) · [Codex review](codex_review.md) · [thermo review](thermo_nuclear_review.md) · [demo](demo/demo_output.txt)

## Decisions

- 2026-11-10: John asked for a draft PR, kept in draft until John reviews it. Don't undraft it.
- 2026-11-09: keep `failures` / `all_failures` in tree validation reports; templates need them for the per-row failure count. See the [polish debrief](polish_debrief.md).
- 2026-11-09: a `gxwf validate --connections --json` rollup is a follow-up, [#220](https://github.com/jmchilton/galaxy-tool-util-ts/issues/220); related bugs filed as [#218](https://github.com/jmchilton/galaxy-tool-util-ts/issues/218) and [#219](https://github.com/jmchilton/galaxy-tool-util-ts/issues/219).

## Notes

- Issue: [galaxy-tool-util-ts#216](https://github.com/jmchilton/galaxy-tool-util-ts/issues/216), record [issues/wip/216](../../../issues/wip/216/index.md).
- Worktree: `~/projects/worktrees/galaxy-tool-util-ts/branch/issue_216_concrete_errors`.
- The Codex review was a limited pass and predates the last commits; no review has seen `bf3a5b6b`; open questions are in the [polish debrief](polish_debrief.md).
