# Design questions for John

Running list, added to throughout the overnight run. Each is "chose X, confirm?".

1. **Mode 3 row unit** — chose one row per Job, or per ImplicitCollectionJobs when mapped over (not per ToolRequest). Brain research: since PR 21842 every UI submission gets an indexed `tool_request_id`; only legacy `/api/tools` and workflow jobs lack one. Job/ICJ still covers workflow jobs uniformly. Confirm?
2. **Mode 3 includes workflow jobs** — chose `include_workflow_jobs=True` by default. Confirm?
3. **Mode 3 entry point** — chose job page only ("Other runs of this tool"); no tool-form "previous runs" panel yet. Confirm?
4. **Issue reporting** — work comes from a project plan, not an issue; nothing posted. #10039 is the closest issue if you want a comment there.
5. **Overlap with open #24288** (jobs panel, not ours) — it changes `JobManager.index_query` to return `(rows, total)`. Mode 3 avoids depending on that signature; whichever merges second rebases.
6. **Implementation-plan decisions D1–D15** — 11 more questions at the end of [implementation_plan.md](implementation_plan.md#design-questions-for-john); all taken at their recommended defaults (StoredWorkflow id + `instance`, sort by id, `role:name` column keys, own mode 3 query, limit ≤200, etc.).
7. **Multi-dataset inputs** — a `multiple="true"` data param cell shows only its first dataset (job records `f1, f11, f12…`, folded to `f1`). Show all N (list cell) instead?
8. **`metadata_keys`** — lists every non-file element the datatype declares (lists capped at 50), not only scalars seen on the page. OK?
9. **Labelled steps without a job** (inputs, pauses, subworkflows) — All runs works but shows no input columns. Fine, or 400?
10. **Items the caller can't access** — cells for inputs from other users' histories the caller can no longer read render as `Missing(reason="inaccessible")` (new reason; no name/metadata/value). Confirm the reason name and that hiding entirely is right.
11. **`normalise_io_name` → `normalize_io_name`** — renamed to match Galaxy's `-ize` convention (plan used `-ise`).
12. **Phase 2 questions** — six more at the end of [subagents/phase_2_implementation.md](subagents/phase_2_implementation.md): admins see foreign items in cells (matches HDA/history managers); HDCA access uses the HDCA-show history rule; unset optional params are `Value(null)`; no `(user_id, tool_id)` index for mode 3; `tool_versions_available` ignores `history_id`/`include_workflow_jobs`; check mode 1 `states` filter on production-size data. All left at the implementer's choice.
13. **Phase 3 (client) questions** — eight at the end of [subagents/phase_3_implementation.md](subagents/phase_3_implementation.md). Notable: labelled *input* steps get no All runs tab (card has no GTabs there); disabled tab text is the full sentence "Label this step to compare its runs" (disabled tabs can't show tooltips); collection cells link to their history (no HDCA page); display prefs in per-user local storage. Steps-without-job detail and `data-pk` selectors handled in phase 4; parameter diff/highlight in phase 5.
14. **`/comparisons` page + entry points** — the stored-workflow invocations page heading became breadcrumbs with a "Compare outputs" button (as `HistoryInvocations` does); OK given #24174 also touches invocation lists? "Other runs of this tool" shows only on the full job page (gated with its header), not on step-card jobs or the admin job list; want a DatasetDetails entry point too?
15. **State filter vocabulary** — curated lists (job: new/queued/running/ok/error/paused/skipped/deleted; invocation: new/ready/scheduled/completed/failed/cancelled), labelled "successful"/"failed" as elsewhere. Richer list wanted?
16. **`client/src/utils/navigation/schema.ts`** — stale on dev (full regen = ~900 unrelated lines); only the `comparisons` interface hand-added. A dev-wide regen PR would fix it.
17. **Selenium backend not run locally** (no chromedriver) — E2E verified under Playwright only; CI runs both.
