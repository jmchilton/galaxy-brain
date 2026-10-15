# Client implementation phase

Implemented source invocation propagation from WorkflowRerun through WorkflowRun to both simple and expanded submission payloads. Ordinary workflow submissions omit the lineage parameter. Invocation detail now shows accessible source and latest direct rerun links in a small dedicated component, outside the tabs and collapsible header. The invocation grid and activity scroll list mark reruns; existing layout and navigation remain intact.

Regenerated OpenAPI with scripts/dump_openapi_schema.py and openapi-typescript. Applied only the three relevant schema definitions (27 inserted lines) to avoid unrelated generated changes.

Added a submission payload regression to WorkflowRunForm.test.ts and three lineage component tests (empty lineage, source only, source plus successor). Focused Vitest: **13 passed**, two files. Log: /tmp/issue24174-client-tests.log. git diff --check clean. Focused ESLint was launched and is still pending in exec session99120; log /tmp/issue24174-client-lint.log.

Added test_workflow_rerun_lineage in the existing browser suite. It runs I, reruns I as J using the simple form, reruns J as K using the expanded form, checks the immediate source after each reload, follows source and latest links, checks the list marker, and captures screenshots. Uses existing smart components, condition waits, and workflow_run_ensure_expanded; no sleeps added. New selectors reside in navigation.yml. **Browser scenario remains unverified:** first attempt failed before execution because the environment agent's Vite service had terminated (ERR_CONNECTION_REFUSED). Root is restarting services and will run it during finalization. Log: /tmp/issue24174-lineage-e2e.log.

No commits made by this phase. Parent reported normal UI review clean. No additional implementation edits planned; test challenge/finalization agents can take ownership.
