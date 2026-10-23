# Re-scope implementation: modest expansion (a)–h

**Top-line.** All items are implemented on `licenses`. The branch is still on `0073b5e9224` and has 19 commits, because item (g) adds one commit. The new head is `30246b37ef6`; the old head is `29171b3c054`.
- Backup refs:
  - `backup/licenses_pre_rescope` = `29171b3c054`
  - `backup/licenses_rescope_prefold` = the head before squashing
- `licenses_alt_original_scope` is untouched.
- Nothing has been pushed and nothing is committed in the vault.

**Real defect found (h).** Running on PostgreSQL showed a defect no SQLite run could catch. The `workflow_invocation_license_acceptance` unique constraint name was 80 characters, over PostgreSQL's 63-character limit. Because of it, `manage_db.sh init`, `create_tables` and the migration round-trip all failed on PostgreSQL. The `unit-postgres` and integration-on-postgres CI jobs would have gone red. The fix is in the models/migration commit.

## Final commits

| # | SHA | Commit | Rescope changes |
|---|---|---|---|
| 1 | `230eced4ee6` | Baseline tests for require_login tool execution | unchanged |
| 2 | `7d584971ecf` | Extract tool execution preconditions… | **(c)** API test |
| 3 | `065ae3305a3` | Add Workflow.walk_tool_steps… | — |
| 4 | `0c8e0d8f675` | Check workflow tools are installed… | (d) already there |
| 5 | `c3c80299ad0` | Parse and resolve `<license_agreement>`… | — |
| 6 | `cfc423746ff` | Add tool license agreement models and migration | **(h)** constraint name fix |
| 7 | `ace69043b55` | Add LicenseAcceptanceManager… | — |
| 8 | `8d5e1f10502` | Add API for tool license agreements… | **(h)** GDPR plus other-user grant tests |
| 9 | `80dde10abf4` | Enforce tool license agreements on job creation | **(e)** rerun/remap and resubmission pins; **(h)** job-record purge test |
| 10 | `ca13e9d9737` | Enforce … on workflow invocations | **(e)** paused-resume pin; **(f)** `when=false` |
| 11–13 | | Prompt…/Show refused… | — |
| 14 | `4f9a800a73b` | Refresh workflow run forms when … refused | **(a)** fix and tests; message extended |
| 15 | `432e0cef833` | Keep license agreements off indirect execution paths | — |
| 16 | `c49a310a04f` | Fix stale and over-eager licensed converter filtering | **(b)** fix and test; message extended |
| 17 | `2fb03ebfaa4` | **new:** Accept license agreements in workflow framework tests | **(g)** |
| 18–19 | | Document… / Correct license agreement doc… | doc updates for a, b, f, g |

- At every commit, ruff 0.17.1 check and format, black, isort, flake8 with bugbear, and py_compile ran clean on the changed `.py` files, via `git rebase --exec`.
- No API model changed, so `schema.ts` was not regenerated. `TestJob` is the workflow test file schema, not an API model.

## Per item

### (a) Workflow agreement discovery checks tool access

**Change.** In `lib/galaxy/workflow/license_agreements.py`, `workflow_license_agreements` now returns `WorkflowToolLicenseAgreements(declared, inaccessible)`.
- A tool that declares agreements and fails `tool.allow_user_access(trans.user)` contributes no agreements. It is listed in `inaccessible` instead.
- `describe_workflow_license_agreements`, used by the GET route and the run form, therefore omits those agreements.
- `check_workflow_license_agreements`, the invocation preflight, raises the existing `TOOL_ACCESS_PRECONDITION` refusal (403009, `kind: access`) for each inaccessible licensed tool, before any terms are described.
- The check is limited to tools that declare agreements, so a non-licensed workflow with admin-only steps behaves as before.

**Why not `get_accessible_tool`.** It takes an id and version, not `tool_uuid`, and matches versions exactly. The walker resolves tools the way the invocation does, so it reuses the precondition object instead.

**Tests and red-to-green.**
- The leak is reachable through an anonymous user on a published workflow, because licensed tools imply `require_login`. Integration test `test_workflow_license_agreements_hidden_from_users_without_tool_access`:
  - It is red without the fix on both paths. The GET route returned the agreement.
  - Separately, `GET /api/workflows/{id}/download?style=run` returns 200 to anonymous users and returned the agreement in `license_agreements`.
  - Both are green with the fix.
- A logged-in user who can't access a licensed tool can only be built with a licensed data manager, because user-defined YAML tools can't declare agreements. The preflight branch is therefore covered by unit test `test/unit/workflows/test_workflow_license_agreements.py`, which uses stubs and has 2 tests:
  - Red without the fix: `authorize` was called on the inaccessible tool, and describe returned its agreement.
  - Green with the fix.

