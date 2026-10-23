# Thermo-nuclear code quality review (re-harden pass 2): licenses

The review ran fresh over `0073b5e9224...fad3634045a`, the whole branch. It weighted the code added since `licenses_alt_original_scope` and the typed `UnmetPrecondition` union. The head is now `190068619fe`. The backup ref `backup/licenses_pre_thermo_2` points to `fad3634045a`. Not pushed.

**Acted on: 2 changes.** Both delete code rather than move it, and both landed in `c92963370d6`, "Enforce tool license agreements on workflow invocations". Edit stops carried them through the conflicts at commit 12 ("Prompt for workflow license agreements…") and commit 14 ("Refresh workflow run forms…"). The branch still has 19 commits with "Baseline tests" first. `git range-diff` maps them 1:1, and only commits 10, 12 and 14 changed. The net tree change is 3 files, +12/-27. No API model changed, so `schema.ts` wasn't regenerated. No security issues were found, so no report was written.

**Not acted on: 9 items**, listed below. Most were already decided in earlier passes, and the expansion doesn't change the case for any of them. The rest are client or schema-layout changes that would be churn without a behaviour gain.

## Changes

1. **`WorkflowLicenseAgreements` and `one_time_by_step()` are deleted** (`lib/galaxy/workflow/license_agreements.py`).
   - The result class held `declared` and `one_time`, and existed only so the service could call `.one_time_by_step()`.
   - Its name nearly collided with the walker's `WorkflowToolLicenseAgreements`, so two dataclasses with a `declared` field sat side by side.
   - `check_workflow_license_agreements` now returns the one-time accepted hashes by declaring step id, the one thing its caller uses. The docstring says so.
   - The service binds that mapping directly. Behaviour is unchanged.
2. **One filter in the `ToolModule.execute` refusal handler** (`lib/galaxy/workflow/modules.py`).
   - The handler used to scan `e.unmet` twice: once with `any(kind == "license_agreement")` to decide whether to re-raise, then again with `isinstance` to collect ids.
   - It now filters once with `isinstance(UnmetLicenseAgreementPrecondition)` and re-raises when nothing matched. With the discriminated union the two tests are equivalent.

## Not acted on

- **The local `Model` in `galaxy/schema/license_agreements.py`.** My recommendation is to keep it.
  - `schema.py`'s `ToolRequestStateMessage.unmet` references `UnmetPrecondition`. That union embeds `ToolLicenseAgreementResponse` and `WorkflowLicenseAgreementResponse`, so `schema.py` has to import the agreement models.
  - Moving the `Unmet*` models into their own module therefore doesn't break the cycle.
  - The only real alternatives are worse. One is moving the five agreement models into the 4.5k-line `schema.py`. The other is a new base module for `Model`, which would be a Galaxy-wide schema refactor.
  - `storage_operations.py` already keeps an identical local `Model`. The duplicate is 2 lines and carries a comment.
- **The duplicated client flow.** The "accept remembered, then submit" sequence is repeated across `ToolForm`, `WorkflowRunForm` and `WorkflowRunFormSimple`, and so is the 403009 refresh handling.
  - Both could fold into `useLicenseAgreementAffirmations`, for example as a `submitWith(submit)` helper.
  - That is a UI change, it would need the full vitest and Playwright reruns, and nothing is broken. Left as a follow-up.
- **The string-versus-raw error emit in the `acceptRemembered` catch** (in both workflow forms). This is a nit with no behavioural difference, since acceptance failures aren't 403009 refusals.
- **The per-step one-time pinning** (`WorkflowRunConfig.one_time_license_acceptances_by_step`, flattened per (sub)workflow in `run_request`).
  - A simpler model would pin the whole validated set on every invocation in the tree. That would delete the by-step mapping and the flattening.
  - Authorization would be unchanged, because a tool only consults its own agreements. But it changes the stored provenance: sub-invocations would carry agreements their own tools don't declare.
  - That is a design call for John, not a cleanup.
- **The `Tool.tests()` assignment of `license_agreement_hashes` after construction.** It could be folded into the dict passed to `ToolTestDescription`, but that is cosmetic.
- **Items carried from earlier passes; the expansion didn't change any of them.**
  - The gxwf `accept_license_agreements` opt-in default.
  - `binds="user"`.
  - `get_accessible_tool` vs `ToolsService._get_tool`, which is still a status-code change for existing endpoints.
  - The ToolCard notice gated on `allowEditingCredentials`.
  - The duplicated pgcleanup CTEs, which follow that file's per-action convention.
  - `self.app.name != "tool_app"`.
  - `_check_preconditions` as a wrapper.
