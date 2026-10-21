# issue-694-direct-build-on-brief

For [#694](https://github.com/galaxyproject/foundry/issues/694). Branch on `origin`. PR [#696](https://github.com/galaxyproject/foundry/pull/696) → `main`, opened 2026-10-21 on John's OK. Description: [pr_description.md](pr_description.md).

- Worktree: `~/projects/worktrees/foundry/branch/issue-694`, off `origin/main` `f264e588`.
- Commits: `5ff0c370` (direct routes on brief Molds, `unreviewed-proposal`, retire freeform Molds), `41e29cb5` (pin brief spine in test, data-flow supersede pointer).
- John's decisions (2026-10-21): new basis value, convert INTERVIEW → GALAXY in the same change, accept higher cost for now.
- Local gates: everything green except `check-vendored` and `check:planemo-cli`, which differ from upstream only on this machine. The branch touches neither area.
- Side effect: `check-vendored` ran `pnpm install && pnpm -r build` in `~/projects/repositories/galaxy-tool-util-ts`.
- Not yet run: a real end-to-end direct-build run on the new spine.
