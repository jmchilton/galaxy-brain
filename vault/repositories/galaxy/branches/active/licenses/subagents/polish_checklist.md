All nine machine-answerable checklist items pass independent inspection, including the rebase resolutions and CI helper fix. The human-read item remains unchecked. Fresh integration, formatter and schema-comparison results are recorded in the polish debrief.

<details><summary>Full independent review</summary>

# Licenses polish checklist review

Reviewed independently on 2026-10-25 against `0073b5e9224...cd37d851bb2`. The normal checklist items pass on code and diff inspection. Final readiness still depends on fixing the known `MockAction.checks_preconditions` CI failure, validating the rebased branch and checking the affected files again. No additional implementation blocker was found in this pass.

This is a code and diff review. It does not claim that I reran the Galaxy suites or manually affirmed production terms. The coordinator owns current CI diagnosis and reruns. The human-read item is deliberately unanswered.

## General checklist

- [ ] Did a human read every test and every comment?
- [x] What does the user see when it fails? The form names missing agreements and prompts again, while API clients receive structured refusals.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They pin behavioral invariants and are complemented by API, database, lifecycle and browser coverage.
- [x] Are baseline tests in their own leading commits? Yes. The first commit pins existing anonymous and logged-in `require_login` behavior.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc., what purpose do they serve? They explain active ordering, whitespace, cache and database constraints that would otherwise invite regressions.

<details><summary>Evidence for the general checklist</summary>

- **Failure presentation:** `client/src/api/licenseAgreements.ts::unmetPreconditionsFromError` decodes `403009` into agreement labels and a login remedy. `ToolForm.vue` reloads the refused form, and `WorkflowRun.vue` restores the prompt after a refused invocation. `ToolLicenseAgreements.vue` displays the affirmation controls, while its parent forms use the shared composable's `unaffirmed` state to disable submission. `test_tool_license_async_failure.py::test_license_failure_visible_to_user` covers an acceptance revoked after form load, checks the displayed label and recovery instruction, and verifies the prompt returns. `test_workflow_license_agreement.py::test_refused_workflow_submission_prompts_again` covers the corresponding workflow case. `workflow/modules.py` turns a delayed license refusal into `license_not_accepted`, which `WorkflowInvocationState/InvocationMessage.vue` renders. The direct API and async request state retain typed `unmet` data.
- **Generated files and scope:** `git diff --check 0073b5e9224..cd37d851bb2` was clean. The Galaxy `schema.ts` additions correspond to the agreement models, discovery/acceptance routes, submission fields and refusal types. The Tool Shed generated diff adds the shared `LicenseAgreement` model and parsed-tool field. No unrelated lockfiles, build products or snapshots enter this diff. The small pre-feature corrections are explicit leading commits with their own regressions. They preserve whitespace needed for terms, invalidate converter caches and refuse workflows with unavailable tools before creating a requested history.
- **Behavioral tests:** `test_license_agreements.py` compares equivalent file and inline terms, newline variants, display metadata changes and changed wording. Its fixed hash assertion pins a deliberately versioned external contract, rather than calculating an expected value by repeating the implementation. `test_LicenseAcceptanceManager.py` covers cross-tool identity, mixed binding declarations, revocation and purge. Database tests check uniqueness, constraints and retained associations. Integration tests assert that refused mapped submissions create no output collections, that new reruns/remaps need authorization, and that paused existing jobs retain their original authorization. Workflow integration tests cover delayed scheduling, revoked persistent authorization, durable one-time authorization and restart. Browser tests exercise both workflow forms, repeat-step prompt deduplication and preferences. Some parser and component assertions are necessarily small, but the suite does not rely solely on mirrors of internal code.
- **Baseline isolation:** `230eced4ee6` adds only the `require_login` fixture and anonymous/logged-in behavior tests. `7d584971ecf` follows with the extraction and expected structured exception. The fixture uses the pre-existing XML attribute and normal execution path, so the baseline is meaningful without a newly added API. Additional pre-feature corrections occupy leading commits 3–6.
- **Comments:** the new core comments explain current invariants, such as refusing before history commits, not reading agreement files in remote tool evaluation, preserving inline whitespace on reparse, clearing replaced converter lookups, choosing a PostgreSQL-safe constraint name and retaining the already checked authorization for every mapped job. They do not narrate review rounds or preserve abandoned implementations. The local schema `Model` comment explains the live import dependency. Test comments identify scenarios, not implementation history.

</details>

## Workflow checklist

- [x] Which existing workflows change behavior? Workflows using a newly declaring wrapper must obtain the runner's affirmation. Unchanged wrappers gain no new agreement prompt.
- [x] Who hits this in practice and what is the evidence? Tool authors and users of software with use restrictions are the intended audience. The branch demonstrates the contract with representative wrappers and lifecycle/browser tests, with no production wrapper migrated yet.
- [x] Were simpler or existing approaches considered? Yes. Saved checkbox parameters replay an old answer, and UI-only prompts do not cover API submission or delayed scheduling. The chosen server check and durable invocation associations address those concrete paths.

<details><summary>Evidence for the workflow checklist</summary>

