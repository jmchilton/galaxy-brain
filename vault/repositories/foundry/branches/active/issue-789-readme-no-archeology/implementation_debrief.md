# Implementation debrief

Branch `issue-789-readme-no-archeology`, base `origin/main` at `8cbb5f22`. Commits `a4988f41` (initial rule) and `dbe77aaf` (review fixes).

- **Root cause.** Step 5 of `mature-galaxy-workflow-for-iwc` had no scope limit on the README and said to preserve supplied material. Nothing said where run evidence goes, so iwc-lab#4's README carried invocation ids, failed medaka runs, local emulation failures and validator caveats.
- **Fix.** The README is written for a user of the workflow as submitted, and run evidence goes to `iwc-maturation-report.md`, ready for the PR body. Kept in the README: current limitations, the reason for departing from the source, and one accuracy sentence. Added a harness note to `galaxy-workflow-maturation` for phase 3/4 evidence. Mold revision 2, pipeline revision 3.
- **Tests.** This is prose, so there is no mechanical red-to-green test. Added the eval property "README without run evidence" and the `readme-history` scenario with a fixture modelled on #4. No `/test-drive` was run.
- **Gate.** `validate`, `check-generated`, `check-casts`, `check-verify`, `check-assemble-pipelines`, `check-fixtures` and `test` (496 passed) are green. `validate-roadmap` fails on #783 missing from #768's roadmap, which is live GitHub state and unrelated. `check-vendored` fails only on this machine.
- **Reviews.** Normal, domain, docs and Codex reviews are in `subagents/` and `codex_review.md`; all actionable findings were fixed in `dbe77aaf`. No thermo review: under 50 lines and no plumbing.
- **Process note.** WORK_HORSE.md points at `.reviewers/DOMAIN_REVIEW.md`; the file is `reviewers/DOMAIN_REVIEW.md`.
