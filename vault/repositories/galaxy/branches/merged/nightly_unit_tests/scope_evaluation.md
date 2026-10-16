# Scope evaluation — nightly_unit_tests

**Recommendation: keep scope as implemented.** The branch answers the CI-speed ask (one fewer per-PR unit job, about 30 min saved on the critical path) and moves the nightly coverage into the same tracking-issue pattern as #24014. Extracting the reporter is the trigger the #24014 debrief named for a second consumer, so it belongs here, not in a follow-up. Both review follow-ups are weaker than they look and should stay out. The six-workflow concurrency issue is harmless for those workflows: their schedule runs the same matrix as a `dev` push, so a cancelled scheduled run is replaced by an equivalent one. Only `unit.yaml`, whose nightly matrix differs, needed the fix. Adopting the reporter elsewhere was already judged low-value in #24014, because those workflows also run on PRs and pushes, where failures show. The one change worth making is in the PR body: call out that the reporter now finds open tracking issues by title, not `labels[0]`, which changes merged #24014 behavior.

Decisions John made are taken as given: 3.14 stays per-PR (3.10 is the slower job, and ruff plus mypy-on-3.10 catch most too-new code), and release branches keep the full matrix.

## As implemented

Unit tests run on 3.14 only for PRs and `dev` pushes, and on 3.10–3.14 for release branches, a daily schedule and manual dispatch. The concurrency group now includes the event, so a `dev` push doesn't cancel the nightly. The Selenium reporter is extracted into `report_scheduled_result.yaml` (lookup by title, failed jobs listed) and used by both workflows. Docs updated.

| Pros | Cons |
|---|---|
| - Directly delivers the Marius/John ask<br>- Reuses the #24014 pattern rather than adding a second inline copy<br>- Release-branch gap closed (schedules only fire on `dev`)<br>- 3.11–3.13 get unit coverage for the first time, at nightly cost only<br>- Stale CircleCI docs fixed | - Touches merged Selenium code; the title-only lookup is a quiet behavior change<br>- Not testable end-to-end until it's on `dev` (schedule/dispatch); fork-PR `startup_failure` is still unverified<br>- Nightly Codecov uploads include 3.10-only branches (nit, `comment: false`)<br>- `import tomllib`-style new stdlib modules slip past mypy until the nightly runs |

## Contract: inline the reporter in `unit.yaml`, leave Selenium alone

Copy the #24014 report job into `unit.yaml` and don't extract it.

| Pros | Cons |
|---|---|
| - Smaller diff; merged Selenium workflow untouched<br>- No `workflow_call` / fork-permission question | - Two copies of about 60 lines of script that will drift<br>- Goes against the #24014 debrief, which said to extract when a second consumer appears<br>- Loses the failed-job listing, unless it's copied too |

## Contract: split into two PRs (reporter extraction, then unit nightly)

PR 1 extracts the reporter and switches Selenium to it. PR 2 changes the unit matrix and adds the schedule.

| Pros | Cons |
|---|---|
| - The Tuesday Selenium run would exercise the reusable workflow on `dev` before unit relies on it<br>- Each PR is easier to review on its own | - The extraction has no motivation without its second consumer, which is the stated trigger<br>- About 160 lines total is already small; two review cycles for one idea<br>- Delays the CI-time win Marius asked for |

## Contract: revert the title-only dedupe change

Keep #24014's `labels[0]` lookup and leave the merged behavior as it was.

| Pros | Cons |
|---|---|
| - The reusable workflow is a pure extraction with no behavior change | - Keeps a hidden "first label is the key" rule in a shared workflow that now has several callers<br>- Relabeling an open issue would still orphan it and open a duplicate |

<details>
Small either way. Keeping the change is fine as long as the PR body states it. Dedupe can't collide between callers, because titles differ.
</details>

## Expand: fix the push-cancels-schedule concurrency in six workflows

Add `event_name` to the concurrency group in `api`, `converter_tests`, `framework_workflows`, `integration_selenium`, `performance` and `playwright`.

| Pros | Cons |
|---|---|
| - Consistent concurrency groups across workflows | - Little real benefit: these run the same matrix on push and on schedule, so a cancelled Tuesday run is replaced by the push run on a newer commit<br>- Six unrelated workflows in a unit-tests PR |

<details>
The reviews describe this as a latent bug "like unit.yaml". It isn't quite the same. In `unit.yaml` the schedule runs a superset matrix, so cancelling it loses coverage. For the other six, schedule and push run the same jobs. It only matters if one of them later gets a schedule-only matrix or reporter, and that change can carry the fix. Not even a strong follow-up.
</details>

## Expand: adopt `report_scheduled_result.yaml` in other scheduled workflows

Add a report job to the remaining weekly schedules (`api`, `integration`, `framework_*`, `playwright`, `performance`, `converter_tests`, `integration_selenium`, `tool_form_harness`).

| Pros | Cons |
|---|---|
| - Catches failures caused by dependency or external drift that land between pushes<br>- The extraction pays off | - #24014 rejected this: these run on PRs and pushes, where failures are already visible<br>- Every flaky weekly failure would open an issue (noise)<br>- Each needs its own labels/title decision; out of scope for a unit-tests PR |

<details>
Candidate follow-up only if a workflow gets a schedule-only matrix, the way unit did here. `dependencies.yaml` and `mypy_legacy_list.yaml` are maintenance jobs that open PRs, not tests.
</details>

## Expand: apply newest-only-per-PR to other dual-version matrices

Same treatment for `first_startup`, `osx_startup`, `test_galaxy_packages` and `lint_openapi_schema`, which run 3.10 and 3.14 per PR, using the nightly as the backstop.

| Pros | Cons |
|---|---|
| - Same CI-time motivation; `osx_startup` uses expensive macOS runners | - Not what was discussed; each workflow's runtime and value needs its own case<br>- `lint` must keep 3.10, because mypy on 3.10 is the static gate John's decision relies on<br>- Packaging and startup on the oldest Python are cheap to break and not covered statically |

<details>
Worth raising with Marius as a separate idea if per-PR time is still a concern after this lands. Don't fold it in.
</details>
