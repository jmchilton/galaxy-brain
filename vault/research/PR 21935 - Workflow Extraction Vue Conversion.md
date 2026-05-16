---
type: research
subtype: pr
tags:
  - research/pr
  - galaxy/workflows
  - galaxy/client
  - galaxy/api
  - galaxy/models
github_pr: 21935
github_repo: galaxyproject/galaxy
component: Workflow Extraction
related_prs:
  - 22706
status: draft
created: 2026-05-16
revised: 2026-05-16
revision: 1
ai_generated: true
summary: "Mako to Vue conversion of workflow extraction UI with new HID-keyed FastAPI extraction summary and extract workflow endpoints replacing legacy controller"
sources:
  - "https://github.com/galaxyproject/galaxy/pull/21935"
related_notes:
  - "[[Issue 17506 - Convert Workflow Extraction Interface to Vue]]"
  - "[[PR 22706 - Workflow Extraction by IDs]]"
  - "[[Component - Workflow Extraction]]"
  - "[[Component - Workflow Extraction Models]]"
  - "[[Workflow Extraction Multiple Histories]]"
  - "[[Workflow Extraction Issues]]"
  - "[[Plan - Workflow Extraction Vue Conversion]]"
  - "[[Plan - Workflow Extraction Vue Conversion - API]]"
  - "[[Component - Workflow API]]"
  - "[[Component - Workflow Editor Terminals]]"
  - "[[Component - Collection Models]]"
  - "[[Component - Collection Tool Execution Semantics]]"
---

# PR #21935: Convert workflow extraction interface to Vue

