# Thermo-nuclear code quality review: licenses

The review ran against `origin/dev` `0073b5e9224`. The head went from `15d90cd36aa` to `98ed9b8ee36`; the backup ref `backup/licenses_pre_thermo` points to the old head. Not pushed.

**Acted on: 6 changes.** The largest gives the unmet-agreement error one contract. The others move license logic into the context and the tool loader, delete dead indirection, and tighten one type. Each landed in the commit that introduced the code. The branch still has 16 commits with "Baseline tests" first, and `git range-diff` maps them 1:1 (commits 3, 6, 7, 8, 10, 12 and 16 changed). Net change: 11 files, +57/-67. No security issues were found, so no report was written.

**Not acted on: 9 items**, listed below. Most are API-contract changes or open design questions, not cleanups.

## Changes

1. **One shape for unmet license agreement details** (commit 12, "Refresh workflow run forms…"). This is the one change visible through the API, and it is deliberate. It only adds fields, but tool 403 bodies and a failed `ToolRequest.state_message` now carry `terms` and `accepted`. Veto it if that payload is unwanted.
   - Before, tool refusals built `details.agreements` with a bespoke `license_agreement_details` dict that had no `terms` and no `accepted`. Workflow refusals dumped the typed `describe()` records. The same field had two contracts.
   - Now both call `LicenseAcceptanceManager.describe`, and `license_agreement_details` is deleted.
   - The invariant: each entry is exactly what `GET …/license_agreements` returns, and workflows add `steps`.
   - The client cast in `unmetPreconditionsFromError` now uses the generated `ToolLicenseAgreement` type instead of an ad-hoc `{label: string}`.
   - The docs and the commit message were updated to match.
   - New stricter assertion: `test_tool_execution_blocked_without_license_acceptance` now checks `[agreement] == GET tool license_agreements`. It fails on the old code and passes on the new.
2. **The authorization cache lives on `ToolExecutionContext`** (commit 7).
   - `DefaultToolAction._handle_license_acceptances` used to reach through the `LICENSE_ACCEPTANCE_PRECONDITION` singleton just to use its cache.
   - The cache is now `context.license_authorization(trans, tool)`, which both the precondition and the job association call. The precondition's `authorization` method is gone, and `actions/` no longer imports the singleton.
3. **The license branching is out of `Tool.parse`** (commits 3, 6, 7, 13, 14).
   - That branching covered the profile check, rejecting a tool action that skips preconditions, rejecting DataSourceTool, forcing require_login, and skipping resolution under remote evaluation.
   - It is now `Tool.parse_license_agreements(tool_source)`, next to `parse_inputs` and `parse_outputs`.
   - Edit stops kept each commit's own version of the block.
4. `execute.py`: `getattr(tool_action, "checks_preconditions", False)` is now plain attribute access, since the `ToolAction` base defines it (commit 7).
5. The linter reuses `normalize_newlines`, formerly the private `_normalize_newlines` in `tool_util/license_agreements.py`, instead of a copy of it (commit 3).
6. Smaller cleanups:
   - `one_time_by_step()` is computed once, outside the run-config loop (commit 8).
   - The `jobDef: Record<string, unknown>` annotation in `WorkflowRunForm.vue` is removed, and the field is inline, the same way `ToolForm` does it (commit 10).

## Not acted on

- **Typed per-kind `UnmetPrecondition.details`.** It would remove the dict digging in `ToolModule.execute` and the client cast. But it changes the API schema from phase 0 onward and needs `schema.ts` regenerated in several commits. Change 1 already gives the field a single shape.
- **`get_accessible_tool` vs `ToolsService._get_tool` / `_get_materialized_tool`.** These are near-duplicates. Merging them would change existing endpoints from 401 `AuthenticationFailed` to the structured 403. It is already tabled in the follow-ups (credentials adoption).
- **The `ToolCard` notice is gated on `allowEditingCredentials`.** Only the workflow editor's `FormTool` passes that prop, so it really means "editor context". The clean fix is a context prop on ToolCard, which is broader than this review.
- **`self.app.name != "tool_app"`.** There is no existing predicate for remote evaluation, and other loader code already compares `app.name`. It is now contained in `parse_license_agreements`.
- **`_handle_license_acceptances` as a generic precondition "record on job" hook.** Only one precondition records anything, so a hook would be speculative.
- **`DefaultToolAction._check_preconditions`, a one-line wrapper.** It renames dev's protected `_check_access`, which subclasses could override. Inlining it would also cascade conflicts through phases 0 and 5.
- **The duplicated CTEs in `PurgeDeletedUsers` and `PurgeDeletedUsersGDPR` (pgcleanup).** They follow the file's existing per-action convention.
- **Converter filtering in the registry, and the `__init_subclass__` fail-closed rule.** The first is tied to the open "reject at load" question. The second is deliberate safety.
- **The sequential `acceptRemembered` POSTs.** They are deterministic and do not change partial-failure behaviour, so this was left as is.

