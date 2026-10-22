# Test challenges debrief: licenses

Head `ddd7b584e1d` on `origin/dev` `0073b5e9224`; backup ref `backup/licenses_pre_test_challenge` points to `aff7edb1937`. Not pushed.

## Summary

- **Commits:** there are now 16, one more than before. A "Baseline tests" commit comes first. It pins two require_login cases that dev already handles:
  - an anonymous run fails (dev raises a bare `AssertionError`);
  - a logged-in run creates the job.
  
  The phase-0 commit then narrows the anonymous case to `ToolExecutionPreconditionUnmet`. Every other change was squashed into the commit that introduced the test it touches. `git range-diff` maps all 15 original commits 1:1. The tree differs from `aff7edb1937` only in test and test-helper files (15 files, +159/-481).
- **Dropped:** 35 tests in total. Most are covered by a higher layer; a few only tested the implementation or a trivial default.
  - Python unit: 30 dropped and 1 split out, so net -29. The 9 unit files went from 299 to 270 tests.
  - vitest: 5 dropped; the 5 license test files went from 29 to 24 tests. Their coverage now depends on the existing Selenium tests, which this step did not run.
- **Rewritten:**
  - stub classes are now dataclasses;
  - `WorkflowRun.test.js` now drives the error through the child form's `submissionError` event and checks the rendered alert, instead of calling `vm.handleSubmissionError` and reading `vm.submissionError`;
  - API and integration tests use populator helpers.
- **Added:**
  - 2 API tests that replace dropped unit tests (16 to 18);
  - 1 Selenium test for a refused workflow submission, a gap in the E2E coverage;
  - stricter assertions in `test_history_ordering`.
- **Status:** every changed test file was re-run, and everything passes (counts below). Nothing was blocked.

## Fail-without-branch check

The new tests in files that already exist on dev were run against a temp worktree of `origin/dev` with only the test diffs applied.
- These fail at their own assertions:
  - `test_actions.py`: the anonymous require_login test (`AttributeError: 'AssertionError' object has no attribute 'unmet'`);
  - all 3 converter tests in `test_datatypes_registry.py` (`'tabular' not in ...`, and `'fasta_to_tabular' == 'data_to_tabular'`).
- `test_logged_in_user_require_login_tool_job_created` **passed on dev**. It moved into the new Baseline commit.
- The rest are tests of brand-new modules or endpoints (`preconditions`, `license_agreements`, `walk_tool_steps`, the new linters, the API, and the integration tests). On dev they can only fail at import or because the route doesn't exist. That's unavoidable for new behavior.
- `test_failed_tool_request_records_error_code` fails on dev: `err_code` is new in `state_message`.
- The rewritten `WorkflowRun` test fails when `handleSubmissionError` is reverted to dev's body (`expected 'Workflow submission failed: Workflow …' to contain 'Test License'`).
- E2E reasoning: the new Selenium test needs the refused-invocation reload added in the "Refresh workflow run forms" commit. Without it, the error names no agreement and the form keeps showing it as accepted.

## Per-test decisions

### Python unit

**`test/unit/app/tools/test_actions.py`** (Baseline + phase 0)
- Baseline commit: the logged-in require_login test, plus the anonymous test asserting dev's `AssertionError`.
- Phase 0 tightens the anonymous test to `ToolExecutionPreconditionUnmet`, with kind `access`, the remedy route and status 403.

**`test/unit/app/tools/test_preconditions.py`** (phase 0)
- `StubTool` and `StubTrans` are now dataclasses.
- Dropped:
  - `test_all_met_does_not_raise`: trivial.
  - `test_access_met_for_accessible_tool`: every successful execution covers it, including the logged-in baseline.
- Kept:
  - `test_collects_every_unmet_precondition`: no API path produces more than one unmet precondition.
  - `test_short_circuit_*` and `test_api_error_dict_includes_unmet`: the integration anonymous-run test covers both at phase 5. Phase 0 can ship as its own PR, though, and these are its only coverage of short-circuiting and of the 403009 `unmet` serialization.
  - The inaccessible-tool test and the `checks_preconditions` subclass test (the fail-closed rule).

**`test/unit/tool_util/test_license_agreements.py`** (phase 1)
- Dropped `test_yaml_tool_source_has_no_license_agreements`. It tests a default `return []`.

**`test/unit/app/tools/test_license_agreement_loading.py`** (phases 1, 4, 5, and the indirect-paths commits)
- Dropped duplicates:
  - The inline `test_missing_license_path_fails_tool_load` and `test_license_agreement_below_profile_27_0_fails_tool_load`. They duplicate the fixture-load tests and the resolver and profile unit tests. The fixture versions are kept because the linter tests use those fixtures and `sample_tool_conf.xml` documents them as failing to load.