- **`pr_description.md` is still stale** (vault side, as Codex noted). It says profile 26.2+, still lists fixed defects, and still says gxwf has no one-time hashes. Refresh it at hand-off.

## Validation at `190068619fe`

| Check | Result |
|---|---|
| `git rebase -x` over all 19 commits: ruff 0.17.1 check + py_compile on changed .py | all clean |
| Unit tests at commit 10 (`c92963370d6`) and commit 14 (`7e667d251f1`), in temp worktrees: test_modules, walk_tool_steps, preconditions, LicenseAcceptanceManager, plus workflow_license_agreements where present | 112 passed / 115 passed |
| Unit tests at HEAD: 13 branch files plus `test/unit/workflows/test_modules.py` | 369 passed |
| `make mypy` | Success, no issues in 2583 files |
| ruff, black, isort, flake8 + bugbear on the 3 changed files | clean |
| API `test_license_agreements.py` | 18 passed |
| Integration `test_license_acceptance.py` | 18 passed |
| Integration `test_license_acceptance_workflows.py` | 17 passed |
| Framework workflows `-k license_agreements`, `GALAXY_TEST_WORKFLOW_AFTER_RERUN=0` / `=1` | 2 passed / 2 passed |
| File-size loop (dev vs HEAD, every added or modified file) | no file crosses 1000 lines because of this branch |

There were no client changes, so vitest, vue-tsc and E2E weren't run.

<details>
<summary>Full review</summary>

### Structural

**S1. Two workflow agreement result types** (`workflow/license_agreements.py`).
- `WorkflowToolLicenseAgreements` (walker: `declared` and `inaccessible`) and `WorkflowLicenseAgreements` (check: `declared` and `one_time`) shared a name stem and a field. The second was a carrier for one derived value.
- The code judo is to return the derived value and delete the class. **Fixed.**

**S2. Pinning model.** The by-step mapping threads through `WorkflowRunConfig`, and `run_request` then filters it per (sub)workflow level by `step.id`. It is correct and precise. The superset alternative deletes a concept but changes the stored rows (see "Not acted on").

**S3. Layering.** Preconditions are the shared abstraction, used in four places:
- tool execution;
- `validate_tool_for_running`;
- `get_accessible_tool`;
- workflow discovery.

The license code sits behind them: the manager, `tool_util.license_agreements`, `workflow.license_agreements`, and the service and API. No feature checks are scattered through shared paths beyond:
- `Tool.execution_preconditions` / `parse_license_agreements`;
- `ToolExecutionCache.execution_context`;
- the `unmet` key in the failed `ToolRequest` state message.

Each of those is the canonical hook point. `ensure_user_access` was extracted from credentials into `services/base.py`, which is a good reusable abstraction.

### Spaghetti and boundaries

**B1. The `ToolModule.execute` refusal handler scanned twice.** **Fixed.**

**B2. Typed union.** It is clean: `ToolAccessPrecondition` and `LicenseAcceptancePrecondition` build concrete models, and the client narrows on `kind` without casts. Tool and workflow license details are separate models, so the workflow payload has no `tool_id: null`. That is correct.

**B3. Local `Model`.** The cycle is inherent (see "Not acted on"). Keep it.

**B4. `to_json` access gating (from the Codex pass).** It is direct, and it comes with a one-line comment. It uses `allow_user_access` rather than `TOOL_ACCESS_PRECONDITION`, which is fine because no refusal is needed here, only a yes/no.

**B5. Ad-hoc context construction.** `ToolExecutionContext()` is constructed just to call `TOOL_ACCESS_PRECONDITION.unmet` in the walker. The precondition signature requires it, and it's cheap. Acceptable.

### Reuse and legibility

- The `stricter_declaration` aggregation appears in both the walker and the manager's `_unique`. The walker also collects steps, so they aren't duplicates, and `authorize` re-dedupes harmlessly.
- Client: the composable is shared by three forms. The submit choreography duplication is noted above.
- `license_agreement_from_element` formats the pydantic error itself. No canonical Galaxy helper exists, and the only other site, the citations linter, reads `errors()[0]` inline.
- Imports are at module top. TYPE_CHECKING imports are used only for cycles. Comments are short.

### File size

No file crosses 1k lines because of this branch: a loop compared every added or modified file at dev against HEAD. `tools/__init__.py`, `model/__init__.py`, `populators.py` and `workflow/modules.py` were already far over 1k on dev.

### Approval bar

- After these fixes there is no structural regression, no file-size explosion and no scattered feature branching.
- The remaining items are recorded decisions or follow-ups, not blockers:
  - the pinning granularity;
  - the client submit consolidation;
  - the carried `get_accessible_tool` and ToolCard prop items.

</details>
