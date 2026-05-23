---
type: research
subtype: pr
tags:
  - research/pr
  - galaxy/workflows
  - galaxy/api
  - galaxy/collections
  - galaxy/client
  - galaxy/models
github_pr: 22706
github_repo: galaxyproject/galaxy
component: Workflow Extraction
related_prs:
  - 22675
  - 21935
  - 22705
  - 20935
  - 21828
  - 21842
status: revised
created: 2026-05-16
revised: 2026-05-23
revision: 3
ai_generated: true
summary: "ID-based workflow extraction endpoint selecting implicit collection jobs by encoded id instead of HID inference for map-over steps"
sources:
  - "https://github.com/galaxyproject/galaxy/pull/22706"
related_notes:
  - "[[Component - Workflow Extraction]]"
  - "[[Component - Workflow Extraction Models]]"
  - "[[Workflow Extraction Multiple Histories]]"
  - "[[Workflow Extraction Issues]]"
  - "[[Issue 17506 - Convert Workflow Extraction Interface to Vue]]"
  - "[[Plan - Workflow Extraction Vue Conversion]]"
  - "[[Plan - Workflow Extraction Vue Conversion - API]]"
  - "[[Component - Collection Models]]"
  - "[[Component - Collection Tool Execution Semantics]]"
  - "[[PR 20935 - Tool Request API]]"
  - "[[PR 21828 - YAML Tool Hardening and Tool State]]"
  - "[[PR 21842 - Tool Execution Migrated to api jobs]]"
  - "[[PR 18758 - Tool Execution Typing and Decomposition]]"
  - "[[PR 21935 - Workflow Extraction Vue Conversion]]"
  - "[[Component - Workflow Editor Terminals]]"
  - "[[Component - Workflow API]]"
---

# PR #22706: Enhance workflow extraction by IDs with deduplication and UI improvements

