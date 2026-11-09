---
upstream_base_branch: main
---

# draft-validate --concrete: top-level `concrete_errors` and step labels (#216)

- [Open PR](https://github.com/jmchilton/galaxy-tool-util-ts/compare/main...issue_216_concrete_errors)
- [View on GitHub](https://github.com/jmchilton/galaxy-tool-util-ts/tree/issue_216_concrete_errors)

## Status

Polished; ready for John's final review. Pushed to `origin` at `bf3a5b6b` on `origin/main` `f5470fe5`.

No PR yet.

Local gate: lint, format, typecheck, `lint:unused:ci` and build green; tests green except 3 integration-tests that fail identically on `origin/main`; CI runs on PRs only.

## Links

[PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [implementation debrief](implementation_debrief.md) · [polish debrief](polish_debrief.md) · [normal review](subagents/normal_review.md) · [Codex review](codex_review.md) · [thermo review](thermo_nuclear_review.md) · [demo](demo/demo_output.txt)

## Decisions

- 2026-11-09: keep `failures` / `all_failures` in tree validation reports; templates need them for the per-row failure count. See the [polish debrief](polish_debrief.md).
- 2026-11-09: a `gxwf validate --connections --json` rollup is a follow-up, [#220](https://github.com/jmchilton/galaxy-tool-util-ts/issues/220); related bugs filed as [#218](https://github.com/jmchilton/galaxy-tool-util-ts/issues/218) and [#219](https://github.com/jmchilton/galaxy-tool-util-ts/issues/219).

## Notes

- Issue: [galaxy-tool-util-ts#216](https://github.com/jmchilton/galaxy-tool-util-ts/issues/216), record [issues/wip/216](../../../issues/wip/216/index.md).
- Worktree: `~/projects/worktrees/galaxy-tool-util-ts/branch/issue_216_concrete_errors`.
- The Codex review was a limited pass and predates the last commits; no review has seen `bf3a5b6b`; open questions are in the [polish debrief](polish_debrief.md).
