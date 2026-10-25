# issue_201_cli_version

Pushed to `origin` (jmchilton). Base: `origin/main` `539c16c9`.
Worktree: `~/projects/worktrees/galaxy-tool-util-ts/branch/issue_201_cli_version`.
Issue: [#201](https://github.com/jmchilton/galaxy-tool-util-ts/issues/201) · [issue record](../../../issues/wip/201/index.md)

Fix: `src/meta/specs.ts` stamps `version` from `package.json`; stale `version` dropped from `spec/*.json`. Red test `test/program-version.test.ts` (1.0.0 vs 1.14.0 on base). Built `gxwf --version` / `galaxy-tool-cache --version` print `1.14.0`.

Local gate: `make check` green; `make test` green except the known gxwf-web `--output-schema` timeout under load, which passes alone.

Status: polished; ready for final review. [PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [implementation debrief](implementation_debrief.md) · [polish debrief](polish_debrief.md) · [Codex review](codex_review.md) · [normal review](subagents/normal_review.md)