**Author**: John Chilton ([@jmchilton](https://github.com/jmchilton))
**Repo**: galaxyproject/galaxy
**State**: MERGED (2026-05-21, merge commit `a4e389f666b14b78fd94e627353399a6bfc9b98b`)
**Created**: 2026-05-16
**Labels**: kind/enhancement, area/workflows, area/histories

Closes #21722. Supersedes and replaces #22675 (closed). Builds on this cycle's #21935. Follow-up #22705 is additive and **not** required for this PR's correctness. Explicitly does **not** fully resolve #21788 / #21789 / #13823 — those need `ToolRequest`-based extraction via [[PR 20935 - Tool Request API]] / [[PR 21828 - YAML Tool Hardening and Tool State]] / [[PR 21842 - Tool Execution Migrated to api jobs]].

## Summary

Adds `POST /api/workflows/extract` — an ID-based, history-optional workflow-extraction endpoint that selects history items, jobs, and **implicit collection jobs (ICJs)** by encoded database id rather than by HID inferred against a single history. This enables cross-history extraction (see [[Workflow Extraction Multiple Histories]]) and removes a class of HID-confusion bugs in the mapped-step case. The unit of selection for a map-over step becomes the **ImplicitCollectionJobs itself** (`implicit_collection_jobs_ids`), not its constituent jobs; a `job_id` that belongs to an ICJ is rejected `400` with a message directing the caller to pass the ICJ id instead.

In direct response to @mvdbeek's review on the superseded #22675, the PR deletes the legacy "reverse-engineer map-over from a job id" inference (representative-job `SELECT`, post-hoc connection-key rewrite, speculative output-drop branch) and replaces it with declarative up-front input wiring. It factors a shared `_connect()` step-wiring helper used by both the HID and ID paths (was byte-identical duplicated logic), and adds two `ImplicitCollectionJobs` model properties (`representative_job`, `output_dataset_collection_instances`) reused by the service validator and the extractor, eliminating raw queries that had been duplicated across two files. The legacy HID `extract_workflow` path is untouched and remains the default for the existing history endpoint.

## Changes

Line numbers verified at `origin/dev` SHA `c1298e37def5a7a19ab153aebb34f4f2e62b9a58` (post-merge re-verification). Original ingest at PR head ref `c2ed13a0ab`; the merged-into-dev locations are within a few lines.

### Backend — new endpoint and service

- `lib/galaxy/webapps/galaxy/api/workflows.py` (+18): `@router.post("/api/workflows/extract", ...)` → `extract_by_ids(self, payload: WorkflowExtractionByIdsPayload, trans) -> WorkflowExtractionResult` at lines 1095-1110, delegating to `self.service.extract_by_ids`. Imports the new payload/result models at lines 91-92.
- `lib/galaxy/webapps/galaxy/services/workflows.py` (+106 -1): the legacy HID path moves here as `extract_from_history(trans, history, payload)` (lines 212-231); the new `extract_by_ids(trans, payload)` (lines 233-253) calls `_validate_extract_by_ids_payload` (lines 255-300) then `extract_workflow_by_ids`. The validator consolidates **all four** id-list dedup checks in one loop over `("job_ids","implicit_collection_jobs_ids","hda_ids","hdca_ids")` (lines 265-268); rejects a `job_id` that belongs to an ICJ via `job.implicit_collection_jobs_association` with a `RequestParameterInvalidException` (→ HTTP 400) naming the owning ICJ (lines 278-286); and validates ICJ existence, `populated_state == OK`, non-empty outputs, and per-HDCA accessibility (lines 282-297) — the last is how "ICJ + one of its member jobs in the same payload" and inaccessible cases are caught.
- `lib/galaxy/webapps/galaxy/api/histories.py` (+3 -14): drops the inline `from galaxy.workflow.extract import extract_workflow`; `extract_workflow_from_history` (lines 888-904) now just delegates to `workflows_service.extract_from_history`.
- `lib/galaxy/webapps/galaxy/services/histories.py` (+26): `extraction_summary` eagerly resolves ICJ metadata (`selectinload` over `ImplicitCollectionJobsJobAssociation` → `implicit_collection_jobs` → `jobs`) and populates `implicit_collection_jobs_id` / `implicit_collection_jobs_size` on summary jobs — this powers the new Vue badge.

### Backend — extraction engine rewrite

- `lib/galaxy/workflow/extract.py` (+338 -73): factors `_connect(step, input_name, source)` (line 67, "Shared by both extraction paths") and `_finalize_workflow(...)` (lines 101-127) out of the previously duplicated wiring/finalize logic; the HID path now calls shared `_connect()` at lines 208/236 with semantics unchanged (still keyed by `hid`). New `extract_workflow_by_ids(...)` (lines 514-532) and `extract_steps_by_ids(...)` (lines 550-672) build an `id_to_output_pair: dict[IdKey, (WorkflowStep, str)]`; plain jobs become `(job, [])`, ICJs become `(icj.representative_job, icj.output_dataset_collection_instances)`, work items are sorted by `job.id` (submission order = dependency order), and mapped inputs are wired **up-front** from `implicit_input_collections` (`output_hdcas[0].implicit_input_collections` at line 654 — no `find_implicit_input_collection` post-hoc rewrite on the ID path). `step_inputs_by_id(trans, job)` (lines 674-700) pulls collection/DCE inputs straight off `Job.input_dataset_collections` / `input_dataset_collection_elements`, avoiding the HID path's flatten-HDCA-to-leaf-HDAs behavior. A FIXME at line 627 isolates the one remaining representative-job param read as the last HID-style inference, to be swapped for a `Job.tool_state` / `ToolRequest.request_state` reader once that exists (see [[PR 18758 - Tool Execution Typing and Decomposition]]).
- `lib/galaxy/model/__init__.py` (+28 -0): two net-new properties on `class ImplicitCollectionJobs` (class at line 2928) — `representative_job` (line 2965, lowest-order constituent job, ordered by association `order_index` then `Job.id` for determinism) and `output_dataset_collection_instances` (line 2982, HDCAs produced by this implicit map). (A same-named `Mapped[list[JobToOutputDatasetCollectionAssociation]]` relationship exists on the unrelated `Job` class at line 1659 — preexisting, no shadowing.)
- `lib/galaxy/schema/workflows.py` (+64): `WorkflowExtractionByIdsPayload` at line 463 with `job_ids` / `hda_ids` / `hdca_ids` / `implicit_collection_jobs_ids` (all `list[DecodedDatabaseIdField]`), `dataset_names`, `dataset_collection_names`, and an `_at_least_one_input` model validator. `WorkflowExtractionJob` (line 349) gains `implicit_collection_jobs_id` / `implicit_collection_jobs_size`; `InvalidWorkflowExtractionJobReason` enum (line 342) includes the "mapped jobs must go via implicit_collection_jobs_ids" guidance (line 401). The legacy HID-keyed `WorkflowExtractionPayload` is unchanged.

### Client

- `client/src/api/histories.ts` (+3 -9): drops `submitWorkflowExtraction` (POST `/api/histories/{id}/extract_workflow`); adds `extractWorkflowByIds` → POST `/api/workflows/extract`.
- `client/src/components/History/WorkflowExtractionForm.vue` (+86 -40): splits a `submitting` ref from `loading` so a failed submit no longer wipes the user's selections; `selectedJobBuckets` collapses mapped cards to a deduped ICJ id (client-side `seen_icj` Set) while non-mapped stay as `job_ids`; inputs keyed by encoded id, not hid; create button shows a spinner / "Creating…" while submitting; emits `data-icj-id` / `data-step-kind` Selenium hooks.
- `client/src/components/History/WorkflowExtraction/WorkflowExtractionCard.vue` (+23 -4): adds a `mappedBadge` factory at line 45 with label literal `` `Mapped over ${size} items` `` (line 48), pushed at line 113 when `isMappedTool(job)`. (PR body attributes the badge to `WorkflowExtractionForm.vue` at the feature level, but the label string lives in Card.vue; Form.vue only computes `stepKind` and emits the data attributes.)
- `client/src/components/History/WorkflowExtraction/types.ts` (+19 -4): adds `WorkflowExtractionRow` union and `isMappedTool` guard; tightens `isWorkflowExtractionInput` to explicit `input_dataset` / `input_collection`.
- `client/src/api/schema/schema.ts` (+116, autogenerated) and `client/src/utils/navigation/navigation.yml` (+6 -3): new path/operation schema and `mapped_tool_card` / `card_by_icj_id` / `mapped_badge` selectors.

### Tests

- `lib/galaxy_test/api/test_workflow_extraction.py` (+563 -66): `TestWorkflowExtractionByIdsApi` — mapping, reduction, subcollection mapping, copied/cross-history (pre- and post-copy) inputs, cached cross-history jobs, roundtrip, input-order equivalence, and rejection cases (mapped-job-in-`job_ids`, mixed ICJ + member, duplicate ids, inaccessible/nonexistent HDA/HDCA/ICJ, empty payload). `_ExtractionHelpersMixin._icj_id_for_job_in_history` is the body-noted O(collections) trawl that #22705 would collapse.
- `client/src/components/History/WorkflowExtractionForm.test.ts` (+112 -31): bucketing, ICJ dedup, mixed plain/mapped, error-keeps-list, submitting-state suites.
- `lib/galaxy_test/selenium/test_workflow_extraction.py` (+6): asserts the mapped-card badge / `data-icj-id` / `data-step-kind` contract on a list:paired mapped flow.

## Branch history

Merged 2026-05-21 as `a4e389f6`. No follow-up commits have touched any of the PR's load-bearing files between merge and `origin/dev@c1298e37` (re-verified 2026-05-23). The eight intervening dev commits are unrelated (paginate-toolform-build #22643, History Graph wire-shape refactor #22732, ChatGXY→GalaxyAI rebrand, OpenAPI client repackaging #79f4800d which regenerates `schema.ts` wholesale but is not a semantic change). The seven-commit branch narrative pre-squash is itself the design story:

1. `6c1dc1a962` "Allow extracting workflows by ID instead HID." — initial extract-by-ids that **mirrored the legacy inference** (a `seen_icj_ids` dedup loop, representative-job `SELECT`, and a `from_history_id` payload field). This is the design @mvdbeek flagged on #22675.
2. `818afc71b8` — API test consolidation only.
3. `987c799331` "Address PR 22675 review feedback" — rewrites the implicit-map comment to state design intent, adds `test_subcollection_mapping_by_ids`, lifts shared test helpers into `_ExtractionHelpersMixin`.
4. `152e0af44d` "ICJ-native payload + UI polish" — the pivotal redesign: **removes `seen_icj_ids`** and the post-hoc rewrite, adds `implicit_collection_jobs_ids` + validator + the mapped-job/ICJ+member rejections + the ICJ extractor branch, plus the badge and loading/submitting split.
5. `2af2f51759` "Rebuild schema." — regenerate `schema.ts`, non-functional.
6. `86382b93a0` — type the Vue test fixtures, drop `as unknown as` casts (test-only hygiene).
7. `c2ed13a0ab` (HEAD) "dedup with HID path, reuse ICJ model abstractions, drop unused from_history_id" — the abstraction-reuse pass: extracts shared `_connect()`, adds the two `ImplicitCollectionJobs` model properties and makes validator + extractor reuse them, consolidates the four dedup checks, and **deletes `from_history_id`**.

The two later commits revise the first: commit 4 removed `seen_icj_ids` (introduced in commit 1), commit 7 removed `from_history_id` (introduced in commit 1). All seven were squashed into the merge commit.

## File path migration

No file-path migrations. All 16 touched paths exist at `origin/dev@c1298e37`. The legacy extraction *callsite* moved from an inline call in `api/histories.py` to `services/workflows.py::extract_from_history`, but no file was renamed or moved.

## Cross-checks

Body claims verified against `origin/dev@c1298e37` (post-merge):

- `_connect()` shared helper — **confirmed**, defined `extract.py:67`, called by the HID path (`:208`) and the ID path (`:661`).
- `ImplicitCollectionJobs.representative_job` / `.output_dataset_collection_instances` — **confirmed** net-new properties (`model/__init__.py:2965`, `:2982`).
- 400 rejection for a job in an ICJ — **confirmed** (`services/workflows.py:278-286`).
- Four-field dedup consolidated into the validator, FIXME-isolated representative-job read, non-mapped paired-DCE collapse via `first_dataset_instance()` — all **confirmed**.
- ⚠️ **`seen_icj_ids` / `from_history_id` "removed" is a within-branch removal, not a dev↔PR deletion.** Both symbols are absent from *both* the PR head ref and `origin/dev`: they were introduced in the PR's own first commit and removed in commits 4 and 7. The body's "Why (response to #22675)" framing is internally accurate (it removed inference that #22675 carried), but a reader diffing dev↔PR will find these symbols in neither tree. The client-side `seen_icj` Set added in `WorkflowExtractionForm.vue` is a different concept (UI-side ICJ-id dedup before POST), not the removed backend loop.

## Unresolved questions

- #21788 / #21789 / #13823 root causes deferred — need `ToolRequest`-based extraction (PRs 20935 / 21828 / 21842); this PR removes HID inference for mapped steps but does not resolve them.
- Non-mapped paired-DCE-as-data-param still collapses via `first_dataset_instance()` (preexisting on both paths) — accepted limitation.
- The FIXME-marked representative-job param read (`extract.py:620`) is the last HID-style inference; load-bearing for every mapped step but only indirectly tested.
- Two extraction code paths now coexist (legacy HID default for the history endpoint; new ID path) — consolidation plan?
- `_icj_id_for_job_in_history` test trawl is O(collections) and fragile; ID-path test correctness depends on it until #22705 lands (additive, non-blocking).
- The Selenium assertion is the only end-to-end check of the badge / `data-icj-id` / `data-step-kind` contract — thin vs. the API surface.

## Notes

- This is the API-and-engine half of the workflow-extraction modernization tracked by [[Issue 17506 - Convert Workflow Extraction Interface to Vue]] and the [[Plan - Workflow Extraction Vue Conversion]] / [[Plan - Workflow Extraction Vue Conversion - API]] specs; it directly advances [[Workflow Extraction Multiple Histories]] (cross-history, ID-keyed selection) and chips at [[Workflow Extraction Issues]].
- The conceptual shift: a map-over step's unit of selection is the **ImplicitCollectionJobs** (the map), not a representative job — see [[Component - Collection Tool Execution Semantics]] for why treating the map as the unit is the right abstraction, and [[Component - Workflow Extraction Models]] for the ORM ancestry traversal this rewires.
- The remaining representative-job param read is deliberately isolated and FIXME-marked so the future swap to `ToolRequest` / `Job.tool_state` ([[PR 20935 - Tool Request API]], [[PR 21828 - YAML Tool Hardening and Tool State]], [[PR 21842 - Tool Execution Migrated to api jobs]]) is a localized change, not a path-wide rewrite.
- Authored by the galaxy-brain user. Merged 2026-05-21 as `a4e389f6`; re-verified against `origin/dev@c1298e37` on 2026-05-23 with no post-merge bug-fix or follow-up commits against any of the PR's contributions.
