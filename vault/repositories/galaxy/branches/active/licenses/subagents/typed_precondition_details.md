# Typed precondition details + missing-tools API test

**Top-line.** Both requested changes landed and the branch keeps its 18 commits on `0073b5e9224`; the new head is `29171b3c054` (backup: `backup/licenses_pre_typed_details` = `270dafaf60c`). Change A: `UnmetPrecondition.details` is now typed per kind, using a `kind`-discriminated union, and each kind is introduced in the commit that introduces it. The final API payload is unchanged. The client cast and the dict digging in `ToolModule.execute` are both gone. Change B: `test_run_with_missing_tool_creates_no_history` is in commit 4. It fails at commit 3 on the no-new-history assertion and passes at commit 4. Nothing pushed, nothing committed in the vault.

## New types (final head, `galaxy.schema.schema`)

- `UnmetPreconditionBase(Model)`: `message`, `remedy_route: str | None = None`.
- `UnmetAccessPrecondition`: `kind: Literal["access"]`, `details: UnmetAccessPreconditionDetails` (`tool_id`).
- `UnmetLicenseAgreementPrecondition`: `kind: Literal["license_agreement"]`, `details: UnmetToolLicenseAgreementDetails | UnmetWorkflowLicenseAgreementDetails`.
  - Tool refusal: `tool_id`, `tool_version`, `agreements: list[ToolLicenseAgreementResponse]`.
  - Workflow refusal: `agreements: list[WorkflowLicenseAgreementResponse]` (each entry carries `steps`).
- `UnmetPrecondition = TypeAliasType("UnmetPrecondition", Annotated[Access | License, Field(discriminator="kind")])`. This follows the `InvocationMessageResponseUnion` pattern, so schema.ts still has a named `components["schemas"]["UnmetPrecondition"]`, now a union of the two kinds.
- Tool and workflow license refusals share one `kind`, so they're two separate details models rather than one model with optional `tool_id`. A single model would have added `tool_id: null` to workflow refusals.

**Import cycle.** schema.py now imports `ToolLicenseAgreementResponse` and `WorkflowLicenseAgreementResponse` from `galaxy.schema.license_agreements`. That module used to import `Model` from schema.py, so it now defines a local `Model` with the identical `ConfigDict`, plus a one-line comment saying why. Precedent: `storage_operations.py` keeps a local `Model`, and agents/tours use `BaseModel`. I checked both import orders in fresh interpreters.

**Decision for John:** the local `Model` duplicates `schema.Model`'s config. The alternative is to move the agreement response models (`LicenseAgreementTermsResponse`, `ToolLicenseAgreementResponse`, `LicenseAgreementDeclaringStep`, `WorkflowLicenseAgreementResponse`, `AgreementHashField`) into schema.py and re-export them. That keeps one `Model` but grows schema.py and rewrites the API commit.

## Per-commit changes

- **2, Extract tool execution preconditions**
  - Adds the base, `UnmetAccessPrecondition` and its details model, with `UnmetPrecondition: TypeAlias = UnmetAccessPrecondition` (only one kind exists yet).
  - `ToolAccessPrecondition` builds the typed model.
  - `test_preconditions.py`: the `AlwaysUnmet` stub and `test_api_error_dict_includes_unmet` construct the concrete class with typed details. The exact-dict payload assertion is unchanged.
  - No schema.ts change: nothing in the API references the model yet. I regenerated to confirm.
- **4, Check workflow tools are installed**: adds the Change B test.
- **Enforce on job creation**
  - Adds `UnmetLicenseAgreementPrecondition` with an interim `UnmetLicenseAgreement` (id, version, label, binds, agreement_hash), matching that commit's dict exactly.
  - Adds `UnmetToolLicenseAgreementDetails` and the discriminated `TypeAliasType` union.
  - Regenerated schema.ts.
- **Enforce on workflow invocations**
  - The interim agreement model gains `url` and `affirmation`. Adds `UnmetLicenseAgreementStep`, `UnmetWorkflowLicenseAgreement` and `UnmetWorkflowLicenseAgreementDetails`.
  - `license_agreement_details()` returns the typed model.
  - `ToolModule.execute` narrows with `isinstance(unmet, UnmetLicenseAgreementPrecondition)` and reads `unmet.details.agreements` / `agreement.id` instead of using dict keys.
  - Regenerated schema.ts.
