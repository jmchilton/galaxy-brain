# Codex review: `licenses` vs `origin/dev`

Codex (`codex exec -s read-only`, structured findings) reviewed `origin/dev...3f3875c6239`. The brief gave it the feature description, the REVIEW_FOCUS areas, and three explicit questions: FOLLOW_UPS #1 (binding scope lost on dedupe), FOLLOW_UPS #2 (agreement DOM ids), and the empty history left by a refused invocation (from rebase_debrief.md). It returned 4 findings, and I confirmed all 4 against the code. It reported no nits and no abstraction or reuse findings.

**Acted on: all 4.** Each fix went into the commit it belongs to, with red-to-green tests. Test assertions were split so that each commit only tests surfaces that exist at that commit. The branch keeps 16 commits, with "Baseline tests" first. New head: `15d90cd36aa`, which was not pushed.

- **FOLLOW_UPS #1 (P1): binds lost on dedupe. Was live at HEAD; now fixed.**
  - New helper `stricter_declaration` in `galaxy.managers.license_agreements`. When the same hash appears with mixed scopes, submission binding wins. The real declaration is kept (id and label too), not a synthesized copy.
  - Both the manager's `_unique` (which feeds `describe`, `unmet` and `authorize`) and the workflow grouping in `workflow_license_agreements` use it. Order no longer matters.
  - The agreement hash and hash schema 1 are unchanged.
  - The client needed no change: it takes `binds` and `accepted` from the response, and offers "remember" only for `binds="user"`.
  - Fixed in `aa4222d3014` (manager) and `2ef6bc86c99` (workflow grouping).
- **FOLLOW_UPS #2 (P2): agreement DOM ids. Was live at HEAD; now fixed in `30cba8b5198`.**
  - Checkbox ids are now `license-<useId()>-affirm|remember-<agreement_hash>`. The terms region id is `license-terms-<useId()>`, and `aria-controls` follows it.
  - `data-test-id` stays keyed on the declaration id. GCheckbox lets a caller's `data-test-id` override the one derived from `id`, so `navigation.yml` and the E2E selectors are unchanged.
  - The preferences page shares `LicenseTerms`, so it is fixed too.
- **Empty history on a refused invocation (P2). Was live; now fixed in `2ef6bc86c99`.**
  - `invoke_workflow` now runs the missing-tools check and the license check before `build_workflow_run_configs`. That function creates and commits any `new_history_name` history, one per batch run.
  - This overrides the deferral in rebase_debrief.md.
  - Missing tools no longer leave an orphan history either, because the license check must run after the missing-tools check and so both moved together.
  - The batch-count check still runs after the run configs are built, because it reads them.
- **Docs:** the "known defect, don't mix scopes" warning now states the strictest-wins rule. Fixed in `15d90cd36aa`.

## Not acted on

