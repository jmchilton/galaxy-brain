# License agreement branch: implementation review and follow-ups

Reviewed `1eed562dfc29a984c2cbb0d6b1ea11951bb04f6c..4d0583c24ad` (11 commits, 102 files), using `LICENSE_AGREEMENTS_DEBRIEF.md` as context. The base is the merge base with `origin/dev`. This is an implementation review; [DIRECTION.md](DIRECTION.md) addresses whether the feature solves the right problem.

The main execution design is coherent: tools enforce access before license requirements, one-time acceptance names the displayed content, persistent acceptance is an append-only event history, and invocation pins survive delayed scheduling. The branch has substantial useful tests. It nevertheless has one reproduced authorization defect and several follow-ups that should be resolved before presenting this as a complete feature.

**Direction dependency:** settle the rollout scope in [DIRECTION.md](DIRECTION.md) before migrating production wrappers. [Issue #23261](https://github.com/galaxyproject/galaxy/issues/23261) suggests splitting an academic-use **or** purchased-license statement into two agreements. The manager's enforcement is all-of, so that migration would require **both** affirmations. Either start with unconditional agreements whose meaning survives all-of enforcement, or design and test explicit alternatives before supporting that use case. Do not describe splitting an OR statement into two requirements as supported by the current implementation.

## Before merge

### 1. P1 — Preserve binding scope when identical agreements are deduplicated

**Evidence:** `lib/galaxy/tool_util/license_agreements.py:57` hashes only affirmation, schema and terms. `lib/galaxy/managers/license_agreements.py:268` deduplicates before checking `binds`; `_unique` at line 300 retains the first declaration. `lib/galaxy/workflow/license_agreements.py:78` also keeps the first declaration for a hash. The model permits the same displayed text with either `binds="user"` or `binds="submission"`.

**Reproduced:** construct user-bound and submission-bound agreements with identical affirmation and terms, and supply a persistent acceptance for their shared hash. `manager.unmet(user, [user_bound, submission_bound])` returns `[]`; reversing the declarations returns the submission-bound agreement as unmet. The existing tests cover changing a single declaration's binding, but do not cover mixed bindings in the same list.

The isolated reproducer is:

```python
from types import SimpleNamespace

from galaxy.managers.license_agreements import LicenseAcceptanceManager
from galaxy.tool_util.license_agreements import resolve_license_agreement
from galaxy.tool_util_models.tool_source import LicenseAgreement

def resolved(binds):
    return resolve_license_agreement(LicenseAgreement(
        id=binds, version="1", label=binds, affirmation="I accept these terms",
        text="Same terms", binds=binds,
    ), None)

user_bound, submission_bound = resolved("user"), resolved("submission")
manager = LicenseAcceptanceManager(None)
manager.current_state = lambda user: {
    user_bound.agreement_hash: SimpleNamespace(agreement_hash=user_bound.agreement_hash)
}
assert user_bound.agreement_hash == submission_bound.agreement_hash
assert manager.unmet(object(), [user_bound, submission_bound]) == []
assert manager.unmet(object(), [submission_bound, user_bound]) == [submission_bound]
```

Run with `PYTHONPATH=lib .venv/bin/python` from the repository root. The assertions describe the reproduced faulty behavior, rather than the intended regression assertions after fixing it.

**Impact:** one tool declaring both scopes can run solely on persistent acceptance, contrary to its submission-bound requirement. A workflow with those scopes on separate tools can advertise all agreements as accepted and pass request-time validation, then fail when the submission-bound tool is scheduled. Earlier workflow jobs may already have run. Declaration order changes behavior.

**Work:** choose a binding-aware identity or aggregate all declarations with the strictest required scope. Apply the choice consistently to the manager, workflow grouping, response metadata, client prompting, and invocation pinning. If changing the documented canonical hash payload, choose its schema version deliberately rather than silently changing the schema-1 contract. Keep cross-tool reuse for genuinely equivalent requirements.

**Validation:** manager and `describe` tests in both declaration orders; a single tool declaring both scopes; a workflow containing separate user/submission tools in both orders and in subworkflows; assert persistent acceptance alone cannot satisfy the submission-bound requirement and explicit one-time acceptance succeeds. Assert UI never says the workflow is authorized when scheduling will reject it.

### 2. P2 — Make agreement DOM identifiers unique by content and component instance

**Evidence:** `client/src/components/Tool/ToolLicenseAgreements.vue:66` and line 81 derive checkbox IDs from `agreement.id`; `client/src/components/License/LicenseTerms.vue:18` derives the terms region ID from `licenseId`. `LicenseAgreementsManagement.vue` passes the recorded license ID too. Different tools/versions can legitimately reuse an ID for different terms; `test/unit/app/managers/test_LicenseAcceptanceManager.py` explicitly tests this scenario.

**Impact:** a workflow or preferences page showing two distinct agreements with the same declaration ID creates duplicate HTML IDs and ambiguous `aria-controls` targets when terms are expanded. Test selectors also address the wrong occurrence. The checkbox component wraps its input in a label, so this review does **not** claim a proven wrong-checkbox activation bug.

**Work:** use agreement hash plus an instance prefix for control/region IDs, keeping the author-provided ID as display metadata or a diagnostic attribute. Give `LicenseTerms` a separate unique control identity.

**Validation:** mount two agreements with the same declaration ID but different hashes; open both terms and assert every DOM ID is unique and every `aria-controls` points to the intended region. Exercise the preferences case with two accepted versions.

### 3. P2 — Reject or support submission-bound agreements on indirect execution paths

**Status: done in `d102eaa3b62`** (documenting the supported matrix folds into item 4).

- **Data source tools:** `data_source` and `data_source_async` tools declaring agreements fail at load, for every scope. The sync path (`controllers/tool_runner.py` `index` → `handle_input`) had the same gap as the async callback.
- **Converters:** being a converter is set by `datatypes_conf.xml`, not the tool, so they aren't rejected at load. Instead `Registry.get_converters_by_datatype` leaves out converters that declare agreements. Every converter lookup goes through it: implicit conversion, `convert_dataset`, the dataset Convert options, collection conversion and the datatype API. These converters still appear in the Built-in Converters panel section and can be run directly through the tool form, which prompts for acceptance. `/api/datatypes/converters` (`view_converters`) still lists them.
- **Tests:** a registry unit test with stub converters, and tool-load tests for both data source types.
- **Review fixes in `3cd8220bccc`:** every converter registration now clears the lookup cache, so a reload can't keep serving a replaced converter. Licensed converters are dropped before merging, so an inherited converter for the same target still wins. The data source check uses `isinstance(self, DataSourceTool)`.

Original finding:

**Evidence:** loading at `lib/galaxy/tools/__init__.py:1600` rejects actions that skip preconditions, but permits actions that enforce them without carrying submission authorization. `lib/galaxy/webapps/galaxy/controllers/async.py:127` executes a data-source callback without an execution context; `lib/galaxy/datatypes/data.py:902` executes converters without one. The debrief identifies this limitation but leaves the behavior undecided.

**Impact:** a wrapper can pass loading and expose an agreement that users can affirm, yet its callback or implicit conversion cannot carry that affirmation. Submission-bound agreements cannot be satisfied on those paths. User-bound agreements require prior persistent acceptance and may still need useful error handling at the indirect entry point.

**Work:** for the first supported release, either reject these unsupported combinations with a clear load/lint error, or carry trusted authorization across the complete operation. Document the supported matrix. Do not silently weaken submission binding to persistent binding.

**Validation:** one callback and one implicit-converter test for each supported scope; unsupported wrappers should fail at load/lint, or the operation should succeed with the explicitly carried authorization and leave the correct job association.

### 4. P2 — Write author, operator and API documentation for the actual contract

**Status: mostly done in `9d888db3f76`.** `doc/source/dev/tool_license_agreements.md` covers authoring, identity and hashing, `binds`, the all-of (no alternatives) limit, tools that cannot declare agreements, tool tests, an enforcement-point table, workflows, the UI, the discover → accept/submit API flow with error shapes, and operators. `license_agreement` was added to the generated tool XML reference.

Remaining:
- Run the API examples against fixture tools. The current examples are built from the schemas and API tests.
- Release note.
- Update the mixed-binding wording once item 1 is decided. The doc currently says not to mix scopes and that the result is not settled.
- `/api/datatypes/converters` still lists licensed converters. Filter it or document it.
- New, from the doc review (code, not doc): `workflow_license_agreements` (`lib/galaxy/workflow/license_agreements.py`) never checks tool access. The workflow discovery endpoint, the run form payload and the request-time 403 can therefore show the terms of tools the user cannot access, such as admin-only or login-required tools on a published workflow. Filter by `allow_user_access`, or check access first.

Original finding:

**Evidence:** no `license_agreement` or `license_acceptance` documentation exists under `doc/` or `config/`; the change is explained in XSD, fixtures, source comments and the untracked session debrief. `LicenseAgreement.binds` defaults to `submission` at `lib/galaxy/tool_util_models/tool_source.py:169`, and tool loading forces login at `lib/galaxy/tools/__init__.py:1607`.

**Work:** add an authoring example with profile 26.2, packaged `path` terms, inline normalization, the default scope, and persistent opt-in. Explain that IDs/versions/labels/URLs are metadata, what changes re-prompt users, how identical content shares acceptance, and the final mixed-binding policy from item 1. Document all supported execution paths, anonymous behavior, persistent revocation, invocation one-time pinning, and user purge retention. Give API users a discover → display → accept/submit example for tools and workflows, including the asynchronous tool-request failure response. Make the distinction from existing SPDX license metadata explicit. Include a release note.

**Validation:** run documentation/schema checks appropriate to the touched files and execute the documented API examples against fixture tools. Ensure the documentation and [DIRECTION.md](DIRECTION.md) use the same scope and alternatives vocabulary.

## Resolve feature policy, then add focused regression coverage

### 5. P2 — Define the acceptance boundary for reruns, retries and resume

**Evidence:** job creation is enforced in `lib/galaxy/tools/execute.py:350` and `DefaultToolAction.execute`; paused-job resume calls `job.resume()` directly at `lib/galaxy/webapps/galaxy/api/jobs.py:371`. Automatic resubmission reuses the job (`lib/galaxy/jobs/__init__.py:1611`). The debrief's phrase “remap and resubmission don't go through the tool action” is too broad: a new rerun request containing `rerun_remap_job_id` still flows through `JobsService.create` and the execution check.

**Work:** specify whether authorization belongs to the original submitted operation or to each later attempt. A reasonable creation-bound contract lets an already authorized job resume/retry while requiring fresh authorization for a new rerun/remap submission. Align the issue, PR description and tests with the chosen contract; do not add re-prompts merely because a test matrix listed them.

**Validation:** revoke persistent acceptance after initial creation, then test paused resume and automatic retry according to the chosen policy. Separately submit a new rerun/remap with no acceptance and assert refusal; submit with fresh one-time acceptance and assert the new job's association is independent of the old one. Confirm old baked-in wrapper booleans cannot substitute for native authorization.

### 6. P2 — Validate cleanup and migration on PostgreSQL, including both purge modes

**Evidence:** four new tables and constraints are defined in `lib/galaxy/model/migrations/alembic/versions_gxy/01cbf54bb541_add_tool_license_agreement_tables.py`. Both `PurgeDeletedUsers` and `PurgeDeletedUsersGDPR` gain SQL event deletion and unattribution in `scripts/cleanup_datasets/pgcleanup.py:629` and line 797. The new integration test covers the ordinary purge path; the debrief says PostgreSQL validation was skipped locally.

**Work:** run upgrade/downgrade and model/schema consistency checks on supported databases. Run the PostgreSQL cleanup regression and extend it to the GDPR path and an event granted for another user. Treat this as missing validation, not a demonstrated SQL defect.

**Validation:** purge removes the subject's events, clears surviving jobs' event references, retains exact terms/authorization kind, and clears the purged granter's attribution on another user's retained event. The surviving user's acceptance must remain valid.

### 7. P2 — Carry one-time acceptance through workflow test tooling

**Evidence:** tool-framework verification adds license hashes in `lib/galaxy/tool_util/verify/interactor.py`, but the debrief reports that workflow framework/Planemo tests cannot send one-time hashes and no workflow test fixture uses a license tool.

**Work:** extend the workflow test request model and runner to explicitly carry the one-time hashes required by a declared test. Add a minimal workflow test fixture; do not force tests to create permanent user acceptance as a workaround. Coordinate any Planemo-side change with its repository.

**Validation:** a workflow framework test succeeds with explicit one-time authorization, creates no persistent acceptance, and fails when authorization is omitted. Include a nested licensed step if the runner uses a different path for subworkflows.

### 8. P3 — State conditional-step and payload behavior explicitly

**Evidence:** `workflow_license_agreements.py:68` walks every tool step, before evaluating `when`. Tool forms embed all terms at `lib/galaxy/tools/__init__.py:3009`; run-form metadata also embeds workflow terms. These are real current behaviors, already acknowledged in the debrief.

**Work:** document the initial conservative policy that potentially executed steps require acceptance even if a later condition skips them. Add a conditional-step regression asserting the chosen prompt, job association and skip behavior. Measure payload cost with realistic terms and repeated form updates before deciding whether lazy retrieval is needed. Keep lazy retrieval a performance follow-up unless measurements establish a user-visible problem.

**Validation:** a `when=false` workflow behaves as documented; one-time acceptance never becomes persistent. For payload work, record actual response sizes and verify any future lazy fetch still binds acceptance to exactly the displayed hash.

## Validation performed in this review

Ran:

```sh
.venv/bin/python -m pytest -q \
  test/unit/app/managers/test_LicenseAcceptanceManager.py \
  test/unit/app/tools/test_preconditions.py \
  test/unit/tool_util/test_license_agreements.py \
  test/unit/workflows/test_walk_tool_steps.py
```

**85 passed in 44.19 seconds; exit code 0.** There were dependency deprecation warnings and an ignored `mirakuru` atexit cleanup error because the sandbox disallows process enumeration. A separate Python reproducer using the real resolver and manager confirmed item 1; only persistent-state retrieval was stubbed so the check did not depend on a database.

This review did not rerun API/server integration, PostgreSQL migrations/cleanup, or browser suites and does not independently certify the debrief's reported results for those suites. Implementation files were not changed.
