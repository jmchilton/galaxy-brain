# gxformat2 #219 — Draft Workflows

- [PR](https://github.com/galaxyproject/gxformat2/pull/219)
- [Python review and findings](review.md)
- [Python reproduction script](reproduce.py)
- [TypeScript parity review](typescript-parity.md)
- [TypeScript schema test output](typescript-parity.log)
- [TypeScript sync checks after temporary synchronization](typescript-sync-after.log)

## Current assessment after fixes — 2026-10-11

Original hold findings are resolved in Python `025bc24` and [TypeScript #190](https://github.com/jmchilton/galaxy-tool-util-ts/pull/190) at `0dc940df`. Python CI subsequently failed on three Ruff 0.17.0 lint findings; the narrow fix is published at `7b52756`. Exact CI lint versions and the 1,857-test local Python suite pass. New CI is queued. Neither PR merged.

- [Implementation and validation follow-up](follow-up.md)
- [Independent Python fix review](fix-review.md)
- [CI failure diagnosis and fix](ci-follow-up.md)
- [Independent CI fix review](ci-review.md)

## Initial assessment — 2026-10-11 (superseded by fixes)

**Hold merge.** Python extraction can corrupt numeric identities of surviving unlabeled list steps. The draft validator also has semantic and shorthand-validation gaps. TypeScript schema is aligned, but nine shared behavior cases fail on current TS main after importing the PR's fixtures and expectations.

- Reviewed gxformat2 head: `773a20b975704689bd716a566cc8c6ed8017b2f7`.
- Compared galaxy-tool-util-ts main: `eb7e4ea3a0e93048dae1c43a73eb47601575f233`.
- GitHub rechecked: open, non-draft, mergeable, merge state CLEAN. Test checks pass; publication/deployment jobs skipped as expected. No submitted reviews.
- Delivery: assessment provided to John in this session; no GitHub review or comment posted.
- Python verification: 871 passed, 8 skipped (IWC fixtures unavailable); changed-code lint/format and mypy pass. Confirmed failures reproduced separately.
- TS verification after temporary fixture/expectation sync: typecheck passes; schema suite 5081 passed, 9 failed, 5 expected failures, 79 skipped. All nine ordinary failures are shared declarative cases.

## Initial follow-up plan (completed)

Fix Python extraction so deleting list steps preserves or remaps numeric references, and reuse shared semantic checks / cover shorthand input types. Sync PR fixtures and expectations into TS and fix the nine parity failures. Rerun focused regressions and shared suites before merge.

## Worktrees and scope

Canonical PR worktree creation was unavailable because the PR branch is already checked out in an existing branch worktree. Review used isolated temporary checkouts at `/private/tmp/gxformat2-pr219-review` and `/private/tmp/gxformat2-219-ts`; existing development checkouts were not modified. The initial review synchronized TS fixtures in a temporary checkout. The coordinated implementation was subsequently published as TypeScript #190; see the follow-up above.
