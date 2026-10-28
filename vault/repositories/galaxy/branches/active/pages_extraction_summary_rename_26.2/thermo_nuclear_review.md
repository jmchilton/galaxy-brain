Run via claude-opus-5-5 at medium effort.

Verdict: approve. This is a small, mechanical rename with no structural regressions. I fixed one item. Dropping `report_title` left `_build_report_config(title: str | None)` with optionality that no caller uses, because the only caller now always passes the required `workflow_name: str`. I tightened the parameter to `title: str` in a new commit, `9425d5e862b`, on top of the branch. Commits 1 and 2 are untouched, and commit 1's patch-id still matches `c076821e882`. The label API tests passed (21), and mypy on the file shows the same 18 pre-existing errors with and without the change.

Not acted on:
- **Service method names** (`PagesService.get_workflow_extraction_summary` and `HistoriesService.create_workflow_extraction_summary`): these are internal and pre-existing, and the diff didn't touch them. Only the wire route and the handler needed to match the histories route.
- **The client function name `fetchWorkflowExtractionSummary`:** it is internal, and it reads fine for a client fetch.
- **`OutputLabelKind` and the helper `kind` params in `extract.py`:** these are internal. They were already deferred in [subagents/rescope_review.md](subagents/rescope_review.md).
- **Duplicated `Literal["hda", "hdca"]` vs `OutputLabelKind`:** already deferred in rescope_review. Fixing it would mean moving the alias into the schema module.

<details>
<summary>Full review</summary>

**Scope.** Two commits against `origin/release_26.2`, touching 10 files (+130/−140). Most of the change is the generated `schema.ts` and test payloads.

**Structural / code-judo.** I found no code-judo move. The diff is a pure rename, plus one deleted field and the fallback that went with it. Deleting `report_title` is the simplifying move here: it removes an optional payload field and the `or` fallback at the call site. Its one leftover was the `str | None` annotation on `_build_report_config.title`. That is optionality the rest of the code no longer uses, and it hides the real contract, which is that the title is always the workflow name. **Fixed** (`9425d5e862b`).

I also considered dropping `title` from the partial entirely and deriving it inside `extract_workflow_by_ids` from `workflow_name`. That would move report knowledge into the generic extraction layer, which is the wrong direction, so I rejected it.

**Spaghetti / branching.** The diff adds no branches. In `extract_steps_by_ids` the `src == "job"` dispatch and in `_validate_step_labels` the `src == "job"` dispatch are both pre-existing; only the attribute was renamed.

**Boundary / types.** `src` follows Galaxy's `(src, id)` convention. The `title="Source"` matches the dominant convention in `lib/galaxy/schema` (9 uses of `"Source"` vs 4 of `"src"`). The `Literal` types are kept, with no casts or `any`. The client builds `OutputLabelHint`/`StepLabelHint` from the generated schema types (`client/src/api/histories.ts`), so the rename is type-checked end to end.

**Consistency.** The route `/api/pages/{id}/extraction_summary` and the handler `extraction_summary` now mirror `/api/histories/{history_id}/extraction_summary` exactly. I found no stale `workflow_extraction_summary` or `report_title` references in `lib/`, `client/src`, or the api-client. The only matches are the internal service method names, which I didn't act on (see above).

**File size.** No file crosses 1k lines because of this diff. `extract.py` was already 1131 lines on the base, and the diff's line changes there net to zero.

**Legibility.** In `extract_steps_by_ids` the local rename (`kind` to `src`, `normalized_kind` to `normalized_src`) reads consistently with the wire field. The helper params are still named `kind` against the `OutputLabelKind` type, which is internal and deferred.

</details>
