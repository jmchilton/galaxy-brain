Run via claude-opus-5-5 at low effort.

**Recommendation: keep as implemented.** The display filter and the import fix are the right scope. *Revised after the coordinator challenged it:* I first recommended moving `Job.io_dicts(exclude_implicit_outputs=True)` to the ICJ-id predicate, but that premise is wrong. In `io_dicts`, the second loop over `output_dataset_collections` overwrites the implicit HDCA with the job's own sub-collection under the same output name, so mapped collection-output tools already come back correct. The name rule still has to stay to exclude shared DCs, which have no ICJ. And swapping only the HDCA half would leak the implicit HDCA into metadata setup and job-cache copying for jobs imported from older exports. Leave `/outputs` and `Job.to_dict` as they are (`submitAsync.js` depends on them). Leave the per-job sub-collection row for a follow-up, because it needs client work.

## Possible Decompositions

The branch is about 196 lines, roughly 40 production and 156 test.

1. **Baseline tests** (`test_jobs.py` `test_parameters_display` assertions, plus `test_parameters_display_collection_output`). These pass on base, so they can land first or stay with 2.
2. **Display fix** (`_own_output_dataset_collection_instances` in `managers/jobs.py`, plus the two map-over API tests). This closes #25004 for histories that weren't imported.
3. **Import keeps HDCA→ICJ links** (`model/__init__.py` serialize, `model/store/__init__.py` import pass, the unit test and `test_import_export_map_over_collection`). This piece stands alone: it also fixes `job_source_type` and other ICJ readers on imported histories. It could land before or after 2. The API test only shows the #25004 symptom once 2 is in.

## Scopes considered

### As implemented
A display-layer filter on the ICJ id in `summarize_job_outputs`, plus export/import of `HDCA.implicit_collection_jobs`.

| Pros | Cons |
|---|---|
| Small, and it fixes the issue at the layer that owns it<br>Keeps the job↔HDCA association that search, cache, access checks and extraction rely on<br>The import fix also repairs other readers of the ICJ link | Leaves two definitions of "a job's own outputs": the new ICJ-id filter and the name matching in `io_dicts` |

### Expand: unify `Job.io_dicts(exclude_implicit_outputs=True)` on the ICJ-id predicate (rejected after challenge)
Make `io_dicts` exclude implicit HDCAs by ICJ id instead of by name.

| Pros | Cons |
|---|---|
| One definition of "own outputs", at least for HDCAs | Fixes no bug: `io_dicts` already returns the right result. For mapped collection-output tools, the loop at `model/__init__.py:1962-1964` overwrites the implicit HDCA with the job's own DC under the same output name (stored via `actions/__init__.py:1106,1242`)<br>The name rule must stay for shared DCs, which have no ICJ<br>Would regress jobs imported from older exports, which lack the HDCA→ICJ link: the implicit HDCA would reach external metadata setup (`jobs/__init__.py:2775`) and job-cache output copying (`model/__init__.py:1877`) |

<details>
Revised after the coordinator challenged it. I checked the cited lines in the worktree and the claims hold. My original recommendation repeated the debrief's premise without checking it against the second loop.
</details>

### Expand: stop listing implicit HDCAs in `/api/jobs/{id}/outputs` and `Job.to_dict`
Apply the filter to those outputs too.

| Pros | Cons |
|---|---|
| Consistent across every per-job output view | Breaks `submitAsync.js`, which reads `/outputs` to find the implicit collections it created<br>It's an API change, so it doesn't belong on a release branch |

Rejected.

### Expand: show the per-job sub-collection row for mapped collection-output jobs
Teach `summarize_job_outputs` and `JobOutputs.vue` to render the job's own plain `DatasetCollection`. For example, they could resolve the matching `DatasetCollectionElement` in the implicit HDCA.

| Pros | Cons |
|---|---|
| A complete Job Outputs table for collection-producing map-overs | Needs a new output shape in the API schema plus client rendering<br>It isn't a regression: before the fix, that row was the parent HDCA, which was wrong anyway<br>Larger and riskier on 26.1 |

Better as a follow-up issue.

### Expand: stop associating implicit HDCAs with every mapped job
Remove the association at its source in `ExecutionTracker.record_success`.

| Pros | Cons |
|---|---|
| The filter would no longer be needed | Job search, the job cache, `_user_can_access_job` and extraction all depend on the association<br>Needs a migration or backfill thinking; this is dev-only work at best |

Rejected.

### Contract: drop the import/export fix
Ship only the display filter. Imported histories keep the duplicate as a known limitation.

| Pros | Cons |
|---|---|
| Smaller and touches only one file of production code | Two independent reviewers flagged the gap<br>The import fix is small and repairs a real data-loss bug in the model store |

Not recommended. It could be split out as a separate PR instead (see decompositions).