- Moved to the API layer: `test_different_id_identical_agreement_shares_hash`, `test_same_id_different_affirmation_does_not_share_hash` and `test_multi_agreement_fixture` are now the single API test `test_agreement_hash_ignores_id_and_follows_terms_and_affirmation`. The `_hashes` helper is gone.
- Dropped as covered elsewhere:
  - `test_license_agreement_with_credentials`: it asserted almost nothing, and the fixture's own framework test loads and runs the tool.
  - `test_license_agreement_implies_require_login`: covered by the API anonymous 403009/`/login/start` test and the integration anonymous-run test.
  - `test_license_agreement_adds_license_precondition`: it asserts the internal precondition list, and enforcement is covered by the integration tests.
- Kept: path resolution, no agreements, rejecting an action that skips preconditions, data-source rejection, remote-evaluation skip, inline dedent through real loading, the `parsed_tool()` whitespace regression, and the missing-path and low-profile fixtures.

**`test/unit/app/managers/test_LicenseAcceptanceManager.py`** (phases 3, 6, 7a)
- Dropped as covered by API tests:
  - reaccept-after-revoke (`test_history_ordering`);
  - persistent acceptance of a submission-bound agreement rejected;
  - acceptance is per user;
  - revoke without acceptance (404);
  - `describe` reports persistent acceptance (the `accepted` flags in the API tests).
- Dropped as covered by integration tests:
  - one-time acceptance is required for submission-bound agreements;
  - a user-bound agreement is met by one-time acceptance (the workflow integration test and the Selenium test);
  - the persistent and one-time `associate_with_job` tests;
  - `validate_one_time_hashes` (three integration tests check the 400);
  - `one_time_hashes_for_invocation` and `associate_one_time_with_invocation` (pinning is checked through the database in the workflow integration tests).
- Dropped as duplicates or trivial:
  - `test_changed_terms_not_accepted`: same as `test_same_id_different_agreement_prompts_twice`.
  - `test_unmet_ignores_persistent...`: same as the `authorize` variant.
  - `test_authorize_without_agreements` and `test_describe_without_agreements`: trivial.
- Moved to the API layer:
  - `test_accept_when_already_accepted_records_no_event` became an API test of the same name.
  - `test_revoke_copies_display_metadata` became a `license_id` assertion on every event in API `test_history_ordering`.
- Cleanup: `test_associate_with_job_different_ids_identical_agreement` contained an `unmet` deduplication assertion that belonged to a different test. It is now its own test, `test_unmet_reports_each_agreement_hash_once`; the assertion was moved, not weakened.
- Kept (14), none of which can be reached through the API or are already covered there:
  - stored agreement row content;
  - cross-id shared acceptance;
  - same id with different terms;
  - the agreement row reused across users;
  - fail-closed `associate_with_job`;
  - one-time preferred over persistent;
  - a binding change from user to submission;
  - revoke between `authorize` and `associate`;
  - the anonymous paths;
  - invocation pin deduplication;
  - both `UserManager` purge tests.

**`test/unit/data/model/db/test_license_agreement.py`**: kept. It holds CHECK, FK, unique and ondelete constraints plus the latest-event queries, following the existing model-test convention.

**`test/unit/workflows/test_walk_tool_steps.py`** (phase 6)
- Dropped `test_walk_tool_steps_recurses_into_subworkflows`. Integration checks the subworkflow paths `[[1, 1]]`, and the shared-subworkflow unit test also recurses.
- Kept the tests for skipping non-tool steps, a shared subworkflow reported twice, and recursion stopping on a cycle.

**`test/unit/data/datatypes/test_datatypes_registry.py`** (indirect-paths commit): `_StubConverter` is now `@dataclass(eq=False)`. The registry stores converters in a set, so they need identity hashing.

**`test/unit/tool_util/test_tool_linters.py`**: unchanged.

### API: `lib/galaxy_test/api/test_license_agreements.py` (phases 4 and 7a)

- Populator: added `tool_license_agreements_raw`. `tool_license_agreements` and `_displayed_agreement_hash` both build on it, and the tool-shed-id test uses it. The same GET had been written out in three places.
- `_build` now calls the existing `dataset_populator.build_tool_state`.
- `_fresh_user` was copied in 3 files. It is now `UsesApiTestCaseMixin._different_new_user()` in `lib/galaxy_test/base/api.py`.
- Added:
  - `test_accept_when_already_accepted_records_no_event`;
  - `test_agreement_hash_ignores_id_and_follows_terms_and_affirmation`, which also gives the otherwise unused `license_agreement_shared_tool` fixture an assertion.
- Strengthened `test_history_ordering`: every event's `license_id` is checked, and so is the event that the current acceptance points to after re-accepting.
- The anonymous requests stay raw because the populators always act as the logged-in user.

### Integration

