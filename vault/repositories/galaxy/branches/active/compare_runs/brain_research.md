```yaml
documents:
  - path: vault/agents/gx_issues/internally_managed/step_runs_across_invocations.md
    why: Predecessor draft of mode 1; plan.md supersedes it. It matches steps by uuid (plan uses label only), so treat its matching and `step_uuid` param as stale.
    load_when: Checking what plan.md changed, or why uuid matching was dropped.
  - path: vault/repositories/galaxy/branches/active/issue_24173_invocation_selection_urls/pr_description.md
    why: Defines the `?step_label=&job=&output=&step_tab=` contract mode 1 rows link to, and reworks the step card's GTabs (named-tab adapter) where All runs will be added. PR #24307 is still open, so none of it is on dev.
    load_when: Adding the All runs tab, building row links, or rebasing onto #24173.
  - path: vault/repositories/galaxy/branches/active/issue_24173_invocation_selection_urls/subagents/label_resolution_followup.md
    why: Real API shape. Invocation steps carry `order_index` and `workflow_step_label`, but the workflow summary steps carry no labels, and invocation steps are created incrementally while scheduling. Fixtures that assumed otherwise passed while the browser failed.
    load_when: Writing fixtures or label-to-step joins; deciding how to match labels in the resolver and client.
  - path: vault/research/Component - Invocation Graph View.md
    why: Step card structure (Jobs / Outputs / Step Config), routing, shared scoped stores, polling, `order_index` as the client step id.
    load_when: Implementing the All runs tab and row-detail expansion (avoid N x M polling history items).
  - path: vault/repositories/galaxy/reviews/active/24288/learning_galaxy.md
    why: PR #24288 (open) makes `JobManager.index_query` and `JobsService.index` return `(rows, total)` and adds a `total_matches` header to `GET /api/jobs`. Mode 3 extends the same function, so expect a signature conflict or a reuse of its count helper.
    load_when: Implementing the tool-runs resolver, the `total_matches` header, or a `tool_version` filter.
  - path: vault/repositories/galaxy/branches/active/invocation_graph_embedded_outputs/spike_debrief.md
    why: Found that the default invocation payload leaves `steps[].outputs` empty. Workflow-level data comes from `invocation.inputs`, `outputs` and `output_collections`; other step outputs cost one request per step. Also has a popover that lists a step's outputs.
    load_when: Choosing what the step_runs and output_runs resolvers read, and writing live-server checks (unit fixtures hid this bug).
  - path: vault/repositories/galaxy/branches/active/issue_24174_invocation_rerun_lineage/implementation_debrief.md
    why: Adds a nullable indexed self-FK on invocations, source/latest rerun links in element responses, and rerun markers in both invocation lists. Touches the same lists and invocation serializers; a "rerun of" column would build on it.
    load_when: Adding the stored-workflow Compare outputs entry point or a rerun column; rebasing.
  - path: vault/repositories/galaxy/branches/merged/issue_24411_job_cache_identifier_25.1/pr_description.md
    why: What `copied_from_job_id` means and when the cache hits (name and element-identifier matching, plain versus mapped runs). Bounds the `reused` column's semantics.
    load_when: Deriving `reused` / `partial`, or writing the job-cache API test.
  - path: vault/repositories/galaxy/issues/queued/24305/proposal.md
    why: Duplicate output labels are accepted by the workflow API and an invocation's `outputs` dict then keeps one of them. This is the failure mode mode 2 has to flag.
    load_when: Keying mode 2 columns by output label; writing the duplicate-label test.
  - path: vault/repositories/galaxy/branches/active/issue_24188_subworkflow_rename_expression_json/pr_description.md
    why: How `expression.json` datasets are read (`read_expression_json`, `replace_expression_json_dataset`), and that a mapped expression collection still renders as a repr (known gap).
    load_when: Implementing inline value cells for expression-tool outputs.
  - path: vault/research/Component - Workflow API.md
    why: Invocation endpoints, `step_details`, `/counts`, `/versions`, and the dual id convention (StoredWorkflow id versus `instance=true` Workflow id). The new `/api/workflows/{workflow_id}/...` routes need to follow or consciously diverge from it.
    load_when: Designing endpoint ids, security checks and the Pydantic query model.
  - path: vault/research/Component - Collection Models.md
    why: HDCA and `ImplicitCollectionJobs` links (`job_id` versus `implicit_collection_jobs_id`, `job_source_type`), collection populated state.
    load_when: Resolving a step's job or ICJ and building collection cells and the `partial` reuse state.
  - path: vault/research/Component - Workflow Extraction Models.md
    why: Job input/output association tables, `creating_job_associations`, `tool_id`/`tool_version`, ICJ and representative-job handling.
    load_when: Reading job inputs and outputs from association tables in the tool-runs resolver.
  - path: vault/research/Component - Workflow Format (.ga).md
    why: Step label and workflow output label uniqueness rules, and how `workflow_outputs` labels are stored.
    load_when: Matching columns by label; unlabelled step/output handling.
  - path: vault/research/PR 21842 - Tool Execution Migrated to api jobs.md
    why: Every UI tool submission now goes through `POST /api/jobs` and creates a ToolRequest; only the legacy `POST /api/tools` does not. This weakens the plan's reason for rejecting per-ToolRequest rows (`Job.tool_request_id` is indexed).
    load_when: Settling the mode 3 row unit (open question 1).
  - path: vault/agents/gx_issues/internally_managed/rerun_single_step_from_invocation.md
    why: Companion feature whose output is a new mode 1 row; also adds a step card header action, so the two share layout space on the card.
    load_when: Laying out the step card; deciding what rerun links the table shows.
  - path: vault/repositories/galaxy/branches/merged/issue_23977_client_api_fanout_26.1/pr_description.md
    why: Client request fan-out and 429 retries on the invocations list; `DatasetPopoverLink` now reads through the store getter while shown. Sets the request budget a table of cells must respect.
    load_when: Generalising `DatasetPopoverLink` and deciding per-cell fetch behaviour.
  - path: vault/research/Component - Dataset Display.md
    why: Peek, `display_peek`, `get_content_as_text` and how tabular content is rendered.
    load_when: Row detail panel and value/metadata cells.
  - path: vault/research/Dependency - Pydantic Discriminated Unions.md
    why: Patterns for the `Cell` and run-reference unions (tagged, callable discriminators).
    load_when: Writing the `ComparisonTable` response models.
  - path: vault/research/Component - API Tests.md
    why: Populators (`upload_yaml_workflow`, `invoke_workflow`, `wait_for_invocation`) for the plan's multi-version API tests.
    load_when: Writing `test_comparisons.py`.
  - path: vault/repositories/galaxy/branches/merged/invocation_graph_e2e/polish_e2e_tests_debrief.md
    why: Existing invocation step card E2E selectors in `navigation.yml` (`invocations.graph_*`, `step_card_*`) and test conventions for the one Playwright test.
    load_when: Writing the Playwright test.
research_requests:
  - vault/agents/gx_research/todo/workflow_invocation_models.md
  - vault/agents/gx_research/todo/jobs_api_and_job_cache.md
```
