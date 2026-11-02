Profile: gx_risk_assessment · Model: claude-opus-5-5 · Effort: low · Reviewed commit: ff156cf34cd

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). No API, schema, migration, or tool/workflow format changes; the new `output_filter_all_by_param` tool is test-only.

<details><summary>Risk Review Advice</summary>

The runtime behavior is the part worth human attention on a release branch: map-over slices already recorded in `ImplicitCollectionJobsJobAssociation` are now skipped on later scheduling iterations, `ImplicitCollectionJobs` is tracked even when every output is filtered, and the "HDCA was copied" test now compares all recorded jobs against one source map-over rather than the jobs from the current iteration. That last check decides which collections the job cache treats as valid cached inputs downstream, so confirm it isn't stricter or looser than before for partially cached map-overs. Bumping `update_time` on a capped step changes how often the scheduler revisits the invocation; check that can't cause busy-looping. All of this can be reverted without data cleanup.

</details>
