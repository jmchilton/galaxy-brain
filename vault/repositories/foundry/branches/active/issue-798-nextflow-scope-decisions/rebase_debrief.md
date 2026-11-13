# Rebase onto main 161947ef (2026-11-12)

Old head `4ff48eda` → new head `872b1e11`, restacked with `git rebase --onto` onto the rebased #818 (`a40ff6ae`). No conflicts.

## Checks against main's summarizer changes (#790)

- `tests/scope-decisions.test.ts` passes both tests at `872b1e11`, including the live sarek citation test (local sarek fixture present, nothing skipped). Main's sarek reference-param change (`fd73689e`) doesn't break any citation.
- Re-checked the scenario claims against live summaries at the new head. sarek is `selected` on `tests/default.nf.test::dynamically-generated`, and rnaseq is `needs-scope-choice` with `aligner` default `star_salmon` and 4 enum values. Unchanged.
- PR body: the commit range and "pass at" SHA are updated, and the mutation-run SHAs (`4ff48eda`, `5feb4633`) are marked pre-rebase.

## Gate at `872b1e11`

- `npm run packages-build`, `make casts`: no cast drift.
- `make -k check`: 503 tests pass. Red only on `validate-roadmap` (the live drift main also has) and `check-vendored` (machine-only).
- `typecheck`, `packages-typecheck`, `format`, `lint`, `check:kinds`, `lint:packages`: clean.
- `packages-test`: summarize-nextflow's rnaseq `cli.test.ts` "records getGenomeAttribute provenance" timed out at its 5 s limit (5.9 s), and pnpm then stopped before the remaining packages. This branch changes no files under `packages/`, so this is the machine timing flake from #809's debrief. Main's rnaseq tests take 4–7 s here. I then ran the packages pnpm had skipped directly: build-cli 236/236, nfcore-tool-lab 94/94, gxwf-pi-harness 31 passed and 2 skipped.