- None of Codex's findings was refuted or skipped.
- There is no separate vitest for the preferences page. It renders the same `LicenseTerms` component, which the new `ToolLicenseAgreements` test covers: two agreements with the same id and different hashes, plus a second instance, with all terms expanded.
- Other FOLLOW_UPS items (#3 to #8) were outside this review's scope and remain as recorded there.

## Tests added (red at the old HEAD, green after)

| Test | Red at old HEAD | Green after |
|---|---|---|
| `test/unit/app/managers/test_LicenseAcceptanceManager.py::test_mixed_binds_for_one_agreement_require_submission_acceptance`, both orders. `unmet` and `authorize` are checked from `aa4222d3014`; the `describe` id/binds/accepted assertion was added in `30cba8b5198`, where `describe` first appears. | Failed | Passes |
| `test/integration/test_license_acceptance_workflows.py::test_persistent_acceptance_does_not_satisfy_submission_bound_twin`: a top-level step plus a subworkflow step, both orders. From `2ef6bc86c99`: persistent acceptance alone gets a 403 whose unmet agreement has `id` `license_agreement_path`, `binds` `submission` and 2 steps, and the one-time hash then succeeds. In `abc4fefe43a`, where run-form metadata first appears, it also checks that the run form reports `binds=submission` and `accepted=False`. New fixture: `license_agreement_path_user_tool.xml`. | `('license_agreement_path_user', 'user', True) != ('license_agreement_path', 'submission', False)` | Passes |
| `test_refused_invocation_creates_no_new_history` | `'Refused license run'` history remained | Passes |
| `client/src/components/Tool/ToolLicenseAgreements.test.ts` "keeps element ids unique..." | 3 distinct ids of 9 | Passes |

## Validation at `15d90cd36aa`

The intermediate commits were checked as well:
- Manager unit file at `aa4222d3014`: 15 passed.
- Workflow integration file at `2ef6bc86c99`: 13 passed.
- Manager unit file at `30cba8b5198`: 17 passed.
- New workflow tests at `abc4fefe43a`: 2 passed.

The split rewrote no non-test code. So the mypy, vitest, vue-tsc, API and Playwright results below come from the pre-split head `25f3301cfb0`; only test assertions differ. The workflow integration file was rerun at `15d90cd36aa`.

| Check | Result |
|---|---|
| Python unit tests (the 9 unit test files the branch touches) | 271 passed. The pre-review head `3f3875c6239` gives 270 for the same files, so +1 is the new test. The 299 in rebase_debrief.md does not reproduce for this file set. |
| `make mypy` | Success, no issues in 2582 files |
| black, isort, ruff 0.17.1, flake8 7.4.1 + bugbear, prettier, eslint | Clean |
| vitest (node 22.20.0) over Tool, User/LicenseAgreements, Workflow/Run, WorkflowInvocationState, License, WorkflowNavigationTitle and licenseAgreementAffirmations | 61 files, 302 passed |
| `vue-tsc --noEmit` | Clean |
| Integration `test_license_acceptance_workflows.py` | 15 passed |
| Integration `test_license_acceptance.py` | 15 passed |
| API `test_license_agreements.py` | 18 passed |
| API `test_workflows.py -k "creates_no_history or test_run_batch or missing_tool or batched_parameter or send_to_new_history"` (sanity check for the reorder) | 15 passed |
| Playwright `test_tool_license_agreement.py` | 5 passed |
| Playwright `test_workflow_license_agreement.py` | 7 passed |
| Playwright `test_license_preferences.py` | 3 passed |
| Playwright `test_tool_license_async_failure.py` | 1 passed |

The Playwright files ran one at a time, against this worktree's own Galaxy on port 8097 and Vite on port 5187.

<details>
<summary>Full Codex review (structured findings)</summary>

### [P1] Hash deduplication can discard a submission-bound requirement

`lib/galaxy/managers/license_agreements.py:305` (correctness, confidence certain)

_unique keeps the first declaration for each hash, although the hash excludes binds. Both describe and _resolve deduplicate before checking binding semantics. When a user-bound declaration precedes an otherwise identical submission-bound declaration, persistent acceptance satisfies the surviving declaration: describe returns binds='user', accepted=true, and authorize records only persistent authorization. Tool forms consequently omit the submission affirmation, and job creation permits the run. Reversing the declarations correctly requires one-time acceptance. The existing binding test checks a submission-bound declaration alone, missing this combination.

**Failure scenario:** A profile-27.0 tool declares two agreements with distinct ids, identical affirmation/terms, first binds='user', second binds='submission'. The user persistently accepts the first and submits without one_time_license_acceptances. The manager reports no unmet agreements and the job runs without the required per-submission affirmation.

### [P1] Workflow grouping loses binding requirements from later steps

`lib/galaxy/workflow/license_agreements.py:78` (correctness, confidence certain)

setdefault independently retains the first declaration's binds while grouping every declaring step under its hash. With a user-bound declaration first, workflow discovery reports accepted=true after persistent acceptance, client forms suppress the submission prompt, and the request-time check passes. No one-time acceptance is pinned, so the separate submission-bound tool subsequently fails scheduling with license_not_accepted. This occurs across subworkflows too. Submission-bound first correctly prompts/refuses; explicitly supplying the one-time hash pins it to the declaring invocations. Fixing manager deduplication alone cannot recover the declaration already discarded here.

**Failure scenario:** A workflow contains tool A with binds='user' followed by tool B with identical affirmation/terms and binds='submission', either directly or inside subworkflows. Persistently accept A and invoke without a one-time hash. Discovery says the grouped agreement is accepted and invocation creation succeeds with no pins, but B fails scheduling. Reversing traversal order refuses the invocation immediately.

### [P2] Declaration-based DOM ids make agreement controls ambiguous

`client/src/components/License/LicenseTerms.vue:18` (accessibility, confidence certain)

termsId uses only licenseId, and ToolLicenseAgreements likewise builds affirmation/remember checkbox ids from agreement.id. Declaration ids are not globally unique: distinct workflow agreements can share one, preferences can retain multiple versions under the same id, and multiple component instances repeat them. Expanding two matching LicenseTerms instances produces duplicate region ids and identical aria-controls values, so the second button cannot uniquely reference its own terms. Checkbox ids also collide, although their implicit wrapping labels still work. A component-instance identifier is needed; using the agreement hash alone would still collide across instances.

**Failure scenario:** Accept two different versions of agreement id 'academic', then expand both terms on the preferences page. Both regions have id='license-terms-academic', and both buttons target that id, associating the second control with an ambiguous/wrong region. A workflow containing distinct agreements named 'academic' also renders duplicate checkbox ids. Mounting two agreement components repeats the problem even for the same agreement.

### [P2] License refusal happens after the target history is committed

`lib/galaxy/webapps/galaxy/services/workflows.py:382` (correctness, confidence certain)

invoke_workflow calls build_workflow_run_configs at line 354 before checking licenses. Its _get_target_history helper creates and commits each requested new history. The later license exception cannot roll those commits back, leaving empty histories for refused invocations, including one per expanded batch run. Existing refusal tests supply history_id and therefore miss this side effect.

**Failure scenario:** Invoke a workflow requiring an unaccepted agreement with new_history_name='Refused run' and no one-time acceptance. The API returns 403 and creates no invocation, but an empty 'Refused run' history remains committed. Repeating the refused request creates additional empty histories.

**Coverage notes:** Generated TypeScript schemas, functional tool fixtures/configuration, and error_codes.json were not independently reviewed; review concentrated on their source models and runtime consumers. Some large files were reviewed through changed sections and relevant surrounding code. Standalone backend reproductions confirmed declaration-order behavior and committed history persistence; rendering LicenseTerms confirmed duplicate region ids. Full test suites were not run.

Files reviewed: 97.

</details>
