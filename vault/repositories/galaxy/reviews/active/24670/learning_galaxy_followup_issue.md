# galaxy-brain research follow-up: PR #24670

## Baseline conflicts

None in `vault/research/`. `Component - Jobs API and Job Cache.md` says the implicit HDCA copied-from marker is never set. That is accurate on `release_25.1` before this PR.

One adjacent imprecision outside `vault/research/`: `vault/projects/workflow_semantics/RESEARCH_GAPS_HIGH_PRIORITY.md` Q14 says delayed steps are "re-evaluated from scratch". A partially scheduled mapped step (state `ready`) actually reuses its HDCAs and ICJ and skips slices that already have output. Since this PR it also skips slices with jobs recorded on the ICJ.

## Post-merge activities

Do these once the fix is merged forward to `dev` (research line references are pinned to dev SHAs):

1. `vault/research/Component - Jobs API and Job Cache.md`, "What `copied_from_job_id` means":
   - Replace "That never happens at this SHA" with the new rule from `ExecutionTracker._copied_from_implicit_collections`. Every job on the ICJ must be copied, from exactly the jobs of one source ICJ, counting jobs created across scheduling iterations.
   - Mention that `test_cached_mapped_step_scheduled_once_per_element` covers it.
2. Same note, `ImplicitCollectionJobs` section:
   - "Each implicit output HDCA points at the ICJ" still holds. Add that an ICJ can exist and record jobs with no implicit HDCAs (all outputs filtered).
   - Add that `order_index` now also serves as the resume ledger (`recorded_order_indexes()`).
   - Add that `Tool.completed_jobs` takes `skip_job_indexes`.
3. `vault/agents/gx_research/research_issues/icj-cached-hdca-copied-from-never-set.md`:
   - Resolve or archive it.
   - Its "no test asserts `copied_from_history_dataset_collection_association_id`" claim is invalidated by the new integration test.
4. `vault/projects/workflow_semantics/RESEARCH_GAPS_HIGH_PRIORITY.md` Q14:
   - Add partially scheduled mapped steps: resumed via the ICJ `order_index` ledger.
   - Add that `WorkflowInvocationStep.update_time` is bumped to wake `ready_to_schedule_more`.
5. If the queued `Component - Workflow Scheduling` note (`vault/agents/gx_research/todo/workflow_scheduling_iterations.md`) is written before merge, refresh it for the post-merge resume semantics.
