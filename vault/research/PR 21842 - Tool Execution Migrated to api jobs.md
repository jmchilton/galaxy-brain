---
type: research
subtype: pr
tags:
  - research/pr
  - galaxy/tools
  - galaxy/api
  - galaxy/client
github_pr: 21842
github_repo: galaxyproject/galaxy
component: Tool Form / Tool Request API client
related_prs:
  - 20935
  - 21828
status: draft
created: 2026-04-28
revised: 2026-04-28
revision: 2
ai_generated: true
summary: "Tool form submits via POST /api/jobs with client-side flat-to-nested state, polls tool_requests until terminal"
sources:
  - "https://github.com/galaxyproject/galaxy/pull/21842"
related_notes:
  - "[[Component - API Tests Tools]]"
  - "[[Component - Tool State Specification]]"
  - "[[Component - Tool State Dynamic Models]]"
  - "[[Component - YAML Tool Runtime]]"
  - "[[PR 18641 - Parameter Model Improvements Research]]"
  - "[[PR 18758 - Tool Execution Typing and Decomposition]]"
  - "[[PR 19434 - User Defined Tools]]"
  - "[[PR 20935 - Tool Request API]]"
  - "[[PR 21828 - YAML Tool Hardening and Tool State]]"
---

# PR #21842: Migrate tool execution request from /api/tools to /api/jobs

