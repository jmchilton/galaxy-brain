# nightly_unit_tests: implementation debrief

Tip `f18cff94279` (8 commits on `dev` `36fe2ce8428`), pushed to `jmchilton/nightly_unit_tests`. Status: **READY**. The branch name says "unit", but it now also covers the Tool Shed tests.

## Final shape

- **`unit.yaml` and `toolshed.yaml`** run the same way:

  | Trigger | Python versions |
  |---|---|
  | PRs and pushes to `dev` | 3.14 |
  | Daily schedule (unit 00:00 UTC, Tool Shed 01:00) and manual dispatch | 3.10–3.14 |
  | Release branches | 3.10 + 3.14 (unchanged from before) |

  - The concurrency group includes `event_name`, so a push to `dev` doesn't cancel the nightly.
  - A `report` job, only on schedule/dispatch, calls the shared reporter. Issue titles: "Scheduled unit tests are failing" (`area/testing`) and "Scheduled Tool Shed tests are failing" (`area/toolshed`, `area/testing`), both also `kind/bug`.
- **`_report_scheduled_result.yaml`** (reusable). Opens, comments on, or closes the tracking issue, found by title plus the bot creator. Failure reports list the failed jobs. It only reports on `galaxyproject` `dev`. `selenium.yaml` uses it as well.
- **Reusable workflows are `_`-prefixed** (John): `build_client.yaml` → `_build_client.yaml` (5 callers + `selenium`). The convention is stated in `debugging_tests.md`. Callers include the reporter in their `paths` filters, the same way they already did for `_build_client.yaml`.
- **Docs:** the unit CI section in `writing_tests.md` is rewritten (it said CircleCI). The `debugging_tests.md` paragraph on reusable workflows and their callers is updated.

## Choices

- **3.14 per-PR** (John). The ruff/mypy-on-3.10 claim was checked with probe files; the gap is entirely new stdlib modules, because of `ignore_missing_imports`. Unit PRs get about 8 min faster. Tool Shed PRs get no faster (3.10 ≈ 3.14) but use 2 fewer jobs.
- **Release branches keep 3.10 + 3.14.** Scheduled runs only fire on `dev`. An earlier version of this branch ran all five versions there, which cost 10 Tool Shed jobs per release PR. The endpoint pair matches what release branches had before.
- **One file per suite.** The matrix is chosen by event, so the steps aren't duplicated. The 7-line matrix expression is repeated in two files; sharing it would need a matrix job on every PR's critical path.

## Evidence

- actionlint (on `./` copies) shows only existing shellcheck notes. zizmor shows the same 8 low findings as `dev`.
- The [reporter harness](report_harness.mjs) passes 7 cases, and its mutants are caught.
- Fork push CI expanded unit to `Test (3.14)` only. A full green fork CI run on the tip has not been seen yet.
- Reviews:
  - [normal](subagents/normal_review.md): release gap.
  - [rename](subagents/rename_review.md): clean; header comments dropped.
  - [toolshed](subagents/toolshed_review.md): release cost, reporter path filter.
  - [codex](codex_review.md): none.
  - [thermo-nuclear](thermo_nuclear_review.md).
  - [scope](scope_evaluation.md): keep. It predates the Tool Shed addition, which John asked for.
- Not run end to end. Schedule and dispatch only work from `dev`. After merge, dispatch "Unit tests" and "Toolshed tests" once on `dev`.

## For the PR description

- `Test (3.10, …)` disappears from PR checks. `dev` has no required checks.
- Tracking-issue lookup is now by title, not first label. This changes #24014's behaviour.
- Release branches still use `build_client.yaml`. When merging forward, update any new `uses:`/`paths:` references to `_build_client.yaml`.
- Watch the first fork-PR run for `startup_failure` (write-permission `uses:` job under a fork token; unlikely).

## Earlier drafts

[1](earlier_drafts/1/implementation_debrief.md): unit only, before the rename and the Tool Shed change.
