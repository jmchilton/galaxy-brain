Run via claude-opus-5-5 at medium effort.

**Recommendation: modest expansion (S2).** Keep `d4a265d39c3` as is. It is byte-identical to `c076821e882`. Add a second commit that renames the discriminator `kind` to `src` on `OutputLabelHint` and `StepLabelHint`, and mirror it in `extract_next_followups`. They are the only other wire names in this area that are new in 26.2, and both break Galaxy's `(src, id)` convention, so they get the same "fix it while it's free" treatment as the route. Leave internal Python and client function names alone, since nothing freezes them at 26.2.0. If John won't take the mirror cost on the parent's rebase (see S2), stay as implemented (S1). Either way, decide before 26.2.0.

The diff has about 21 lines of non-generated code, so no decomposition section.

## What freezes at 26.2.0

| Name | Introduced | Wire? | Status |
|---|---|---|---|
| `GET /api/histories/{id}/extraction_summary` | 26.1 | yes | frozen; the target pattern |
| `GET /api/pages/{id}/workflow_extraction_summary` → `extraction_summary` | 26.2 | yes | renamed by this branch |
| `WorkflowExtractionByIdsPayload.report_title` | 26.2 | yes | dropped by this branch |
| `WorkflowExtractionByIdsPayload.output_labels`, `step_labels`, `from_page_id` | 26.2 | yes | names fine (`from_page_id` matches the older `from_history_id`) |
| `OutputLabelHint.kind` (`hda`/`hdca`), `StepLabelHint.kind` (`job`/`implicit_collection_jobs`) | 26.2 | yes | **only outlier**: S2 |
| `WorkflowExtractionResult.report_warnings`; summary-row `seeded`, `seed_warning`, `output_name`, `suggested_name`, `suggested_name_source`, `exposed` | 26.2 | yes | names fine; additions are safe after release anyway |
| `referenced_by_report` (parent branch only) | not shipped | yes | additive, so no deadline |
| `PagesService.get_workflow_extraction_summary`, `HistoriesService.create_workflow_extraction_summary` (26.1), `managers/workflow_extraction_summary.py` | 26.1/26.2 | no | internal, not frozen |
| client `fetchWorkflowExtractionSummary` (26.2), `extractWorkflowFromHistory` (26.1, misnamed) | 26.1/26.2 | no | internal, not frozen |

The only new pages route since 26.1 is `extraction_summary`. Nothing in `lib`, `client/src`, `test` or `doc` still uses the old route string or `report_title`. The FastAPI operationId follows the renamed handler (`extraction_summary_api_pages__id__extraction_summary_get`), and that is already in the regenerated `schema.ts`.

## S1: As implemented

Rename the pages route to `/extraction_summary` to match histories, and drop the unused `report_title` (the report title is now always the workflow name). One commit, byte-identical to `c076821e882`.

| Pros | Cons |
|---|---|
| - Smallest change that settles both of the parent's E5 items<br>- Byte-identity holds, so the parent's rebase drops it cleanly<br>- Easy for a release-branch reviewer: one route, one field, regenerated schema | - Leaves the `kind`/`src` mismatch on the label hints, which freezes at 26.2.0<br>- A later rename means deprecating a field rather than just renaming it |

## S2: S1 plus `kind` → `src` on the label hints (recommended)

Second commit: `OutputLabelHint.kind` → `src` (`"hda" | "hdca"`) and `StepLabelHint.kind` → `src` (`"job" | "implicit_collection_jobs"`), with matching updates to the server consumers, the client form, the tests and `schema.ts`. Mirror it in `extract_next_followups`.

| Pros | Cons |
|---|---|
| - Same rationale John already accepted for the route: match house naming while it's still free<br>- Galaxy's `(src, id)` pairs are consistent: 52 `src:` fields in `lib/galaxy/schema`, including `DataItemSourceType`, `invocation.py`, `jobs.py`, and `history_graph.NodeRef` (which was deliberately switched to `(src, id)`); these two hints are the only `kind:` discriminators in the schema package<br>- Small: 2 model fields, 2 server readers (`services/workflows.py:507`, `workflow/extract.py:~883`), about 5 client sites (`WorkflowExtractionForm.vue:218,240,242` and its tests), about 23 dicts in `test_workflow_extraction.py`, plus regenerated `schema.ts` | - **Can't be byte-identical to a parent commit as the branches stand.** The parent's `7dd3f9c161f` (before `c076821e882`) already changed the line to `kind: ContentKind`, so a `src` commit written against `release_26.2` won't match the parent's version and the parent's rebase won't drop it<br>- `src: "implicit_collection_jobs"` isn't in `DataItemSourceType`, so the convention match is about the key, not the vocabulary<br>- The client still maps `history_content_type` (`dataset`/`dataset_collection`) to `hda`/`hdca`. Renaming the key doesn't remove that translation |

<details>

**Handling the mirror.** There are two options; this choice is John's, and either way the parent's history gets rewritten (`rebase -i` is already approved there).

1. In the parent, move the `src` rename to just after `c076821e882`, write it against `release_26.2` wording (`kind: Literal[...]` → `src: Literal[...]`), and cherry-pick it here. `7dd3f9c161f` then conflicts when it replays: it has to become `src: ContentKind`, and its internal `ContentRef`/`.kind` readers need the new name. The patch-ids match, so the parent's rebase drops both commits after this branch merges.
2. Write the commit here against `release_26.2`. Write a separate commit in the parent against `kind: ContentKind`. On the parent's rebase after this merges, resolve one small conflict by hand rather than relying on an automatic drop.

Option 1 keeps the "rebase drops it" property. Option 2 avoids reordering now but leaves a manual step later. `ContentKind` itself is an internal type alias and can keep its name either way.

If John prefers `kind` (for example, because `hda_ids`/`hdca_ids` on the same payload already name the values), S1 is the right call, and nothing else in the area needs renaming.

</details>

## S3: S2 plus internal name tidy-up

Rename `PagesService.get_workflow_extraction_summary` → `extraction_summary`, the client `fetchWorkflowExtractionSummary` → `fetchPageExtractionSummary`, and perhaps `extractWorkflowFromHistory` → `fetchHistoryExtractionSummary` (26.1) and the `workflow_extraction_summary.py` module.

| Pros | Cons |
|---|---|
| - Internal names would match the route names | - None of these are wire names, so there is no 26.2.0 deadline, which is the only reason this branch exists<br>- More lines to mirror in the parent (the client form and its tests mock `fetchWorkflowExtractionSummary`)<br>- The history and page names already match the services that own them (`create_*`/`get_*` on separate services)<br>- Better as part of the parent or a later `dev` cleanup |

## S4: Contract to the route rename only (keep `report_title`)

Drop the `report_title` removal and ship only the route rename.

| Pros | Cons |
|---|---|
| - Keeps a possibly useful API knob | - The client never sends it. Once it ships it has to be supported, and the parent's E5 decision was to drop it<br>- Breaks byte-identity with `c076821e882` |
