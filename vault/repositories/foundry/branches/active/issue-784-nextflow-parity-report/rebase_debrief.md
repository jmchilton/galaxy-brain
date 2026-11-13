# Rebase onto main 161947ef (2026-11-12)

Old head `7d3e3cfa` → new head `a702bb6e`, restacked with `git rebase --onto` onto the rebased #821 (`872b1e11`). No conflicts.

## gxwf diff 4d086efa

- `gxwf diff --json` from the gtu-ts #233 worktree at `4d086efa` reproduces `packages/gxwf-foundry/test/fixtures/nextflow-parity/bamtofastq/parity-diff.json` byte for byte. Nothing was regenerated.
- New commit `a702bb6e` updates the provenance comment in `nextflow-parity.test.ts` from `a5c6cd57` to `4d086efa`. The PR body cites `4d086efa`.

## Checks against main's summarizer changes (#790)

- The "committed summary equals one built from `pipeline/`" test passes at `a702bb6e`, so `summary-nextflow.json` didn't need regenerating.
- Live runs at `a702bb6e`: `foundry nextflow-parity` on the fixture exits 0 with the 7 findings and the step and flag tables the PR body shows. `foundry check-scope-records` on #821's sarek example ledger gives `9 scope drop(s), 0 problem(s)`.

## Gate at `a702bb6e`

- `npm run packages-build`, `make casts`: no cast drift.
- `typecheck`, `packages-typecheck`, `format`, `lint`, `check:kinds`, `lint:packages`: clean.
- `validate-roadmap` (the live drift main also has) and `check-vendored` (machine-only): red, as expected.
- The test runs overlapped with heavy machine load (load average 20–50, from Defender and Nessus scans):
  - `make -k check`: 498/503. The 5 failures were tests hitting the 60 s timeout, including the sarek citation test. Under normal load the same tests passed on #821.
  - gxwf-foundry: 147/151. The 4 failures are CLI-spawning tests that hit the 30 s timeout.
  - summarize-nextflow: a network fetch (`--fetch-test-data` on bacass) hung for 18 minutes and was killed. This branch changes no files there.
  - Rerunning gxwf-foundry with `--testTimeout=600000` (load average 50) still fails the same 4. Those tests set their own 30 s timeout, and each took about 40 s. The `markdown-document` and `workflow-brief-readiness` tests in that set are code this branch doesn't touch.
- Targeted reruns once load eased:
  - The 5 root tests that timed out pass (104/104 across `assemble-pipeline`, `cast-mold`, `scope-decisions` including the sarek citation test, and `workflow-brief-pipelines`).
  - The 4 gxwf-foundry CLI test files pass (41/41).
  - Every timeout in the gate run was load-induced.

## Relevant red: build-cli `run-dashboard-model.test.ts`

- `buildRunModel on a recorded run > trusts the run record for identity and phase order` fails on #827 (235/236). The same test passes on #818 and #821 (236/236). nfcore-tool-lab (94) and gxwf-pi-harness (31 + 2 skipped) pass.
- Cause: #827 adds `[[nextflow-summary-to-galaxy-parity]]` as phase 14 of `content/pipelines/nextflow-to-galaxy/index.md`. The recorded fixture `packages/build-cli/test/fixtures/runs/tiny-nextflow-run/foundry-run.yml` (and its feedback ledger's `run.phases`) has only 13 phases. Phase 14 therefore doesn't get `status_source: run-record`, and `every(... === "run-record")` fails.
- This is not from the rebase: main's 13 commits touch only summarize-nextflow. It has been red since the parity phase was added. Pre-rebase gates never ran `packages-test` to the end, and CI stops at `validate-roadmap`.
- Not fixed, because it needs a choice: add a pending phase 14 to the recorded fixture, or change how the model treats a record that predates a newer assembly phase. Editing the fixture is a test-data change, so it waits for John.
