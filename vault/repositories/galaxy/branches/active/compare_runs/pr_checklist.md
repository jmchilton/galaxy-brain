Run via Claude Opus 5.5 at high effort. Three items failed on the first pass; two were fixed on the branch (`7f331c2b068`, `9bd004da99e`) and the evidence item is answered as it stands.

- [x] What does the user see when it fails? A danger alert with Retry for API errors, "no access" cells for items the caller can't read, and an explanation inside an unavailable All runs tab.
<details>

- API errors: `useComparison.ts:42` turns any failure into a danger alert with a Retry button (`StepRunsTab.vue:103-106`, `ComparisonView.vue:249-252`). An unknown step label is a 404 that reads "No version of this workflow has a step labelled [x]." (`comparisons.py:90`). A blank label or a bad metadata name is a 400 (`test_step_runs_errors`). A workflow the caller can't access fails in `get_stored_accessible_workflow`, and the page shows that error.
- Bad `/comparisons` URLs: unknown keys are rejected and shown as a danger alert (`ComparisonView.vue:193`). Anonymous users are redirected (`router.js`, `redirectAnon()`), and every entry point is hidden for them.
- Inaccessible items: the cell reads "no access", with the title "You do not have access to this item" (`comparisonUtils.ts:176`). The API test is `test_step_runs_hides_inaccessible_items`.
- Unavailable All runs tab: the tab stays enabled and shows an info alert inside it. For a subworkflow it reads "Steps inside a subworkflow can't be compared across runs yet. Open the parent run…". For an unlabelled step it reads "Label this step in the workflow editor…" (`StepAllRunsTab.vue:31-37, 43-45`).
- Empty states: `/comparisons` says "No runs match these filters." (`ComparisonView.vue:261`). The step tab hard-coded "This step has no runs yet." even when its own state or version filter emptied it. Fixed in `7f331c2b068`: it now says "No runs match these filters." when a filter is set, with a test.
</details>

- [x] Is the diff free of unrelated or stale generated changes? Yes!
<details>

- `client/packages/api-client/src/schema/schema.ts` is byte-identical to a fresh `dump_openapi_schema.py` + `openapi-typescript` + `prettier` run at `28f6e36ae19`. It only adds lines, and each one comes from the branch: the three endpoints and their models, job `tool_version`/`copied_from_job_id`, the `/api/jobs?tool_version=` param, and `metadata_elements`.
- `client/src/utils/navigation/schema.ts` hand-adds exactly the `navigation.yml` additions: `loading_message`, `workflow_invocations_table_rows` and the `comparisons` section. Every selector is used by the E2E or `navigates_galaxy.py`. The file's existing staleness on dev (e.g. no `file_set_wizard`) is left alone.
</details>

- [x] Are unit tests not just testing the literal implementation? Yes.
<details>

The tests pin observable outcomes: state and reason tables, column alignment across versions, access checks, statement counts that don't grow with the row count, export escaping, filter and URL round-trips, and diff selection. They aren't mocks of internals. The closest to restating the code is `test_comparison_records.py::test_submission_key`, a three-line function tested line by line. `test_step_module_type_names_every_module` is a drift guard against `module_types`, not a restatement.
</details>

- [x] Are baseline tests in their own leading commits (if applicable)? Yes.
<details>

The first 8 commits (`5d47beec7ae`…`228ff1e837a`) touch only tests. The one exception is a populator helper in `f2f48b59ad5`. They pin job fields, DatasetPopoverLink, HDA metadata, io association names, ToolExecutionJobs, useMappingJobs, metadata keys and the BibTeX download, ahead of the refactors that change those areas.
</details>

- [x] Are the comments free of excess archeology? Yes.
<details>

`StepAllRunsTab.vue`'s template comment mentioned a tooltip that existed only in earlier commits of this branch; `9bd004da99e` trims it to "Always enabled: when runs can't be listed, the tab says why." Elsewhere, the `#24173` references (`comparisonQuery`/E2E) are forward-looking dependencies. The JobInformation change shortens an existing dev comment.
</details>

- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

- [x] Which existing workflows change behavior (if any)? None. Nothing touches workflow execution or scheduling. The changes are UI additions: an All runs tab on invocation step cards, breadcrumbs and Compare outputs on stored-workflow invocations, and a link in the editor's NodeInspector.
<details>

Other visible changes to existing pages and APIs:
- Job responses now carry `tool_version`, which fixes the "Tool Version" row that never rendered. Job lists gain `copied_from_job_id`.
- `?keys=metadata_<name>` returns one metadata element.
- ToolExecutionJobs pages through a mapped batch.
- DatasetPopoverLink ids are now unique.
- A long breadcrumb ends in an ellipsis.
</details>

- [x] Who hits this in practice and what is the evidence? Workflow developers iterating on a step across versions; #10039 asks for that step mode. The workflow-outputs and tool modes extend the same problem and have no separate user request.
<details>

The plan's motivation ("opening invocations one at a time…") is an internal problem statement. A GitHub issue search found no other requests to compare runs or list past runs of a tool. The checklist pass first marked this item failing on that thin evidence. The description now states the evidence as it is, and whether to lead with the #10039 step mode and split the other modes into follow-ups is left to John (see the scope evaluation's decompositions).
</details>

- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes. The plan's "Alternative Approaches" section covers them.
<details>

- Extending `GET /api/invocations?view=element&step_details=true` was rejected: it serializes every step, and it counts `total_matches` before the security filter.
- Per-row client fetches, as the step card does, were rejected at 20–100 requests per page.
- One POST with a query body was rejected: reads couldn't be cached or linked.
- Matching steps by uuid or position was rejected: uuids change on rename and import, and positions shift when a step is inserted.
- Rows per ToolRequest were rejected because legacy `/api/tools` submissions don't create one.
- Paging mode 3 through `JobManager.index_query` was rejected (D8): it limits on Job rows, so one mapped batch fills a page and miscounts.
- A smaller alternative scope is kept as `compare_runs_alt_original_scope`.
</details>