**Author**: Ahmed Hamid Awan ([@ahmedhamidawan](https://github.com/ahmedhamidawan)) — implementation plan by [@jmchilton](https://github.com/jmchilton)
**Repo**: galaxyproject/galaxy
**State**: MERGED 2026-03-27 (merge `ff944254b43c477e52455f71b099b65d5610c1d9`)
**Created**: 2026-02-25
**Labels**: area/UI-UX, kind/feature, highlight, release-testing-26.1

Fixes [[Issue 17506 - Convert Workflow Extraction Interface to Vue]] — the parent issue ("the last non-data-display Mako in Galaxy"). Direct follow-up is [[PR 22706 - Workflow Extraction by IDs]] (OPEN/unmerged), which "builds on this cycle's #21935": #21935 is the foundational **HID-based** Vue conversion; #22706 is the later **ID/ICJ-native** endpoint. #22706's `POST /api/workflows/extract` is **not** part of this PR.

## Summary

Deletes the Mako-based legacy history→workflow extraction UI (`templates/build_from_current_history.mako`, −178) and the legacy `WorkflowController.build_from_current_history` web-controller handler (`controllers/workflow.py`, −58, plus its now-dead imports). Replaces them with **two new FastAPI endpoints on `FastAPIHistories`** — `GET /api/histories/{history_id}/extraction_summary` (returns a Pydantic-typed `WorkflowExtractionSummary` of jobs/inputs) and `POST /api/histories/{history_id}/extract_workflow` (consumes the **HID-keyed** `WorkflowExtractionPayload`, returns `WorkflowExtractionResult`) — feeding a new SPA route `/histories/{history_id}/extract_workflow` rendered by `WorkflowExtractionForm.vue` plus `WorkflowExtractionCard.vue` / `WorkflowExtractionMessages.vue`. Introduces a reusable `Common/RenameModal.vue` that replaces the deleted `Workflow/List/WorkflowRename.vue`, rewrites `History/Content/GenericItem.vue` from Options API to `<script setup>` with `useIntersectionObserver` lazy provider rendering, and removes the legacy navigation plugin. Also a one-line, body-unmentioned **bug fix** in `workflow/extract.py`: `dataset_collection_names` was hard-coded `None`, silently dropping caller-supplied collection input names. The payload being HID-keyed and the endpoint history-scoped makes this design inherently single-history — the limitation [[PR 22706 - Workflow Extraction by IDs]] and [[Workflow Extraction Multiple Histories]] later address.

## Changes

Line numbers verified at `origin/dev` SHA `78fc4a33` (the merge is an ancestor; nothing from this PR is superseded in dev — see below).

### Backend

- `lib/galaxy/schema/workflows.py` (+142): five new Pydantic models — `WorkflowExtractionOutput` (line 307), `WorkflowExtractionJob` (line 340; `step_type: Literal["tool","input_dataset","input_collection"]`, `checked`, `tool_version_warning`), `WorkflowExtractionSummary` (line 383; `history_id`, `warnings`, `jobs`), `WorkflowExtractionPayload` (line 401; `job_ids: list[DecodedDatabaseIdField]`, **`dataset_hids: list[int]`**, **`dataset_collection_hids: list[int]`**, names — no model validator), `WorkflowExtractionResult` (line 434; new workflow `id`).
- `lib/galaxy/webapps/galaxy/api/histories.py` (+54): top-of-module `from galaxy.workflow.extract import extract_workflow`; `extraction_summary` `@router.get("/api/histories/{history_id}/extraction_summary")` (def line 862) → `service.create_workflow_extraction_summary`; `extract_workflow_from_history` `@router.post("/api/histories/{history_id}/extract_workflow")` (def line 879) maps `payload.dataset_hids → extract_workflow(dataset_ids=...)`, returns `WorkflowExtractionResult`.
- `lib/galaxy/webapps/galaxy/services/histories.py` (+103): `HistoriesService.create_workflow_extraction_summary(history_id, trans)` (def line 802) wraps `summarize(trans, history)`; classifies fake jobs (`is_fake`) as input steps (`id=None`), real jobs via `toolbox.get_tool`, demotes `not tool.is_workflow_compatible` to input (line 852), sets `tool_version_warning` on version mismatch, `checked = any(not data.deleted ...)`.
- `lib/galaxy/workflow/extract.py` (+1/−1): inside `extract_workflow()`, the delegating call's `dataset_collection_names=None` → `dataset_collection_names=dataset_collection_names` (dev line 74). A real bug fix — collection input names were being dropped; the PR body does not mention it.
- `lib/galaxy/webapps/galaxy/buildapp.py` (+1): `add_client_route("/histories/{history_id}/extract_workflow")` (dev line 276) so SPA deep links resolve.
- `lib/galaxy/webapps/galaxy/controllers/workflow.py` (−58): removes `@web.expose build_from_current_history` + dead `Optional`/`GalaxyWebTransaction`/`extract_workflow`/`summarize` imports.
- `lib/galaxy/selenium/navigates_galaxy.py` (−1): drops `switch_to_main_panel()` in `navigate_to_workflow_extraction()` (Vue page renders in the SPA router, not the legacy main-panel iframe).
- `templates/build_from_current_history.mako` (−178): the entire legacy server-rendered form, deleted.

### New Vue extraction UI

- `client/src/components/History/WorkflowExtractionForm.vue` (+329, new) — **top-level `History/`, not the `WorkflowExtraction/` subdir**. `<script setup lang="ts">`, prop `historyId`; computeds `selectedJobIds` (dev line 86), `selectedInputs`, `submissionDisabled`; `submitWorkflow()` (dev line 210) builds the HID payload (`dataset_hids` at line 224) → `submitWorkflowExtraction(historyId, payload)`. Selenium hooks `data-description="workflow-extraction-form"`, `data-step-type`, `data-job-id`.
- `client/src/components/History/WorkflowExtraction/WorkflowExtractionCard.vue` (+126, new): `GCard` with badges from `STEP_TYPE_META`, "View Job" / "Different Tool Version" badges, renders one `GenericHistoryItem` per output, emits `rename`/`select`.
- `client/src/components/History/WorkflowExtraction/WorkflowExtractionMessages.vue` (+60, new): static guidance + warnings as a dismissible `BAlert` that demotes to a `BPopover`.
- `client/src/components/History/WorkflowExtraction/types.ts` (+13, new): `WorkflowExtractionInput` (job + `newName`); `isWorkflowExtractionInput` = `step_type.startsWith("input")`.
- `client/src/components/History/HistoryOptions.vue` (+1/−3) and `client/src/entry/analysis/router.js` (+6): rewire the "Extract Workflow" option to the new SPA route `histories/:historyId/extract_workflow`.

### Shared components

- `client/src/components/Common/RenameModal.vue` (+85, new): generic rename modal — props `name`, `itemType`, `renameAction`; wraps `GModal` + `GFormInput`, success/error toasts. Replaces `client/src/components/Workflow/List/WorkflowRename.vue` (−63, deleted); `WorkflowCardList.vue` (+4/−2) re-imports the shared one with `rename-action` calling `updateWorkflow`.
- `client/src/components/Common/GCard.vue` (+14): `dimWhenUnselected` prop (saturate/opacity dim). `Common/GTable.vue` (+8/−1): `selectCheckboxTitle` prop. `BaseComponents/GModal.vue` (+3): `onMounted` calls `showModal()` if `show` is already true.

### Client API / selenium / plugins

- `client/src/api/histories.ts` (+42): re-exports the four schema types; `extractWorkflowFromHistory` (dev line 309, `GET .../extraction_summary`) and `submitWorkflowExtraction` (dev line 323, `POST .../extract_workflow`).
- `client/src/api/datasets.ts` (+3/−2): `fetchDatasetDetails` gains an optional `AbortSignal` to cancel per-output fetches when cards unmount.
- `client/src/api/schema/schema.ts` (+279, autogenerated); `client/src/utils/navigation/navigation.yml` (+9/−17) + `schema.ts` (+12): swap Mako-era selectors for the Vue set (`tool_card = [data-step-type="tool"]`, `card_checkbox_by_job_id`, etc.).
- `client/src/components/plugins/index.js` (−5) + `client/src/components/plugins/legacyNavigation.js` (−42, deleted): remove the legacy navigation mixin.
- `client/src/components/History/Content/GenericItem.vue` (+118/−129): Options→`<script setup lang="ts">` rewrite adding `useIntersectionObserver` lazy provider rendering. **Load-bearing** — the extraction card list mounts a `GenericHistoryItem` per output, so deferred provider resolution is what keeps a many-job summary viable. `JobParameters.test.ts` (+13/−18) is collateral of this refactor (stub now `generichistoryitem-stub` with `item-id`/`item-src`).

## Changes since merge

`git log ff944254..origin/dev` per file: **nothing from this PR is superseded in dev.**

- `WorkflowExtractionForm.vue`, `WorkflowExtractionCard.vue`, `WorkflowExtractionMessages.vue`, `WorkflowExtraction/types.ts`, `Common/RenameModal.vue` — **zero post-merge commits**, byte-identical to merge. (Confirms [[PR 22706 - Workflow Extraction by IDs]], which rewrites all of these, is OPEN/unmerged and absent from dev — dev `navigation.yml` lines 1066–1076 are exactly the #21935 selector set, no `mapped_*`/`card_by_icj_id`.)
- `extract.py` — three follow-ups (`b50938e3cf` LDDA-leaf NoneType guard for #22359 in `WorkflowSummary`; `345efca3e5` mypy assert; `cd4f4686a8` release merge), none touching `extract_workflow()`'s signature or the `dataset_collection_names` fix.
- `schema/workflows.py` — unrelated invocation-param validation commits; the five `WorkflowExtraction*` models unchanged (lines 307/340/383/401/434).
- `services/histories.py` — 11 follow-ups (history-graph endpoint, `.model_dump()`, manager shims); `create_workflow_extraction_summary` itself unchanged (moved to line 802 only by preceding insertions).
- `api/histories.py` — 4 follow-ups, neither extraction endpoint touched (dev lines 862/879).
- `test_workflow_extraction.py` — `a7d122afd9` gxformat2 0.26.0 fixture syntax bump, not the new summary test class. `api/histories.ts` — `cacef72a70` modernized an unrelated fn.

The HID-keyed `WorkflowExtractionPayload` and both endpoints still exist unchanged at dev. Per #22706's body the legacy HID path is intentionally kept as the default for the history endpoint even after #22706 lands, so this PR's contribution remains the production path.

## File path migration

No migrations — all 31 non-deleted touched paths exist at their PR-era paths at dev SHA. Notably `WorkflowExtractionForm.vue` stays at top-level `History/` (not the `WorkflowExtraction/` subdir, which holds only Card/Messages/types). The 4 deletions (`build_from_current_history.mako`, `Workflow/List/WorkflowRename.vue`, `plugins/legacyNavigation.js`, the `controllers/workflow.py` method) are expected-absent, not migrations.

## Cross-checks

- Mako deletion (−178), legacy controller handler deletion (−58) — **confirmed** absent at dev.
- Two **distinct** routes: `GET .../extraction_summary` and `POST .../extract_workflow` — **confirmed** (api/histories.py:862/879). The PR body is correct; an earlier framing of this as a single `extract_workflow` GET/POST route was inaccurate.
- `WorkflowExtractionPayload` HID-keyed (`dataset_hids`/`dataset_collection_hids: list[int]`) — **confirmed** (schema lines 412/417).
- `extract.py` +1/−1 is a substantive bug fix (`dataset_collection_names=None` → caller value), **not** cosmetic — body omits it (noted gap).
- `RenameModal.vue` replacing `WorkflowRename.vue`, `legacyNavigation.js` removal, `buildapp.py` route (dev line 276) — all **confirmed**. No body↔diff contradictions.

## Unresolved questions

- HID/single-history limitation is by design here (`dataset_hids: list[int]`, `/api/histories/{id}/...`) — no cross-history copied-dataset support. Deprecate the HID path once [[PR 22706 - Workflow Extraction by IDs]] lands, or keep as default indefinitely (its body says keep)?
- No API test of `POST .../extract_workflow` in the +90 (only the GET summary is API-tested); POST correctness rides on the Selenium rewrite + pre-existing `extract_workflow`/`summarize` coverage — thin for mapped/implicit-collection steps.
- Behavior change: the Vue form blocks empty-step submission (create disabled) whereas the old Mako form allowed an inputs-only workflow — confirm no downstream reliance on the old behavior.
- `GenericItem.vue` rewrite is load-bearing (lazy providers), not cosmetic — changed test-facing stub shape.

## Tests

- `lib/galaxy_test/api/test_workflow_extraction.py` (+90): new `TestWorkflowExtractionSummaryApi` — `test_extraction_summary_empty_history`, `_input_datasets_from_upload`, `_input_collection`, `_tool_step` (`@skip_without_tool("cat1")`), `_structure`. Summary endpoint only.
- `client/src/components/History/WorkflowExtractionForm.test.ts` (+267): loading, empty-history, with-jobs, submission-validation, input-renaming, submission suites (calls `submitWorkflowExtraction`).
- `client/src/components/Common/RenameModal.test.ts` (+90) and `Workflow/List/WorkflowCardList.test.ts` (+71): rename-flow incl. a shared-modal name-bleed regression guard.
- `client/src/components/JobParameters/JobParameters.test.ts` (+13/−18): adjusted to the `GenericItem.vue` refactor (collateral, not a feature test).
- `lib/galaxy_test/selenium/test_workflow_extraction.py` (+52/−54): rewrites the suite from the Mako page to the Vue form; asserts `no_workflow_message` for empty history and the create button `aria-disabled` when no steps selected.

## Notes

- This is the **HID-era foundation** of the workflow-extraction modernization tracked by [[Issue 17506 - Convert Workflow Extraction Interface to Vue]] and the [[Plan - Workflow Extraction Vue Conversion]] / [[Plan - Workflow Extraction Vue Conversion - API]] specs. It delivers the Vue UI + typed FastAPI surface; [[PR 22706 - Workflow Extraction by IDs]] then swaps the HID-keyed payload for encoded-id/ICJ-native selection without changing the UI's overall shape.
- The summary endpoint wraps the existing `summarize`/`WorkflowSummary` ancestry traversal documented in [[Component - Workflow Extraction Models]]; the design problem this PR's HID payload leaves open is detailed in [[Workflow Extraction Multiple Histories]] and [[Workflow Extraction Issues]].
- Extraction endpoints live on the **histories** controller (`FastAPIHistories`), not the workflows controller — see [[Component - Workflow API]] for the sibling workflow surface; [[PR 22706 - Workflow Extraction by IDs]] adds the parallel `POST /api/workflows/extract`.