**`test/integration/test_license_acceptance.py`** (phase 5)
- Added `BaseLicenseAcceptanceIntegrationTestCase`, which holds the populators and the database helpers: `_jobs_for_tool`, `_job_associations` and `_current_user_id`.
- The workflow file imports it, following the `BaseJobEnvironmentIntegrationTestCase` pattern. That removes a second copy of `_jobs_for_tool`.
- Placement: there is no custom config, but these tests inspect `self._app` for job and invocation associations that no API exposes, so they stay integration tests.

**`test/integration/test_license_acceptance_workflows.py`** (phases 6 and 7b, and the refused-run refresh commit)
- Uses the shared base and `_different_new_user`.
- `workflows/{id}/download?style=run` now goes through `workflow_populator.download_workflow(style="run")`.
- `_resume_pause` and `_wait_for_state` stay local. Only `test_workflows.py` has equivalents, and those are private.

**`test/integration/test_scripts_pgcleanup.py`**: unchanged. It is Postgres-only and was skipped locally, as before. The GDPR path and the "granted by another user" case (FOLLOW_UPS item 6) remain a follow-up.

### Client (vitest)

- `ToolForm.test.ts`: three tests dropped because Selenium covers them:
  - "blocks running until affirmed / sends one-time" (`test_tool_form_blocks_until_accepted`);
  - "does not prompt for already accepted" (`test_acceptance_persists_across_sessions`);
  - "names unaccepted and reloads when refused" (`test_tool_license_async_failure`).
  
  Kept:
  - remembered acceptance: asserts the checkbox is disabled until affirmed and that no one-time hash is sent;
  - a failed acceptance blocks the submission;
  - a tool-request failure: Selenium can't reach this path.
- `LicenseAgreementsManagement.test.ts`: "lists" and "revokes" dropped because the preferences Selenium tests cover them. The loading-error test is kept, and the fixtures it no longer needed were removed.
- `ToolLicenseAgreements.test.ts`: kept.
  - "shows the terms" overlaps Selenium, but the `aria-expanded` assertion is unit-only.
  - Withdrawing an affirmation clears "remember", which only the unit test covers.
- `licenseAgreementAffirmations.test.ts`: kept. It tests the composable's logic.
- `WorkflowRun.test.js`: rewritten as described in the summary.

### Selenium

- Added `test_refused_workflow_submission_prompts_again` to `test_workflow_license_agreement.py`, in the refused-run refresh commit. It mirrors `test_tool_license_async_failure`:
  1. accept the user-bound agreement, then open a nested user-bound workflow;
  2. revoke after the form has loaded, then submit;
  3. assert `workflow_run.run_error` names the label and the instruction;
  4. assert the form prompts again and Run is disabled.
- Not run here. The E2E polish step runs it.
- The rest of the existing E2E coverage is thorough, so nothing else was added.

## Commands and results (final head `ddd7b584e1d`)

- **Python unit.** `PYTHONPATH=lib .venv/bin/python -m pytest` over 9 files: `tool_util/test_license_agreements.py`, `tool_util/test_tool_linters.py`, `app/tools/{test_license_agreement_loading,test_preconditions,test_actions}.py`, `app/managers/test_LicenseAcceptanceManager.py`, `data/model/db/test_license_agreement.py`, `workflows/test_walk_tool_steps.py`, `data/datatypes/test_datatypes_registry.py`. Result: **270 passed**.
- **Type checks.** `cd lib && mypy . ../test`: **Success: no issues found in 2582 source files**.
- **Lint.** ruff 0.17.1, black and isort on the changed .py files: clean.
  - `git rebase --exec` ran ruff, `py_compile` and a stale-helper grep on every commit: clean.
  - Two intermediate-commit `_fresh_user` leftovers were found and fixed with fixups.
- **vitest.** `NODE_OPTIONS=--no-experimental-webstorage npm_config_use_node_version=$(cat client/.node_version) pnpm exec vitest run` over the 5 license test files: **5 files, 24 passed**. eslint and prettier on the changed files: clean.
- **API.** `./run_tests.sh --skip-common-startup -api lib/galaxy_test/api/test_license_agreements.py`: **18 passed**.
- **Integration, tools.** `./run_tests.sh --skip-common-startup -integration test/integration/test_license_acceptance.py`: **15 passed**.
- **Integration, workflows.** `./run_tests.sh --skip-common-startup -integration test/integration/test_license_acceptance_workflows.py`: **13 passed** (13 collected, so the shared base class is not collected).
- **Framework.** `pytest test/functional/test_toolbox_pytest.py -k license_agreement -m tool`: **8 passed**. That covers every license fixture in `sample_tool_conf.xml`, including `license_agreement_and_secret_tool`, so dropping `test_license_agreement_with_credentials` stands.
- **Baseline commit check.** At `d19cbd2657a`, in a temp worktree: `pytest test_actions.py -k require_login` gives **2 passed**.
- **Not run:**
  - Selenium, which the polish step covers;
  - pgcleanup, which is Postgres-only;
  - `vue-tsc`: the changed TypeScript files only lost code.