## Validation at `98ed9b8ee36`

| Check | Result |
|---|---|
| Python unit tests (the 9 branch files) | 271 passed |
| Intermediate commits | commit 3: 195 passed (license, loading and linter files); commit 7: 55 passed; commit 12: 49 passed |
| `make mypy` | Success, no issues in 2582 files |
| ruff 0.17.1, black, isort, flake8 7.4.1 + bugbear on changed .py files | clean |
| vitest (node pinned in `.node_version`) over Tool, User/LicenseAgreements, Workflow/Run, WorkflowInvocationState, License, WorkflowNavigationTitle, licenseAgreementAffirmations | 61 files, 302 passed |
| `vue-tsc --noEmit`; eslint/prettier on changed client files | clean |
| API `test_license_agreements.py` | 18 passed |
| Integration `test_license_acceptance.py` | 15 passed (strengthened test also red on old code) |
| Integration `test_license_acceptance_workflows.py` | 15 passed |
| Playwright `test_tool_license_async_failure.py` | 1 passed |
| Playwright `test_workflow_license_agreement.py` (includes the refused-submission test) | 7 passed |
| Playwright `test_tool_license_agreement.py` | 5 passed |

The Playwright runs (headless) covered the refusal payload and the `jobDef` change. Each file ran on its own against this worktree's own Galaxy on :8097, which used `sample_tool_conf.xml` and a fresh sqlite DB under `database/license_e2e_thermo/`, through Vite on :5187. Each test registered a fresh user. `test_license_preferences.py` was not rerun because nothing it exercises changed.

<details>
<summary>Full review</summary>

### Structural

**S1. Two contracts for `details.agreements`** (`tools/preconditions.py`, `workflow/license_agreements.py`).
- Tool refusals built a hand-rolled dict: id, version, label, url, affirmation, binds, hash.
- Workflow refusals dumped `WorkflowLicenseAgreementResponse`, which adds terms, accepted and steps.
- Consumers (`ToolModule.execute`, `unmetPreconditionsFromError`) read this one field, and its shape depended on which path raised. `license_agreement_details` was left with a single caller after commit 12 moved the workflow path to `describe`.
- The code judo is to use `describe()` everywhere and delete the helper. The error then equals the discovery endpoint's record. **Fixed.**
- One cost: terms now appear in tool 403 bodies and in a failed `ToolRequest.state_message`. That matches what workflow refusals already did.

**S2. A singleton used as a cache accessor** (`tools/actions/__init__.py`).
- `_handle_license_acceptances` called `LICENSE_ACCEPTANCE_PRECONDITION.authorization(trans, tool, ctx)`. The precondition object held no state; the cache lived on the context.
- The behaviour belongs to the object that owns the state, so it is now `ToolExecutionContext.license_authorization`. **Fixed.**

**S3. Feature branching in the busy `Tool.parse`.**
- The license gating added 20 lines of special cases into the middle of the requirements and credentials parsing.
- It now lives in `Tool.parse_license_agreements`, which follows the existing `parse_*` decomposition. **Fixed.**

### Spaghetti and boundaries

**B1. Untyped `UnmetPrecondition.details: dict[str, Any]`.**
- `ToolModule.execute` digs into `unmet.details["agreements"][i]["id"]`, and the client casts.
- A discriminated per-kind model would make both direct. **Not acted on:** it is a schema change from phase 0.

**B2. `getattr(tool_action, "checks_preconditions", False)`.** This is defensive access to an attribute the base class declares. **Fixed.**

**B3. `jobDef: Record<string, unknown>`.** The annotation loosened the payload type just to append one key after the literal. **Fixed.**

**B4. `get_accessible_tool` duplicates `ToolsService._get_materialized_tool`.**
- The new helper is stricter: an exact version match and the structured 403.
- **Not acted on:** existing endpoints would change their status codes, and this is already a tabled follow-up.

**B5. ToolCard gates the license notice on `allowEditingCredentials`.** A credentials flag works as a proxy for "editor context". **Not acted on** (see the list above).

### Reuse and legibility

**R1. The linter re-implemented newline normalization.** Fixed by reusing `normalize_newlines`. The pydantic validator in `tool_util_models` cannot import `tool_util`, so its copy stays.

**R2. `one_time_by_step()` was recomputed for each run config.** Fixed.

**R3. `_check_preconditions`, a thin wrapper.** Kept, for the reasons above.

### File size

No file crosses 1k lines because of this branch: a loop compared every changed file at dev against HEAD. The large files involved (`tools/__init__.py`, `model/__init__.py`, `navigates_galaxy.py`) were already over 1k on dev.

### Approval bar

- After these fixes: no structural regression, no file-size explosion and no canonical-helper duplication. One exception remains, `get_accessible_tool`, which is justified and tabled.
- What remains is the untyped `details` (B1) and the ToolCard prop coupling (B5). Both are recorded follow-ups, not blockers.

</details>