- `workflow/license_agreements.py::workflow_license_agreements` traverses `walk_tool_steps()` through nested workflows, skips wrappers without declarations and deduplicates shared content hashes. `check_workflow_license_agreements` validates the new submission field and authorizes before run configurations or histories are created. Scheduling constructs a new `ToolExecutionContext` with the invocation's pinned one-time hashes, so a future step still checks the current persistent state. The integration tests deliberately pause and resume before the licensed step, revoke between those operations and restart the server before resume.
- Declarations require tool profile 27.0. Existing saved workflows do not acquire an affirmation parameter or replay a stored checkbox. Installing a wrapper version that declares terms introduces the new requirement. Preflight intentionally includes `when`-skipped steps, and revocation intentionally leaves previously created jobs and separately pinned one-time authorization intact. These are user-visible contract details that should remain explicit in the PR description.
- There are also leading pre-feature workflow changes: missing tools are refused before `new_history_name` creates a history, and `get_all_tools` uses the recursive walker with deduplicated missing tools. These should not be hidden behind an absolute claim that all undeclaring workflows have identical behavior.
- The motivation comes from issue #23261 and the documented gap in parameter checkboxes. The strongest demonstrated evidence in this branch is the unconditional non-commercial-use fixture family, not a production rollout. Browser scenarios cover both forms, repeat use, nested workflows and revocation. Operator-reviewed real terms and a production-wrapper pilot remain follow-ups, not completed validation.
- The branch notes and developer documentation examine submission versus user binding, all-of requirements, whole-tree versus per-step pins, backend-only delivery and PR decomposition. A plain saved parameter cannot identify the current runner's action. A UI-only solution would omit direct API requests and worker-side checks. Persisting one-time hashes per invocation is what survives scheduling delay and process restart. Current declarations are unconditional and require every listed agreement, so conditional and alternative entitlements remain outside this pitch.

</details>

## Follow-up verification required before handoff

1. Fix the known mock-action protocol omission and run its existing execution tests without weakening assertions.
2. After the requested rebase, inspect the changed conflict resolutions and rerun relevant checks. This report's initial verdict is pinned to the snapshot above until that inspection is recorded.
3. Keep the production-wrapper pilot, Planemo one-time support and human read-through marked as incomplete where relevant. Do not describe historical local results as a fresh full-suite pass.

## Final rebase and CI-fix inspection

Rechecked the changed areas at rebased head `9f030b98c3a` against `c93175dc985edbb71c01d49784127add31b6a60f`, plus the uncommitted `MockActionI.checks_preconditions = False` correction and one blank-line formatting fix in the added workflow API regression. The nine machine-answerable checklist conclusions remain satisfactory. No new blocker was found. The human-read item remains unanswered.

- **CI correction:** the existing execution-test fake inherits `MockActionI` and replaces actual action execution. Declaring `checks_preconditions = False` supplies the new protocol attribute with the same default as `ToolAction`. It does not disable checks on real default actions or remove any assertion. The coordinator reports that the original case reproduced as eight failures and one pass, then the affected unit/workflow suites passed with 460 passed and one skipped. I inspected the correction, not those test processes.
- **Workflow conflict resolutions:** the recursive walker retains every declaring occurrence, and `get_all_tools` retains global dictionary-value deduplication equivalent to current dev. The service retains dev's `_check_workflow_tools` and `_check_on_complete`, then authorizes license requirements before `build_workflow_run_configs`. The inserted missing-tool-history regression and dev's neighboring tests both remain. The populator retains `download_workflow_raw` and adds the license discovery helper without replacing dev's download behavior.
- **Update the pitch for the new base:** missing-tool preflight before history creation and cross-subworkflow tool deduplication already exist in this dev snapshot. They are not new behavior introduced by this PR after rebase. The old fourth commit now carries regression coverage, while the walker is a refactor preserving deduplication. The initial report's discussion of those two pre-feature behavior changes applies to the older base only.
- **Generated schema inspection:** the rebased branch still changes exactly the Galaxy and Tool Shed generated TypeScript schema files. The branch patch carries the same agreement models, two submission acceptance fields, discovery/acceptance routes and typed refusals. The Tool Shed additions remain the shared declaration model and parsed-tool field. This inspection found no unrelated generated additions. Actual scratch regeneration comparison remains the coordinator's separate check.
- **Comments and formatting:** the conflict-resolution comment states the active ordering invariant, not the rebase history. The mock protocol declaration needs no historical comment. `git diff --check c93175dc985...9f030b98c3a` is clean. The working-tree blank-line correction restores normal separation between API tests without changing assertions.
- **Validation attribution:** the coordinator additionally reports 30 passing API tests, including the license endpoints, inaccessible tools, missing-history case and current-dev preflight cases, plus a clean mypy run over 2,593 files. Integration, schema regeneration and the full formatting command were still being finalized separately when this inspection concluded. No fresh full-suite or production-wrapper claim is implied.

The original pending items 1 and 2 above are satisfied at the code-review level by this inspection and the coordinator's focused results. Final integration, formatting and schema comparison outcomes should be recorded in the polish debrief. The production pilot and human read-through remain future work.

</details>
