# Rebase onto main 161947ef (2026-11-12)

Old head `b74c6bdd` → new head `a40ff6ae`, restacked with `git rebase --onto` onto the rebased #809 (`197e5afd`). No conflicts.

## gxwf diff 4d086efa

- Ran `gxwf diff --json` from the gtu-ts #233 worktree at `4d086efa`. It reproduces `content/molds/run-workflow-test/examples/unlabelled-step-removal/step-diff.json` and all six `packages/gxwf-foundry/test/fixtures/step-removals/*.diff.json` byte for byte, so nothing was regenerated.
- New commit `a40ff6ae` updates the provenance citations in the example README and in `step-removals.test.ts` from `a5c6cd57` to `4d086efa`. The PR body now gives `4d086efa` as the release content to wait for.

## Gate at `a40ff6ae`

- `npm run packages-build`, `make casts`: no cast drift.
- `make -k check`: 501 tests pass. Red only on `validate-roadmap` (the live drift main also has) and `check-vendored` (machine-only).
- `typecheck`, `packages-typecheck`, `format`, `lint`, `check:kinds`, `lint:packages`: clean.
- `packages-test`: all pass. That includes gxwf-foundry 122 and summarize-nextflow 147, with local workflow-fixtures pipelines present.
