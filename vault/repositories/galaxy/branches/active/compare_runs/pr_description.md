Implement 🎯 #10039 - see every run of a workflow step, a workflow's outputs, or a tool in one table.

After a few runs of a workflow, "what did this step produce before I changed that parameter?" means opening invocations one at a time, finding the step in each graph and clicking through to datasets. For a tool there is no list of its past runs at all. This adds one table for each question, reached from the places a user already is: the invocation step card, the workflow's invocation list, the job and dataset pages, and the workflow editor.

**One step, every run.** An "All runs" tab on the invocation step card lists every run of that step across workflow versions. The ★ row is the run you are viewing; cells that differ from it are highlighted, and expanding a row diffs its tool parameters against the viewed run. Here v3 changed the filter condition, which explains why `out_file1` grew from 22 to 42 lines:

![All runs tab on a step card, one row expanded with its parameter diff](screenshots/row_detail_parameter_diff.png)

**A workflow's outputs, every run.** "Compare outputs" on the workflow's invocation list puts labelled inputs and outputs side by side, merged across versions. Any column can show a metadata element in place of the dataset name (here `data_lines`):

![Compare outputs page for a workflow run five times over three versions](screenshots/output_runs_page.png)

**A tool, every run.** "Other runs of this tool" on the job and dataset pages lists every submission of that tool across tool versions, inside workflows or not. A mapped-over batch is one row, and job-cache reuse is badged:

![Runs of the Filter tool, including mapped-over batches and a reused one](screenshots/tool_runs_page.png)

***Each user sees only their own runs. The endpoints are read-only GETs, and there is no database migration.***

***A step is matched across workflow versions by its label, so only labelled steps and outputs can be compared. An unlabelled step's All runs tab says so and points at the editor.***

<details><summary>What else the table does</summary>

- Select two rows to diff them side by side, showing only the fields that differ.
- Transpose: runs become columns, headed by version and time.
- Filter by state, workflow version, tool version or output; the filters live in the URL.
- "View all in a page" opens the same table at `/comparisons?kind=…`, which can be bookmarked.
- Export the page as CSV or TSV, as shown (visible columns, chosen displays, transposed or not), with spreadsheet-safe cells.
- Expanded rows show each output as a history item, and a mapped step's batch through a job pager.
- Deleted and purged items and histories are badged. Items the caller can no longer access show as inaccessible, without their names. Subworkflow steps link to the subworkflow run.

</details>

<details><summary>API</summary>

Three read-only endpoints, one per mode, sharing one table response (`columns`, `rows`, per-cell `value | dataset | dataset_list | collection | missing`) and a `total_matches` header:

- `GET /api/workflows/{workflow_id}/step_runs?step_label=…`
- `GET /api/workflows/{workflow_id}/output_runs`
- `GET /api/tool_runs?tool_id=…`

Shared parameters: `limit` (default 25, at most 200), `offset`, `sort_by`, `sort_desc` (newest first), `states` and `metadata_elements`. The workflow modes also take `versions` (0-based) and `instance`; `output_runs` takes `output_labels`; `tool_runs` takes `tool_versions`, `history_id` and `include_workflow_jobs` (default true). `/comparisons?kind=step_runs|output_runs|tool_runs` takes the same keys as its endpoint.

Smaller API changes the feature needs, each in its own commit near the front:

- `GET /api/datasets/{id}?keys=metadata_<name>` returns that one metadata element. Today the key is ignored.
- Job responses declare `tool_version`. The job page's "Tool Version" row never rendered on released Galaxy because the field was stripped.
- Job lists expose `copied_from_job_id`, and `GET /api/jobs` filters by `tool_version`.

</details>

<details><summary>How the branch is organised</summary>

79 commits, about 13.6k added and 1k removed lines outside the generated client schema:

- 8 baseline-test commits, then 12 base-level refactors and fixes. Each has a consumer on `dev` or fixes a `dev` bug: ItemPopoverLink (fixes a DOM id collision in storage runs), `totalMatches`, `downloadBlob`, `useExecutionJobs`, the router's `reuseOnQueryChange`, the BreadcrumbHeading ellipsis, and the job response fields above.
- Server: the endpoints, a comparisons manager split into queries, records, cells and columns, and API tests.
- One client schema regeneration.
- Client: `ComparisonTable` with its cells, the `/comparisons` page, the entry points, then diff, export, highlights and filters.
- Playwright/Selenium E2E last.

The leading commits can be split into prep PRs that land on `dev` alone. The [scope evaluation](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/compare_runs/scope_evaluation/) lists those splits.

</details>

## Risks

The three endpoints and the `/comparisons` URL keys become a public API that bookmarks and scripts will rely on. Matching steps across versions by label sets how users must label their workflows to compare them. Both are one-way doors.

<details><summary>Risk Details</summary>

- New public API: three GET endpoints, a table response schema, and `/comparisons` query keys. Renaming them later breaks bookmarks and clients.
- Step identity is the step label. Renaming a label splits a step's history into two, and unlabelled steps or outputs can't be compared. Step UUIDs were rejected because they change on rename-only saves, imports and pastes.
- `versions` is 0-based on the wire and shown 1-based (v1, v2…) in the UI.
- Query cost: the step and tool queries page over the caller's own invocations and jobs. No new index is added; `(user_id, tool_id)` was considered and left out.
- `?keys=metadata_<name>` changes what an existing dataset request returns: one element where the key used to be ignored.
- Steps inside a subworkflow can't be compared yet. Their All runs tab explains this instead of listing the hidden subworkflow build's runs.
- Conflicts: #24288 moves `get_count`, so whichever lands second needs a one-line import fix. #24307 touches the same lines in `Analysis.vue`, `router.js` and `navigation.yml`.

</details>

<details><summary>Risk Review Advice</summary>

Review the response schema in `lib/galaxy/schema/comparisons.py` and the query parameters as the public contract. Check the access rules in `lib/galaxy/managers/comparisons.py` and `comparison_queries.py`: rows must be the caller's own, and cells must not reveal names of items the caller can no longer read.

On the client, the label-based identity and the unavailable-tab messages in `StepAllRunsTab.vue` are what users will learn. The rest is presentation and is cheap to change.

</details>

## Context

Builds on Galaxy's invocation step cards, `JobParametersDiff` and `ToolExecutionJobs`. Row links into an invocation emit the `?step_label=` deep link from 🔀 #24173, which is ignored until that lands. Alternative kept on 🌿[compare_runs_alt_original_scope](https://github.com/jmchilton/galaxy/tree/compare_runs_alt_original_scope): the same three modes and table before the "finish the abstractions" pass, without the second consumers for the new helpers, `?keys=metadata_<name>`, the `output_runs` version filter or the dataset-page entry point. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

CHECKS_PLACEHOLDER

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Test coverage</summary>

- API: `lib/galaxy_test/api/test_comparisons.py` and `test_tool_runs.py`, plus the touched cases in `test_jobs.py`, `test_datasets.py` and `test_workflows.py`.
- Unit: the comparisons manager, queries, cells and records under `test/unit/app/managers/`.
- Vitest: the `Comparison` and `JobParameters` components and helpers, plus the consumers of the refactored helpers.
- E2E: `lib/galaxy_test/selenium/test_comparisons.py` covers the step-card tab across versions, every entry point, a mapped step with a reused job, and a subworkflow's step.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