- **Prompt for workflow license agreements in the run forms**: the conflict was resolved by making `_declaring_steps` return `UnmetLicenseAgreementStep`, which `describe` dumps. No model change.
- **Show refused license agreement submissions in the tool form**: the client `unmetLicenseAgreementLabels` drops the `details?.agreements as {label}[]` cast. It now uses kind narrowing: `flatMap(p => p.kind === "license_agreement" ? p.details.agreements : [])`.
- **Refresh workflow run forms**
  - Deletes the interim agreement and step models. Details now use `ToolLicenseAgreementResponse` / `WorkflowLicenseAgreementResponse` directly.
  - The tool precondition passes `describe(...)` as `agreements`, and the workflow check passes `_describe(...)`.
  - Adds the local `Model` in `schema/license_agreements.py`.
  - Client: `unmetPreconditionsFromError` keeps the cast-free narrowing (the `ToolLicenseAgreement[]` cast is gone).
  - Regenerated schema.ts.
- The tool shed `schema.ts` is unaffected in every commit.
- Commit messages are unchanged; they stay accurate.

## Payload changes

The final head has none. `model_dump()` gives the same keys and values as before:
- Access: `{tool_id}`.
- Tool license: `{tool_id, tool_version, agreements:[ToolLicenseAgreementResponse]}`.
- Workflow license: `{agreements:[... + steps]}`.
- `remedy_route: null` is still emitted on every kind.

Intermediate license commits now serialize typed models with the same keys as their former dicts.

Two schema-level changes, not on the wire:
- `details` is now required. Before, it was `dict = {}` with a default.
- GET `/api/tool_requests/{id}` now validates the stored `state_message.unmet` against the union. The async-failure round-trip is covered by integration `test_license_acceptance.py` (passed). In a manual check, a ToolRequestStateMessage round-trip resolved each dict to the right details class.

## Change B red-to-green

Test: `TestWorkflowsApi::test_run_with_missing_tool_creates_no_history`.
- Fixture: `test_workflow_missing_tool` with real hda inputs for both data steps, so commit 3 gets past `build_workflow_run_configs` and the red is real.
- Asserts:
  - a 400 status;
  - the error contains "the following required tools are not installed: cat_missing_tool";
  - no invocations;
  - no history with the `new_history_name` prefix.

Results:
- **Red, commit 3** (`05dd33b458a`, temp worktree with the commit-4 test file): 1 failed at `test_workflows.py:7475`, which is the history assertion. The error was `AssertionError: assert not [{'model_class': 'History', ... 'name': 'missing tool history 453c...'}]`. The message and invocation assertions passed.
- **Green, commit 4** (`898cdbc4ab4`, temp worktree): 1 passed. It also passes at head.
- **Red, simulated**: also red when the pre-check `build_workflow_run_configs` call is temporarily reinserted at HEAD.

## Validation (head `29171b3c054`)

| Check | Result |
|---|---|
| `git rebase -x` on every commit: ruff 0.17.1 + py_compile on changed .py; `make update-client-api-schema` and `git diff --exit-code` on both schema.ts files for commits touching schema/api/tool_util_models | all 18 clean, and SHAs unchanged by the exec pass |
| Unit tests: the 9 branch files plus `test/unit/workflows/test_modules.py` | 360 passed (the 9 files account for 271, as before) |
| Intermediate unit runs | commit 2: 31 passed; job-creation commit: 40; workflow commit: 102; refresh commit: 119 |
| `make mypy` | Success, no issues in 2582 files |
| ruff, black, isort, flake8 + bugbear on changed .py | clean |
| vitest (pinned node) over Tool, User/LicenseAgreements, Workflow/Run, WorkflowInvocationState, License, WorkflowNavigationTitle, licenseAgreementAffirmations | 61 files, 302 passed |
| `vue-tsc --noEmit` (also at the two client commits) | clean |
| eslint / prettier on `licenseAgreements.ts` | clean; only the existing `error: any` warning |
| API `test_license_agreements.py` | 18 passed |
| API `test_workflows.py -k creates_no_history` | 7 passed (the new test plus the existing no-history ones) |
| Integration `test_license_acceptance.py` | 15 passed |
| Integration `test_license_acceptance_workflows.py` | 15 passed |
| Playwright (headless), own Galaxy on :8097 with `sample_tool_conf.xml`, fresh sqlite DB in `database/license_e2e_typed/`, Vite on :5187, one file at a time | async_failure 1, tool_license_agreement 5, workflow_license_agreement 7, license_preferences 3: all passed |

Notes:
- The Playwright Galaxy ran with celery off, so the async tool-request refusal path is covered by the integration test, not the E2E run.
- `-> UnmetPrecondition | None` with a `TypeAliasType` checked on Python 3.10 and 3.12 (pinned typing_extensions 4.16.0, pydantic 2.14.1): annotations evaluate, and a discriminated list validates. The venv is 3.14, which evaluates annotations lazily, so local runs alone would not have shown this.
- During the first autosquash, `origin/dev` had moved to `51e0a80a0db` (one doc commit). I moved the branch back onto `0073b5e9224` and used that explicit base for every later rebase.
