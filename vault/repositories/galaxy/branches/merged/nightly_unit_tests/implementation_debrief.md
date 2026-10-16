# nightly_unit_tests: implementation debrief

Tip `694f69c4eab` (11 commits on `dev` `36fe2ce8428`), pushed to `jmchilton/nightly_unit_tests`. Status: **READY**. The branch name says "unit", but the branch now rebalances per-PR CI for several suites.

## Final shape

| Workflow | PRs and pushes to `dev` | Nightly (schedule + dispatch) | Release branches |
|---|---|---|---|
| `unit.yaml` | 3.14 | 3.10–3.14, 00:00 UTC | 3.10 + 3.14 |
| `toolshed.yaml` | 3.14 × 2 clients | 3.10–3.14 × 2, 01:00 UTC | 3.10 + 3.14 × 2 |
| `framework_tools.yaml` | `never` (tool request API) | `never` + `always` (legacy API), 02:00 UTC | both |
| `performance.yaml` | deleted | — | — |

- **Tracking issues.** Each nightly reports through the reusable `_report_scheduled_result.yaml`. It opens, comments on, or closes the issue, found by title plus the bot creator; failure reports list the failed jobs; it only reports on `galaxyproject` `dev`. `selenium.yaml` uses it too.
- **The tool framework Tuesday extended-metadata run is unchanged.** It runs both halves and isn't tracked.
- **Concurrency.** Groups include `event_name`, and `event.schedule` for tool framework, so a push to `dev` can't cancel a scheduled run.
- **Reusable workflows are `_`-prefixed** (`_build_client.yaml`, `_report_scheduled_result.yaml`), as stated in `debugging_tests.md`. Callers include them in their `paths` filters.
- **Docs.**
  - `writing_tests.md`: unit CI section rewritten (it said CircleCI); the tool framework section now covers the nightly and how to match PR CI locally (`GALAXY_TEST_USE_LEGACY_TOOL_API=never`).
  - `debugging_tests.md`: the paragraph on reusable workflows and their callers is updated.

## Choices

- **3.14 per-PR** (John). Too-new code is caught statically: ruff for syntax and mypy on 3.10 for stdlib attributes. Gap: entirely new stdlib modules.
  - Unit PRs get about 8 min faster.
  - Tool Shed PRs drop 2 of 4 jobs, with no wall-clock change.
- **Tool framework: `never` stays per-PR** (John). It's the API going forward. It's also the slower half (about 48 min), so this saves a job but no wall-clock time. Local runs default to `always`; the docs cover that.
- **Performance tests dropped from CI** (John). `lib/galaxy_test/performance` can still be run locally with `run_tests.sh -api`.
- **Release branches keep what they had before**, since scheduled runs only fire on `dev`.
- **One file per suite.** The matrix is picked by event. The selector expression is repeated across 3 files; sharing it would need a matrix job on every PR's critical path.

## Evidence

- actionlint (on `./` copies) shows only existing shellcheck notes. zizmor shows the `dev` baseline of 8 low. A template-injection finding appeared once the matrix value became dynamic; fixed by passing it through `env`.
- The [reporter harness](report_harness.mjs) passes 7 cases, and its mutants are caught.
- A full green fork CI run on the tip has not been seen yet.
- Reviews:
  - [normal](subagents/normal_review.md)
  - [rename](subagents/rename_review.md)
  - [toolshed](subagents/toolshed_review.md)
  - [framework tools + performance](subagents/framework_tools_review.md)
  - [codex](codex_review.md)
  - [thermo-nuclear](thermo_nuclear_review.md)
  - [scope](scope_evaluation.md): written before the Tool Shed, tool framework and performance changes John asked for. Its "performance" follow-up is moot now that the workflow is gone.
- Not run end to end. After merge, dispatch Unit, Toolshed and Tool framework tests once on `dev`.

## For the PR description

- Dropped from PR checks: `Test (3.10)` for unit and Tool Shed, `Test (3.10, always)` for tool framework, and the whole Performance workflow. `dev` has no required checks.
- Tracking-issue lookup is now by title, not first label. This changes #24014's behaviour.
- Release branches still use `build_client.yaml`. When merging forward, update any new references to `_build_client.yaml`.
- Watch the first fork-PR run for `startup_failure` (unlikely).

## Follow-up candidates

From the reviews:
- `db_indexes` (5 Postgres versions; strongest).
- `toolshed` `test-install-client`.
- 3.10 + 3.14 pairs in `first_startup`, `osx_startup`, `lint` and `test_galaxy_packages`.
- `cwl_conformance` markers.
- Tracking issues for the weekly extended-metadata runs.

## Earlier drafts

- [1](earlier_drafts/1/implementation_debrief.md): unit only.
- [2](earlier_drafts/2/implementation_debrief.md): unit + Tool Shed + rename.
