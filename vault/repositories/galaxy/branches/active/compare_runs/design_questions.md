# Design questions for John

Running list, added to throughout the overnight run. Each is "chose X, confirm?".

1. **Mode 3 row unit** — chose one row per Job, or per ImplicitCollectionJobs when mapped over (not per ToolRequest). Brain research: since PR 21842 every UI submission gets an indexed `tool_request_id`; only legacy `/api/tools` and workflow jobs lack one. Job/ICJ still covers workflow jobs uniformly. Confirm?
2. **Mode 3 includes workflow jobs** — chose `include_workflow_jobs=True` by default. Confirm?
3. **Mode 3 entry point** — chose job page only ("Other runs of this tool"); no tool-form "previous runs" panel yet. Confirm?
4. **Issue reporting** — work comes from a project plan, not an issue; nothing posted. #10039 is the closest issue if you want a comment there.
5. **Overlap with open #24288** (jobs panel, not ours) — it changes `JobManager.index_query` to return `(rows, total)`. Mode 3 avoids depending on that signature; whichever merges second rebases.
6. **Implementation-plan decisions D1–D15** — 11 more questions at the end of [implementation_plan.md](implementation_plan.md#design-questions-for-john); all taken at their recommended defaults (StoredWorkflow id + `instance`, sort by id, `role:name` column keys, own mode 3 query, limit ≤200, etc.).
