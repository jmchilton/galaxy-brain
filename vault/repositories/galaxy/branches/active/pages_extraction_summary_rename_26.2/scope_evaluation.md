Run via claude-opus-5-5 at medium effort.

**Recommendation: keep as implemented (S1). No further expansion is needed.** After the two commits, every extraction wire name that is new in 26.2 follows house conventions. The pages route is `/extraction_summary`, matching histories, `report_title` is gone, and the label hints use `(src, id)`. The other new names (`from_page_id`, `output_labels`, `step_labels`, `report_warnings`, `seeded`, `seed_warning`, `exposed`, `output_name`, `suggested_name`, `suggested_name_source`) look fine and are additive. The remaining `kind` spellings (`OutputLabelKind`, `kind`/`content_kind` params in `workflow/extract.py`) and the client `fetchWorkflowExtractionSummary` are internal, so nothing freezes them at 26.2.0. The open cost is still cross-branch, not scope: `extract_next_followups` has to absorb commit 2 against its `7dd3f9c161f` (`kind: ContentKind`) on rebase.

About 53 lines of non-generated code (the rest is `schema.ts`), so there is no decomposition section. The two commits are already the natural split: commit 1 (patch-id `91a170ff`, identical to `c076821e882`) and commit 2 (`kind`→`src`).

## Wire-name audit vs `origin/release_26.1`

| Name | New in 26.2? | Status after branch |
|---|---|---|
| `GET /api/pages/{id}/extraction_summary` | yes (only new pages/extraction path) | matches histories route |
| `WorkflowExtractionByIdsPayload.report_title` | yes | dropped |
| `OutputLabelHint.src` (`hda`/`hdca`), `StepLabelHint.src` (`job`/`implicit_collection_jobs`) | yes (both models new) | renamed from `kind` |
| `WorkflowExtractionByIdsPayload.from_page_id`, `output_labels`, `step_labels` | yes | fine (`from_page_id` mirrors `from_history_id`) |
| `WorkflowExtractionResult.report_warnings` | yes | fine |
| Summary `seeded`, `seed_warning`; output `exposed`, `output_name`, `suggested_name`, `suggested_name_source` | yes | fine; values `renamed`/`rendered_label`/`bare_label`/`port_name` are descriptive |
| `OutputLabelKind`, `kind`/`content_kind` params in `workflow/extract.py`, `PagesService.get_workflow_extraction_summary`, client `fetchWorkflowExtractionSummary` | n/a | internal, not frozen |

## S1: As implemented (recommended)

Commit 1: route rename and `report_title` drop, byte-identical to `c076821e882`. Commit 2: `kind`→`src` on both label hints, plus server readers, client form, tests and regenerated schema.

| Pros | Cons |
|---|---|
| - Closes every new-in-26.2 naming outlier before the freeze<br>- Commit 1 keeps its patch-id, so the parent's rebase drops it<br>- Small, mechanical, and easy for a release reviewer | - Commit 2 has no parent twin, so `extract_next_followups` must hand-resolve against `7dd3f9c161f` on rebase<br>- The client still maps `history_content_type` to `hda`/`hdca` (unchanged by design) |

## S0: Contract to original scope

Revert to `pages_extraction_summary_rename_26.2_alt_original_scope` (commit 1 only).

| Pros | Cons |
|---|---|
| - No cross-branch conflict work | - Ships `kind` as a 26.2 wire name, against the `(src, id)` convention John already approved fixing<br>- Undoes approved, reviewed work |

## S2: S1 plus internal `kind`→`src` tidy-up

Rename `OutputLabelKind` and the `kind`/`content_kind` params in `workflow/extract.py` (`output_label_to_id_key`, `content_label_arg`, `step_for_content`, `normalize_output_label_key`), and optionally `fetchWorkflowExtractionSummary`/`get_workflow_extraction_summary`.

| Pros | Cons |
|---|---|
| - Internal names would match the wire field | - Not wire names, so no 26.2.0 deadline, which is this branch's only reason to exist<br>- Enlarges the conflict surface with the parent, which reworks `extract.py` (`ContentKind`/`ContentRef`)<br>- Better done in the parent or a later `dev` cleanup |

## S3: Align `src` value vocabulary

Change `implicit_collection_jobs` to some existing `src` vocabulary value, or make the hints share `DataItemSourceType`.

| Pros | Cons |
|---|---|
| - Tighter convention match | - No precedent to align to: `implicit_collection_jobs` appears as a `src`/discriminator value only here, and `DataItemSourceType` covers data items, not jobs<br>- `hda`/`hdca`/`job` already match Galaxy usage<br>- Churn without a clear target |

<details>

Checks run: path and component diffs of `client/packages/api-client/src/schema/schema.ts` between `origin/release_26.1` and HEAD. The new extraction-related components are only `OutputLabelHint` and `StepLabelHint`. The only new extraction path is `/api/pages/{id}/extraction_summary`. `git patch-id --stable` gives the same value for `d4a265d39c3` and `c076821e882`. Any concurrent cleanup commit was ignored, as instructed.

</details>