**Author**: Aysam Guerler ([@guerler](https://github.com/guerler))
**Repo**: galaxyproject/galaxy
**State**: MERGED
**Created**: 2026-02-13
**Labels**: kind/enhancement, area/UI-UX, area/tool-framework

## Summary

Frontend cutover for the new asynchronous tool-execution path introduced in [[PR 20935 - Tool Request API]]. The tool form now submits to canonical `POST /api/jobs` and the legacy `POST /api/tools` call is removed from the client (the server-side endpoint is preserved for back-compat). Form state is reshaped client-side from the flat, pipe-separated structure into the nested `RequestToolState` Pydantic model the backend expects, with type coercion handled in the browser so the request leaves strictly typed. After submit, the client polls `GET /api/tool_requests/{id}/state` until the state leaves `new`, then GETs `/api/tool_requests/{id}` for full detail and `/api/jobs/{job_id}/outputs` to assemble a `JobResponse`-shaped object for the existing success view.

## Changes

### Client — request shaping and submission

- `client/src/components/Form/utilities.js` (+117 in PR; current 442 lines): adds one exported helper `buildNestedState(inputs, formData)` (current line 148) plus four private helpers — `_buildLevel` (line 152, recursion across `repeat`/`conditional`/`section`/leaf), `_convertValue` (line 192, type coercion for integer/float/data_column/boolean/select-multiple), `_convertDataValue` (line 244, batch + multi/single shaping), `_convertDataEntry` (line 260, projects `{src, id, map_over_type?}`). Tested in `utilities.test.js` (current 804 lines).
- `client/src/utils/parseBool.ts` (+14 lines, unchanged from PR): canonical boolean coercion. Sole caller at HEAD is `ToolForm.vue` line 472 (gates `enable_tool_recommendations`).
- `client/src/components/Tool/ToolForm.vue` (~80/~80 in PR; current 506 lines): rewires submission. The submit call site is `submitJobRequest(jobDef)` at **line 444**, with `buildNestedState` building the nested payload at **line 411** and the post-submit chain `waitForToolRequest` -> `buildJobResponse` at lines 446-447.
- `client/src/components/Tool/services.js` (+113 in PR; current 174 lines): `submitJobRequest` (lines 65-73), `waitForToolRequest` (lines 79-111, polls `state !== "new"` then GETs full detail and surfaces `err_msg`/`err_data` on failed), `fetchJobOutputs` (lines 116-124), `buildJobResponse` (lines 131-174, fans out to `/api/datasets/{id}` and `/api/dataset_collections/{hdca_id}` to compose a legacy `JobResponse` shape).
- `client/src/composables/pollUntil.ts` (+30, unchanged): generic `pollUntil({ fn, condition, interval=1000, timeout=600000 })`. Sole caller at HEAD is `services.js`.
- `client/src/api/schema/schema.ts` (auto-generated): picks up `tool_requests` paths and `RequestToolState` shape.
- `client/src/utils/utils.ts`, `client/src/entry/analysis/router.js`: dead-code/route cleanup of legacy-only helpers.

### Backend — feature parity for `/api/jobs` submission

- `lib/galaxy/managers/jobs.py` (+33): tags/email/object-store plumbed at lines 2268-2274 (`preferred_object_store_id`, `apply_tags`, `apply_email_action`).
- `lib/galaxy/webapps/galaxy/services/base.py` (+26): `_encode_tool_request` (line 210), `tool_request_to_model` (line 224), `tool_request_detailed_to_model` (line 235) — round-trip IDs through `RequestInternalToolState` and parameter-bundle-driven `encode_request`/`decode`.
- `lib/galaxy/webapps/galaxy/services/jobs.py` (+10): `JobsService.create` at lines 246-307 — strict-vs-relaxed validation, `decode(...)` ID handling at line 264, persistence of `ToolRequest` and `ToolSourceModel` (note `hash="TODO"` placeholder line 270), `QueueJobs` task enqueue at lines 287-301 carrying `tags`, `data_manager_mode`, `send_email_notification`, `credentials_context`, `preferred_object_store_id`.
- `lib/galaxy/webapps/galaxy/services/tools.py` (-17 net): small janitorial removals around the legacy `_create`. The legacy synchronous path itself (lines 311-376) and `create_fetch` (lines 267-309) are intact.
- `lib/galaxy/tool_util_models/parameters.py` (+36/-10): typing tweaks for the nested request payload.
- `lib/galaxy/tools/__init__.py`, `tools/execute.py`, `managers/hdas.py`, `managers/model_stores.py`, `managers/context.py`, `work/context.py`, `schema/schema.py`, `schema/tasks.py`, `celery/tasks.py`: thread tags / notifications / object-store prefs through the new path.

### Tests

- `client/src/components/Form/utilities.test.js` (+278) — flat-to-nested transformation across parameter shapes.
- `client/src/utils/parseBool.test.ts` (+39).
- `client/src/composables/pollUntil.test.ts` (+78).
- `lib/galaxy_test/api/test_tool_execute.py` (+21) — end-to-end via `/api/jobs`.
- `test/unit/app/tools/test_toolbox.py` (+40).
- `lib/galaxy_test/base/populators.py` (+7) — populator updated for the new request shape.
- `test/unit/tool_util/parameter_specification.yml` (+2/-1).

## Changes since merge

Targeted post-merge follow-ups (against `25c7d09ffb..origin/dev` at SHA `651f9538c7`):

- `15ce210c2f` "Adjust tool form conversion utility" — guerler tweaks `_convertValue` data/data_column/integer/float branches in `utilities.js` (and tests).
- `83ba481ed9` "Pass tool_uuid as proper query parameter instead of reusing URL path id" — mvdbeek, fixes #22260; touches both `services.js` and `ToolForm.vue`.
- `c97d3dec33` "Fix tool name handling" — guerler, +1 to `services/jobs.py` plus parallel changes in `celery/tasks.py`, `schema/tasks.py`, `tools/__init__.py`. Direct follow-up to the new path.
- `6b5255365b` "use `GModal` in tool form" — UI library adoption (ahmedhamidawan).
- `1f561585d0` "Replace underscore usage with native JS and lodash" — touches `utilities.js` among 14 files (dannon).
- `bc7080c38d` "accept 'format' alias on Data/DataCollection parameter models" — alias-only typing change in `tool_util_models/parameters.py`.
- `33f829fb33` "Silence PydanticJsonSchemaWarning on recursive collection element union".

The `managers/jobs.py` changes since merge are all unrelated job-search / job-cache / N+1 fixes; no follow-ups specific to this PR's tags/notifications/object-store wiring.

## File path migration

No files from this PR have moved post-merge.

## Unresolved questions

- Legacy `POST /api/tools` removal — no deprecation marker on the server controller (`lib/galaxy/webapps/galaxy/api/tools.py:898`). Scheduled for a release?
- Polling exit `state !== "new"` — premature for any future intermediate non-terminal state; should it be `state in ("ok", "failed")`?
- `pollInterval`/`timeout` are hard-coded; expose to config or user settings?
- `pollUntil` only used by `services.js`; candidates among other terminal-state polls?
- `ToolSourceModel.hash="TODO"` placeholder in `services/jobs.py:270` — content-addressing follow-up issue?
- Other client callers of bare `POST /api/tools` — none found at HEAD (`api/tools/fetch` and `api/tools/{id}/build` retained, both non-execute paths). Confirm none re-introduced.

## Notes

- This is the **client-side completion** of the request-side typing work tracked in [[PR 20935 - Tool Request API]] and [[PR 21828 - YAML Tool Hardening and Tool State]]. With this merged, every tool submission from the Galaxy UI travels through the `RequestToolState` Pydantic pipeline rather than the legacy pipe-delimited blob.
- Polling exit condition is `state !== "new"`, not strictly terminal — any new intermediate state would be treated as terminal by the current client.
- `pollUntil` lives as a generic composable but currently has a single consumer (`services.js`); the "available for other long-running polls" framing is aspirational, not yet realized.
- The legacy `POST /api/tools` controller is intact at `lib/galaxy/webapps/galaxy/api/tools.py` line 898; the in-tree client no longer calls it but external scripts still can. See [[Component - Tool State Specification]] for the full state-representation pipeline this lands in.
- Form-state transformation lives in `Form/utilities.js`, deliberately separate from `ToolForm.vue` so the shaping logic is unit-testable without mounting the form.
