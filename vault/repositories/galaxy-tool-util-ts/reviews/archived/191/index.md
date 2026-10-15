# galaxy-tool-util-ts #191 — Fix gxwf default URL resolver for GA4GH TRS subworkflow links

- [PR](https://github.com/jmchilton/galaxy-tool-util-ts/pull/191) (mvdbeek)
- [Independent review](review.md) — reviewed `9b15a74c`
- Python PR: [gxformat2#263](https://github.com/galaxyproject/gxformat2/pull/263) — [notes](../../../../gxformat2/reviews/archived/263/index.md)

## Current status — 2026-10-14

John asked for a parallel TS PR; Marius had already opened this one, so John chose review/fix #191 instead. Verdict: approve; no blockers.

Pushed fix-up `1c42b7c4` to Marius's branch:
- Resolver errors name original ref + descriptor URL; non-JSON 200 throws clear error (was bare `SyntaxError`); missing-content message matches gxformat2. Tests red first.
- Changeset: schema `minor` (new `trsDescriptorUrl` export).
- `_unquote` comment now states the invalid-UTF-8 double-encode accurately.

Local: `make check` passes; resolver tests 7 passed; `pnpm test` all green except gxwf-web `--output-schema` test, which passes alone (load flake from parallel run). Shared fixture/expectation byte-identical to gxformat2#263.

Not done: N1 duplicate tests (`expansion.test.ts:99`, `it.each` in url-resolver test) left in place — removing tests needs John's ok.

Worktree: `~/projects/worktrees/galaxy-tool-util-ts/pr/191`.

## Archived — 2026-10-15

Merged on GitHub 2026-10-14; tracking ended.