**Placement.** Commit 14, which is the last commit touching the module and is where the GET route lives.
- This is a deliberate simplification. The leak first appears with the preflight details in commit 10 and with the run form in commit 12.
- Folding the fix earlier would have meant rewriting a module that commits 12 and 14 change again.

### (b) `/api/datatypes/converters` uses the same filter

**Change.**
- New `Registry.offered_datatype_converters()` is the single licensed-converter filter.
- `get_converters_by_datatype` is rebuilt on it, with unchanged semantics: it still filters before merging, so an inherited unlicensed converter still wins.
- `managers/datatypes.py::view_converters` iterates over it.
- No client code consumes this endpoint.

**Red-to-green.** `test/unit/app/managers/test_datatypes.py::test_view_converters_excludes_converters_requiring_license_agreements` was red without the fix (`'tabular' not in {'tabular': 'to_tabular', …}`) and is green with it. The existing registry tests still pass.

### (c) 403009 for a non-license inaccessible tool from `POST /api/tools`

**Test.** `lib/galaxy_test/api/test_tools.py::test_run_inaccessible_tool_refused`.
- A non-admin runs the admin-only `data_manager` fixture.
- The test asserts the exact `unmet` payload and that no job was created.
- There is no `skip_without_tool`, because the anonymous tool listing hides data managers.

**Red-to-green at real commits.**
- At commit 1 (`230eced4ee6`): `assert 403002 == 403009`.
- At commit 2 (`4949ce65346`, before squashing): passes.
- Passes at head.

**Ruled out.** Another user's private user-defined tool returns 404, not 403, so it can't exercise this path.

### (d) Missing tools create no history

Already in commit 4. It was re-run at head and passes.

### (e) Creation-bound contract pins

All three pass without code changes, so the docs are correct and no fix was needed. They are pins, not red-to-green tests.
- **`test_revoke_does_not_affect_resuming_paused_job`**, in commit 10 because it needs `license_agreement_user_data_tool`:
  1. A persistent acceptance is in place.
  2. The licensed data job waits on a failing `job_properties` job and becomes `paused`.
  3. The acceptance is revoked.
  4. A remap of the upstream job resumes the paused job, through `job.resume()`, the same call `PUT /jobs/{id}/resume` makes.
  5. The job ends `ok` and still references the original event.
  - A direct `PUT /resume` on a job whose input is still in error state just pauses again, so the test goes through remap instead.
- **`test_rerun_and_remap_need_new_authorization`**, in commit 9:
  - After a revoke, a plain rerun and a rerun with `rerun_remap_job_id` both return 403009, and no new job is created. The precondition runs before `_remap_job_on_rerun`.
  - A rerun or remap with a fresh one-time acceptance succeeds. Its association is `one_time` with no event, independent of the original `persistent` one.
- **`TestLicenseAcceptanceResubmission.test_revoke_does_not_affect_automatic_resubmission`**, in commit 9:
  - Uses the existing `resubmission_job_conf.yml` and resource params, with the constants imported from `test_job_resubmission`, and the `resubmit_after_delay` environment.
  - The acceptance is revoked right after submission. The job ends `ok`, `resubmission_count` is 1, and the persistent association is kept.
  - The test waits on the job state itself, because `wait_for_job` treats `resubmitted` as final.
- `_wait_for_job_state` was added to the base integration class.

### (f) `when=false` regression

`test_step_skipped_by_when_still_requires_acceptance`, in commit 10, passes and is a pin.
- Without acceptance, the invocation is refused with 403 and names the agreement.
- With a one-time acceptance, the invocation runs, and the job is `skipped` with a `one_time` association.
- No persistent acceptance appears.
- The docs now say that skipped jobs record their authorization.

### (g) gxwf runner carries one-time hashes

New commit 17.
- **Schema.** `TestJob.accept_license_agreements: bool | None = False` and `JobTestDict.accept_license_agreements`.
- **Populator.**
  - `run_workflow(..., accept_license_agreements=False)` fetches `GET /api/workflows/{id}/license_agreements` through the new `workflow_license_agreement_hashes` and sends `one_time_license_acceptances`.
  - `rerun()` copies the hashes from the summary's request, because `/invocations/{id}/request` doesn't record one-time acceptances.
- **Runner.** `test_framework_workflows.py` passes the flag through.
- **Fixture.** `license_agreements.gxwf.yml` has a top-level licensed step plus a nested subworkflow licensed step. `license_agreements.gxwf-tests.yml` has an accepted case and an `expect_failure` case without acceptance.
- **Decision: an opt-in boolean, not hashes written into the YAML.** Hashes change whenever the terms change, and the tool interactor also derives hashes rather than declaring them.

