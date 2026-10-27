# Design questions for John

Running list, added to throughout the overnight run. Each is "chose X, confirm?".

1. **Mode 3 row unit** — chose one row per Job, or per ImplicitCollectionJobs when mapped over (not per ToolRequest; legacy `/api/tools` submissions don't create one). Confirm?
2. **Mode 3 includes workflow jobs** — chose `include_workflow_jobs=True` by default. Confirm?
3. **Mode 3 entry point** — chose job page only ("Other runs of this tool"); no tool-form "previous runs" panel yet. Confirm?
4. **Issue reporting** — work comes from a project plan, not an issue; nothing posted. #10039 is the closest issue if you want a comment there.
