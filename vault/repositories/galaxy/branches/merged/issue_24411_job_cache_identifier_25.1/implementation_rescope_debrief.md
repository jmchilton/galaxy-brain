# Re-scope debrief

The first scope evaluation recommended a modest expansion. The original scope is kept as alt `issue_24411_job_cache_identifier_25.1_alt_original_scope` (`9159432b81e`).

## Done (commit `988e8350b07`, now `83965daea00` after the review nits)
- **Name match for mapped requests.** `_build_stmt_for_hda` now applies the dataset-name condition whenever `require_name_match` is set, including when the request has an identifier.
  - Red test `test_cached_job_mapped_run_skips_renamed_input`: map `model_attributes` (echoes `$input1.name`), rename the element's dataset, then run a cached mapped rerun.
  - On the old code the job was copied and the output kept the stale name. It passes now.
- **Fallback dataset wrappers.** `__populate_input_dataset_wrappers` passes `tool_evaluator=self`, so `.name` reads on those wrappers set `consumes_names`. There is no red test: the path only serves aliases that aren't fully prefixed (e.g. multi-value `input11`). It's a one-line consistency fix.
- **Comment.** The `Job.copy_from` comment that called the map-over collection branch unreachable from the job cache is corrected. The `cat1` baseline test shows the name-agnostic search does find mapped jobs.

## Not done here (per the scope evaluation)
- **User-defined tools.** `UserToolEvaluator` never sets `consumes_names`. There is no red test possible on 25.1, because plain and mapped UDT runs both render `null` there. It belongs on the #24410 branch on dev, with a red test.
- **Multi-value `input11|__identifier__` keys.** Not proven reachable, so it should start as an issue with a failing test.
- **JobSearch restructure.** The identifier-key helper, a unified label predicate, and renaming `consumes_names` are left for dev.

## Validation
All run one at a time:

| Suite | Result |
| --- | --- |
| `test_jobs.py -k "test_cached_job_ or search"` | 16 passed |
| `test_tools.py -k cached` | 13 passed |
| `test_workflows.py -k cached` | 8 passed |
| unit wrappers/evaluation/jobs | 236 passed |

Lint is clean.

## Re-scope review

[subagents/rescope_review.md](subagents/rescope_review.md). The reviewer worried that the name condition would lose cross-history workflow-rerun hits. That worry is refuted by a new baseline workflow test, `test_workflow_rerun_mapped_identifier_step_with_use_cached_job`: implicit element outputs carry no hid-based name, so the mapped `identifier_single` step is still a cache copy in a new history with shifted hids. That test is green on base, on the alt and on the head.

The rename test was confirmed red on `9159432b81e`. The two review nits were applied.

Head: `83965daea00`. Re-hardening follows, with round 1 moved to `earlier_drafts/1/`.