**Red-to-green.**
- Without the runner and populator change, case 0 fails with 403009.
- With `GALAXY_TEST_WORKFLOW_AFTER_RERUN=1`, which the CI `framework_workflows.yaml` job sets, and the rerun copy removed, case 0 fails with 403. That shows the rerun copy is needed.
- Green in both modes.
- `test_validate_workflow_tests` validates the new fixture.

**Planemo** still needs its own follow-up, and the docs say so.

### (h) PostgreSQL validation

A local `postgres:18` was run in Docker and has been removed since.

**Defect found and fixed** in commit 6:
- The `UniqueConstraint` names on `workflow_invocation_license_acceptance` in the model and the migration are now `workflow_invocation_license_acceptance_invocation_hash_key` (57 characters). This follows the literal-name precedent of `uqsu_unique_label_per_user`.
- **Red:** before the fix, the integration server failed with `IdentifierError ... exceeds maximum length of 63 characters`, and `test/unit/app/test_migrate_database.py[postgres]` failed in `manage_db.sh init`.
- **Green:** after the fix, `test_migrate_database.py` passes on both databases. That test is Galaxy's upgrade/downgrade round-trip of every revision, so the existing pattern covers this migration and no per-revision test was added.

**Tests** in `test/integration/test_scripts_pgcleanup.py`:
- Commit 8: a shared helper with two tests, `purge_deleted_users` and `purge_deleted_users_gdpr`.
  - A purged user's events are deleted.
  - A survivor's event that names the purged user as `granted_by_user_id` keeps its id and `granted_by=admin`, has its attribution cleared, and still counts as accepted.
  - The grant row is set through the session, because no API grants an acceptance on another user's behalf.
- Commit 9: `test_purge_deleted_users_keeps_job_license_records`. The job association survives with `acceptance_event_id=NULL`, the same `agreement_hash`, the terms retained, and `persistent`.
- These are pins once the database can be created.

**GDPR test needs pgcrypto.** The GDPR action calls `digest()` from pgcrypto, so the test runs `CREATE EXTENSION IF NOT EXISTS pgcrypto` first. The CI postgres user is a superuser. **Observation:** without the extension, `pgcleanup.py` logged the SQL error but `_pgcleanup_check_output` still passed. This is pre-existing and not fixed here.

**Model/schema consistency.** The `check_indexes` equivalent, `manage_db.sh init` followed by `check_model.sh`, passes on both PostgreSQL and SQLite.

## Docs

`doc/source/dev/tool_license_agreements.md`, in commit 19:
- Discovery omits tools the user can't access, and invocation refuses them with `kind: access`.
- `/api/datatypes/converters` no longer lists licensed converters.
- Skipped jobs record their authorization.
- Workflow framework tests support `accept_license_agreements: true`; Planemo doesn't yet.

## Validation at the final head (`30246b37ef6`)

- **Unit tests:** 297 passed, 1 skipped.
  - Files: manager, preconditions, `tool_util` license agreements, `walk_tool_steps`, the new workflow license agreements file, actions, license loading, datatypes registry, managers datatypes, the db model, linters, test format model.
  - The db model and manager tests also ran on PostgreSQL: 31 passed.
- **`make mypy`:** success, 2583 files. It first caught a walrus variable shadowing in (a); that was fixed and squashed.
- **API** (pytest with the galaxy-backend-tests env, one run at a time):
  - `test_license_agreements.py`: 18 passed
  - `test_tools.py -k test_run_inaccessible_tool_refused`: 1 passed
  - `test_workflows.py -k test_run_with_missing_tool_creates_no_history`: 1 passed
- **Integration:**
  - `test_license_acceptance.py`: 18 passed
  - `test_license_acceptance_workflows.py`: 17 passed
  - `test_scripts_pgcleanup.py` on PostgreSQL: 12 passed
- **Framework workflows:** `-k "license_agreements or default_values"`, 8 passed with `GALAXY_TEST_WORKFLOW_AFTER_RERUN=0` and 8 passed with `=1`.
- **Tests at their own commits:**
  - Commit 8: pgcleanup license tests, 2 passed on PostgreSQL.
  - Commit 9: `test_license_acceptance.py`, 17 passed; pgcleanup license tests, 3 passed on PostgreSQL.
  - Commit 10: `when` test and resume test, both passed.
- **Not run:**
  - vitest and vue-tsc, Playwright and Selenium: there are no client or UI changes.
  - The full API, integration and framework suites: left to CI.
  - `make update-client-api-schema`: no API model changed.

## Notes for the coordinator

- The vault `pr_description.md` "Known defects still open" list is stale. The mixed-binds item was already fixed. The (a) and (b) items are now fixed. "Workflow framework tests … can't send one-time hashes" is now Planemo-only. A PostgreSQL constraint fix should also be mentioned.
- The amended commit messages for commits 14 and 16 describe (a) and (b). The commits that received fixups (2, 6, 8, 9, 10) keep their messages.
