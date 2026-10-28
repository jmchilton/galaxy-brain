Run via gpt-6-sol at medium effort.

Codex returned no findings; nothing acted on.

Scope: `git diff origin/release_26.2...HEAD` (`d4a265d39c3`). Brief: route rename to `/api/pages/{id}/extraction_summary`, drop unused `report_title`, no deprecation alias (both new in 26.2). Also asked it to flag missed references to the old route/field.

<details>
<summary>Raw output</summary>

```json
{"coverage":{"files_reviewed":["client/packages/api-client/src/schema/schema.ts","client/src/api/pages.ts","client/src/components/History/WorkflowExtractionForm.vue","lib/galaxy/schema/workflows.py","lib/galaxy/webapps/galaxy/api/pages.py","lib/galaxy/webapps/galaxy/api/workflows.py","lib/galaxy/webapps/galaxy/services/pages.py","lib/galaxy/webapps/galaxy/services/workflows.py","lib/galaxy_test/api/test_pages_history_attached.py","lib/galaxy_test/api/test_workflow_extraction.py"],"notes":""},"findings":[]}
```

</details>
