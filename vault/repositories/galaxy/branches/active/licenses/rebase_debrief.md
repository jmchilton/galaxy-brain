# Rebase debrief: licenses onto origin/dev (2026-10-22)

- Old head/base: `b9f94242617` on `1eed562dfc2` (2748 commits behind)
- New head/base: `aff7edb1937` on `origin/dev` `0073b5e9224`
- 15 commits kept 1:1 (`git range-diff` maps every commit). Fixes are squashed into the commits they belong to. Not pushed.
- The untracked DIRECTION/FOLLOW_UPS/LICENSE_AGREEMENTS_DEBRIEF/PR_DESCRIPTION files were deleted from the worktree.

## Conflict resolutions (per file)

- `test/unit/app/tools/test_actions.py` (phase 0): kept dev's `__add_dataset(state, extension)` and added the branch's two require_login precondition tests in front of it.
- `lib/galaxy/tool_util_models/_models.py` (phase 1): import union (`LicenseAgreement` + dev's `MarkdownHelpContent`).
- `test/unit/tool_util/test_tool_linters.py` (phase 1): took dev's rewritten `test_list_linters`, which uses an explicit sorted name set instead of the old count of 161. Added the 5 `LicenseAgreement*` linter names in sorted position.
- `lib/galaxy/managers/users.py` (phase 3): import union. The `purge_user` call still sits after the social_auth cleanup in dev's `purge`.
- `lib/galaxy/tool_util/xsd/galaxy.xsd` (phase 5): took the branch's longer doc text (login, custom actions), with the profile set to 27.0.
- `lib/galaxy/tools/execute.py` (phase 5): import union (dev's `visit_input_values`/`NO_REPLACEMENT` plus the branch's preconditions imports).
- `lib/galaxy/webapps/galaxy/services/jobs.py` (phase 5): kept both. Dev's preferred-object-store validation runs first, then `validate_one_time_hashes`, and both run before any ToolRequest is created.
- `lib/galaxy_test/base/populators.py` (phase 5): `run_tool_raw`-style helper takes both `preferred_object_store_id` (dev) and `one_time_license_acceptances` (branch). Payload typed `dict[str, Any]`.
- `lib/galaxy/workflow/modules.py` (phase 6): import union (preconditions plus dev's `galaxy.tools.runtime.dataset_path`).
- `client/src/components/Workflow/Run/WorkflowRunForm.vue` (7b, fix): dev converted this file from the Options API to `<script setup lang="ts">`. Took dev's file and re-ported the branch's license changes into it:
  - the composable, the `ToolLicenseAgreements` block and the Run disabled/tooltip logic;
  - `one_time_license_acceptances` in `jobDef`, and `acceptRemembered` before the invoke.
  - The fix commit switches the bindings to `v-model:affirmed`/`v-model:remembered`.
- `client/src/components/Tool/ToolForm.vue` (7c): dev's `v-model:show` with the branch's `data-description` attribute.
- `client/src/components/Workflow/Run/WorkflowRun.test.js` (fix): kept dev's imports, `@/api/workflows` mock and "missing tools" describe block. Added the branch's `LICENSE_AGREEMENT` fixture and refused-invocation test.
- `client/src/components/Tool/ToolForm.test.ts` (fix): import union (`useToast` + `useConfigStore`).
- `doc/source/dev/index.rst` (docs): both toctree entries (`tool_state`, `tool_license_agreements`).
- Generated schemas (`client/packages/api-client/src/schema/schema.ts`, `lib/tool_shed/.../schema.ts`):
  - Took dev's version and ran `make update-client-api-schema` in phases 1, 5, 6 and fix.
  - Each regenerated diff matches the original commit's line count (31/31, 34, 31, 138).
  - At phase 4 (API) the auto-merge was already identical to a fresh regeneration.

## Vue 3 port (dev moved to Vue 3.5 + compat)

Merge-clean files still had Vue 2 idioms. Fixed in the commits that introduced them:
- `ToolLicenseAgreements.vue` (7a): `GCheckbox` `:value`/`@input` changed to `:model-value`/`@update:model-value`. Under compat, unchecking emitted nothing, and a test failed.
- `LicenseAgreementsManagement.test.ts` (7a): `findAll().wrappers.map` (VTU1) changed to `findAll().map`.
- `ToolForm.test.ts`, `ToolLicenseAgreements.test.ts` (7a): `setChecked` changed to `setValue`, because it is private in the VTU2 types and vue-tsc failed.
- `ToolForm.vue`, `WorkflowRunFormSimple.vue`, `WorkflowRunForm.vue` (fix): `:affirmed.sync`/`:remembered.sync` changed to `v-model:affirmed`/`v-model:remembered`. `.sync` is removed in Vue 3, and compat warned.
- eslint: attribute order on those three components (fix) and import sort in `WorkflowRunForm.vue` (7b).

## Semantic reconciliations with dev

- No new precondition, credential or access gating abstraction appeared on dev. The `execute.py` changes are output-label state, and `users.py` gained extra preferences and email rules.
  - The phase-0 preconditions extraction auto-merged with dev's tool action changes.
  - Every `ToolAction.execute` override still declares or inherits `checks_preconditions`.
- Dev's object-store id validation (`cc638cddde5`, `90ef0b0382b`, `000233d81eb`) is a 400 parameter check, so it stays a separate path and isn't folded into preconditions.
  - In `JobsService.create` it runs before the one-time-hash check.
  - The precondition check itself is unchanged in `execute.py`: once per submission before outputs, then per job.
- `invoke_workflow`: the license check still runs after `build_workflow_run_configs` and the missing-tools check. Dev's direction is "validate before creating histories" (object-store), but `new_history_name` histories are created inside `build_workflow_run_configs`.
  - So a refused license leaves an empty new history, the same as a missing-tools refusal.
  - Not changed, because moving it would also reorder dev's missing-tools check.
- `WorkflowContentsManager.get_all_tools` keeps the branch's `walk_tool_steps` rewrite, which auto-merged.

## Migration / profile

- Alembic: dev's galaxy-model head is still `64d49ad328d4`, the existing `down_revision`, so no change.
  - A single head was confirmed: `01cbf54bb541` is the only revision with no child.
  - `dbrevisions.py` pins only `"26.2": "64d49ad328d4"` (dev's tag). No test pins the branch's revision.
- Profile: dev is `VERSION_MAJOR = "27.0"` and `release_26.2` is cut, so the gate moved from 26.2 to **27.0** everywhere it is license-related:
  - `LICENSE_AGREEMENT_MIN_PROFILE`, XSD `gxdocs:added` and doc text, the linter message test, the fixture tools' `profile=`, the unit test names/matches (`*_27_0_*`), the docs page and the phase-1 commit message.
  - The low-profile fixture stays at 26.1 (still below the gate). Dev's own `### 26.2` XSD notes are untouched.

## Other fixes

- mypy:
  - Integration test classes declare `dataset_populator: DatasetPopulator`, because dev types the base as Optional (51 union-attr errors).
  - `test_license_agreements.py` uses `parse_xml_string_to_etree`.
- The api-client `dist` was rebuilt locally (gitignored) so vue-tsc sees the regenerated schema.

## Tests (final head)

- Python unit tests (the 9 listed files): **299 passed**
- `make mypy` (`mypy . ../test`): **Success, no issues in 2582 files**
- ruff 0.17.1 / flake8 7.4.1 + bugbear / black / isort on the 63 changed .py files: clean
- Client:
  - vitest, under node 22.20.0, over `components/Tool`, `User/LicenseAgreements`, `Workflow/Run`, `WorkflowInvocationState`, `License`, `WorkflowNavigationTitle` and `licenseAgreementAffirmations`: **45 files, 243 passed**. The 5 core files: 29 passed.
  - `vue-tsc --noEmit`: clean. eslint --quiet and prettier on changed files: clean.
- API `lib/galaxy_test/api/test_license_agreements.py`: **16 passed**
- Integration `test/integration/test_license_acceptance.py`: **15 passed**
- Integration `test/integration/test_license_acceptance_workflows.py`: **13 passed**
- Selenium: not run (later step).

## Unresolved

- The orphan new history on a refused workflow license, noted above. It is consistent with missing-tools; it is a candidate follow-up to move both checks ahead of history creation.
- `earlier_drafts/1/FOLLOW_UPS.md` items are untouched (not regressed, not fixed).
