# Debrief: native license acceptance (galaxyproject/galaxy#23261)

Branch `jmchilton/licenses`, 11 commits on `dev` (`1eed562dfc2`), 102 files, +6.7k/-77. Every phase went through a review subagent before moving on; the review fixes were amended into the phase commit, except the last round, which is its own commit.

## What landed

| Phase | Commit | Summary |
|---|---|---|
| 0 | `39482d544df` | `tools/preconditions.py`. `_check_access` (a bare assert) becomes `_check_preconditions`. Structured 403009 `TOOL_EXECUTION_PRECONDITION_UNMET` carrying `unmet`. |
| 1 | `9eb70282720` | `<license_agreement>` under `<requirements>`, profile 26.2. `path` or inline `<text>`. Content-addressed `agreement_hash` (schema-1 canonical JSON). XSD, 5 linters, fixtures. |
| 2 | `63585586b61` | 4 tables: terms, append-only events, job association, invocation association. Migration `01cbf54bb541`. |
| 3 | `8ce0eb3a9a2` | `LicenseAcceptanceManager`: `authorize`, `associate_with_job`, `describe`, and purge on the `UserManager` and pgcleanup paths. |
| 4 | `b3a68e9ec99` | API: `GET /api/tools/{id:path}/license_agreements`, plus `/api/users/{id}/license_acceptances` (GET/POST/DELETE). Accepting confirms the displayed hash. License tools imply `require_login`. |
| 5 | `25a003bdaf4` | Enforcement on `POST /api/tools` and tool requests via `one_time_license_acceptances`. The early per-submission check means a blocked map-over leaves no orphans. The interactor sends declared hashes. |
| 6 | `b0751c6e45c` | `Workflow.walk_tool_steps`. Request-time check with step paths, a one-time pin per (sub)invocation, and scheduling-time `license_not_accepted`. |
| 7a | `fbc47ae8158` | Tool form prompt (terms, affirm, remember for `binds="user"`) and a preferences page (accepted, terms, revoke, history). |
| 7b | `1d0773e3691` | Both workflow run forms prompt, including for subworkflow tools, with one prompt per agreement. |
| 7c | `9d6b823403b` | A refused submission names the agreements and reloads the form. |
| fix | `4d0583c24ad` | Refused workflow runs refresh. Typed `WorkflowLicenseAgreementResponse` and `GET /api/workflows/{id}/license_agreements`. Extra tests. |

## Divergences from the plan (update the issue)

- **Module names:**
  - `managers/licenses.py`, `api/licenses.py` and `schema/licenses.py` already existed (SPDX), so the new ones are `*/license_agreements.py`.
  - The table is `tool_license_agreement`; the plan says `tool_license_text`.
  - `UnmetPrecondition` moved to `galaxy.schema.schema`, and `schema/tool_preconditions.py` was deleted, to avoid an import cycle.
- **Precondition context:** it rides on `ToolExecutionCache` (`ToolExecutionContext`) rather than being threaded through every action signature.
- **Non-default tool actions:** you chose to reject them at load. `ToolAction.checks_preconditions` makes subclasses that override `execute` fail closed.
- **Hash on accept:** accepting requires the displayed `agreement_hash`, so a stale form can't accept terms it never showed.
- **Workflow request-time check:** it runs in `invoke_workflow` after the missing-tools check, not in `build_workflow_run_configs`.
- **Workflow pinning:** hashes are pinned only on the (sub)invocation whose own steps declare them, not copied across the whole tree.
- **Test placement:** the API tests are plain API tests, not integration tests. Workflow enforcement is covered by integration tests, including a real server restart.
- **Selenium:** async failure is tested through the tool form, because no UI lists tool requests submitted only through the API. The workflow "survives scheduling" case is covered by integration tests, not Selenium.
- **Not done from the test matrix:**
  - `test_workflow_step_with_baked_in_boolean_still_prompts`.
  - Resume/remap re-prompt tests. Remap and resubmission don't go through the tool action.

## Coverage

- **Unit:** licence parsing and canonicalization, linters, models, the manager, `describe`, preconditions, `walk_tool_steps`.
- **API:** 16 tests.
- **Integration:**
  - tools: 15 tests;
  - workflows: 13 tests;
  - pgcleanup purge: 1 test, Postgres only, skipped locally.
- **Framework:** all 7 license fixture tools pass through the interactor.
- **Client unit tests:** `ToolForm` (11), `ToolLicenseAgreements`, `LicenseAgreementsManagement`, the composable, `WorkflowRun`.
- **Selenium (15):** tool form, preferences, workflow run forms (simple and expanded), refused submission.

## Known gaps / open questions

1. A `ToolRequest` row is left behind when a scheduling-time license check fails. This is consistent with other failures that happen after the state is captured.
2. The workflow framework tests and planemo can't send one-time hashes. No gxwf test uses a license tool yet.
3. `when`-skipped steps still need acceptance and get a job association.
4. `data_source_async` and converter tools can only use persistent acceptance. Reject them at load, or document it?
5. Async validation in the web process and enforcement in Celery can diverge if a license file changes. This fails closed.
6. The terms are embedded in every tool form build and every `onUpdate`. If licenses get long, fetch them on demand instead.
7. Credentials could adopt `get_accessible_tool` (a 401 → 403 change). Tabled.
8. No UI lists tool requests submitted only through the API.
9. Admin instance-wide acceptance is deferred. The `granted_by` columns are already shipped.
10. PR split: phase 0 can be its own PR. Phases 1-5 make one reviewable chain, and 6-7 can follow.
