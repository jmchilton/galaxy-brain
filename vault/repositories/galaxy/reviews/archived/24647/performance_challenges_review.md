# Performance challenges review: PR #24647

Profile: [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md), claude-opus-5-5, medium effort. Reviewed commit `7247fea9983`. Static analysis only, with no measurements. Full reasoning and the measurement plan are in [performance_challenges_debrief.md](performance_challenges_debrief.md).

Summary: no scaling regressions found. The new `EditableObjects` walk of a job's output collections is per job and limited to the job's own slice under map-over. `io_dicts(exclude_implicit_outputs=True)` replaces the shared implicit HDCA with the job's own sub-collection, so the walk is not quadratic. The rows it loads are the ones the import loads next anyway, so they come from the identity map. One minor redundant query remains.

### P3 1: Metadata file uuid is queried twice per reference

When `editable_objects` is set, `replace_metadata_file` runs `select(MetadataFile).filter_by(uuid=...)` for `assert_metadata_file_editable`, then immediately runs the same filter again with `order_by(id).limit(1)` to choose the row to reuse. Every MetadataFile in an extended-metadata import therefore pays an extra round trip. A job that discovers thousands of indexed outputs (e.g. BAM plus `.bai`) pays thousands of extra queries. Each query is cheap because `uuid` is indexed.

Suggested fix: query once with `order_by(MetadataFile.id)`, pass the list to `assert_metadata_file_editable`, and take `rows[0]` (or `None`) as the reuse candidate. That keeps one query per reference, which is the count before this PR.
