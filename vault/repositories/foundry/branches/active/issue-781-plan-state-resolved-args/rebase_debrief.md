# Rebase onto main 161947ef (2026-11-12)

Old head `7d001a3d` (base `df991d0d`) → new head `197e5afd`, onto `origin/main` `161947ef` (13 commits, mostly #790, PavelAbramau's #666 summarizer extraction fixes).

## Conflicts

- `9727baa6` "Skip line comments when extracting workflow blocks", in `packages/summarize-nextflow/src/resolver.ts` `extractBlockAt`: main's `d899b7b2` already skips `//` and `/* */` comments there. I kept main's code. The commit now only adds its call-tracing test (apostrophe in a `//` comment), retitled "Test call tracing through a workflow with an apostrophe comment".
- `4c76da2e`, `content/molds/summarize-nextflow/changes.md` rev 21: a cascade from that resolution. I took the branch text, then dropped the rev 21 sentence crediting the branch with the comment-parsing fix in a new commit `197e5afd`, because #790 owns that fix. **Judgment call.** `pr_description.md` and the PR body got matching edits (evidence paragraph, Files list).
- `resolver.test.ts` auto-merged, with main's 287 new test lines next to the branch's.

## Gate at `8aa36684` (code identical to `197e5afd`, which only changes `changes.md`)

- `npm run packages-build`, `make casts`: no cast drift.
- `make -k check`: 501 tests pass. Red only on `validate-roadmap` (the same 6 drift errors on #803/#805/#783 that `origin/main` gives, checked in a temp worktree) and `check-vendored` (machine-only).
- `typecheck`, `packages-typecheck`, `format`, `lint`, `check:kinds`, `lint:packages`, `smoke:packages`: clean.
- `packages-test`: 146/147. The one failure is `cli.test.ts` "emits nf-schema Param metadata on the flagship pipeline" timing out at its 5 s limit (5.4 s). With `--testTimeout=60000` every rnaseq test takes about 4 s on the branch, and main takes 4–7.3 s on the same tests, so this is a timing flake on this machine, not a regression. pnpm stopped after summarize-nextflow. The remaining packages are covered by #818's complete run (all packages pass), whose package code matches this branch apart from gxwf-foundry's additions.
- The PR description's stats table re-checked at the new head: rnaseq gives 130 `resolved_args`, 175 rows and 10 ties, sarek gives 263 / 354 / 2. Unchanged.
