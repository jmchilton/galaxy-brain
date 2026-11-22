Run via claude-opus-5-5 at low effort.
No blockers or should-fix findings, so I made no code changes. The notes go into the implementation debrief instead.

Not acted on:
- Imported histories still show the duplicate: `HDCA._serialize` doesn't export `implicit_collection_jobs`, so imported implicit HDCAs have no ICJ id. Other code that relies on `HDCA.implicit_collection_jobs` has the same gap, so it's left as a known limitation instead of adding a heuristic fallback.
- Moving the check onto `Job` and having `Job.io_dicts(exclude_implicit_outputs=True)` use it: that's a dev follow-up, kept out of this 26.1 fix.
- `Job.to_dict` `output_collections` and `/api/jobs/{id}/outputs` still list the implicit HDCA on purpose (`submitAsync.js` relies on `/outputs`).
- A mapped collection-output job shows no collection row, because its own collection is a plain `DatasetCollection` that `JobOutputs` can't render. Not a regression; it's noted in the debrief.

## Details

Reviewed `git diff origin/release_26.1...HEAD` (be6136f48d4 baseline tests, 07763ce5ac6 fix). I found no blockers. The fix is narrow and correct for the paths that create map-overs today, and it adds at most one lazy query per call. The commit split follows the baseline-tests convention: the first commit adds only the two tests that pass on base, and the map-over tests land with the fix. The findings below are mostly notes about adjacent paths.

### Correctness of the predicate

- **note**: `lib/galaxy/managers/jobs.py:2197-2213`. I found no case where a mapped job has a legitimate HDCA output that shares its ICJ. `implicit_collection_jobs` is set on an HDCA only in `ExecutionTracker.precreate_output_collections` (`lib/galaxy/tools/execute.py:738`), and every HDCA a single map-over creates gets the same ICJ. A mapped job's own collection output, such as the per-element `paired` of `collection_creates_pair`, is a bare `DatasetCollection` attached through `job.output_dataset_collections` (`add_implicit_output_dataset_collection`), not an HDCA. So nothing legitimate is hidden. For a job with an ICJ association, every entry in `output_dataset_collection_instances` is in practice a map-over HDCA, so the ICJ-id comparison is the precise predicate rather than an over-broad one.
- **note**: Workflow-scheduled map-overs. `WorkflowStepExecutionTracker.ensure_implicit_collections_populated` (`execute.py:983-997`) reuses `invocation_step.implicit_collection_jobs` across scheduling iterations. The HDCAs precreated in the first iteration and the jobs recorded in later iterations therefore share one ICJ, and the filter works.
- **note**: Job cache (`use_cached_job`). A cached map-over still goes through precreate and `record_success`, so it gets a fresh ICJ and fresh HDCAs that carry that ICJ. `_copied_from_implicit_collections` only sets `copied_from_history_dataset_collection_association_id` and leaves `implicit_collection_jobs_id` alone. `Job.copy_from_job` uses `io_dicts(exclude_implicit_outputs=True)` and does not copy HDCA associations. The filter is unaffected.
- **note**: Copied histories. `HDCA.copy` keeps `implicit_collection_jobs_id` (`model/__init__.py:8592`), but copies are never job outputs, and the original job still points at the original HDCA. No impact.
- **note (residual gap)**: History or invocation import via `lib/galaxy/model/store/__init__.py`. Two things happen on import:
  - `_import_implicit_collection_jobs` (lines 1436-1459) rebuilds the ICJ and the job associations.
  - `output_dataset_collection_mapping` (lines 1896-1905) re-adds the HDCA outputs.

  The HDCA import (around line 955) does not restore `implicit_collection_jobs` on the HDCA, and `HDCA._serialize` does not export it either. On an imported mapped job, `hdca.implicit_collection_jobs_id` is therefore NULL, the comparison `None != icj_id` is true, and the whole collection still appears in the job's outputs. The same gap already affects everything else that keys on `HDCA.implicit_collection_jobs` (for example `job_state_summary` and `_copied_from_implicit_collections`), so this branch does not need to fix it. It should be named in the debrief or PR as a known limitation. A belt-and-braces alternative would also drop HDCAs whose `implicit_collection_jobs_id is None and implicit_output_name is not None` when the job has an ICJ association, because `implicit_output_name` survives import. I would not do that here without a test that goes through import; mention it instead.

### Sibling paths / consistency

- **note**: `lib/galaxy/model/__init__.py:1940-1972`. `Job.io_dicts(exclude_implicit_outputs=True)` already answers "drop the map-over collections from this job's outputs", but it uses a different heuristic: an HDCA counts as mapped-over when its name is also a key in `out_data`. That heuristic misses mapped collection-output tools, because the list:paired implicit HDCA is named `paired_output` while the HDA parts use `paired_output|__part__|...` names. The new ICJ-based predicate is stricter and better. Galaxy now has two definitions of "this job's own collection outputs". Reusing `io_dicts` here would not have fixed the `collection_creates_pair` case, so not reusing it is justified. A follow-up on dev could move the ICJ predicate onto `Job` (for example `Job.own_output_dataset_collection_instances`) and have `io_dicts` use it. For a 26.1 fix, keeping it private in the manager is reasonable.
- **note**: Other surfaces still list the implicit HDCA for each mapped job:
  - `Job.to_dict(view="element")["output_collections"]` (`model/__init__.py:2455-2458`)
  - `/api/jobs/{id}/outputs` (`webapps/galaxy/services/jobs.py:236`)

  The first is a sibling of `/outputs`; the second is deliberately left alone for `submitAsync.js`. The divergence is intentional and documented in the commit message, which lists the consumers that rely on the association. It is fine as scoped.
- **note**: `test_parameters_display_map_over_collection_output` pins that a mapped collection-output job shows only its two element HDAs and no collection. The non-mapped case shows the HDCA plus the element HDAs. So the mapped job's own per-element `paired` collection, which exists only as `job.output_dataset_collections` (a DC, not an HDCA), is not represented at all. That gap already existed and is not a regression. The issue only asked to stop showing the wrong collection, and the client `JobOutputs` has no `dc` source to render. It is worth a sentence in the debrief so a reviewer does not read the asymmetry as an oversight.

### Performance

- **note**: `jobs.py:2206`. `job.implicit_collection_jobs_association` is a plain lazy `uselist=False` relationship, which costs one extra SELECT per `parameters_display` call. `JobToOutputDatasetCollectionAssociation.dataset_collection_instance` is `lazy="joined"` (`model/__init__.py:2896`), so reading `implicit_collection_jobs_id` from it adds no queries. That cost is acceptable.

### Placement / naming / typing

- **nit**: `jobs.py:2197`. The name `_own_output_dataset_collection_instances` is clear, the return type `list[model.JobToOutputDatasetCollectionAssociation]` is accurate, and the docstring explains a non-obvious invariant rather than restating the code. I have no changes to request. Placement is discussed in the `io_dicts` note above.
- **nit**: `jobs.py:2225`. The existing `cast(list, output_associations)` stays. With the helper returning a typed list, that entry would type-check on its own, but the cast covers the whole tuple, so leave it.

### Tests

- **note**: `lib/galaxy_test/api/test_jobs.py:1460-1508`. Both map-over tests assert the exact set of displayed ids against the implicit collection's element ids. They are reported to fail without the fix. They also check the positive side: each job shows its own element and the union covers all elements. So they would catch both the regression and a fix that over-filters. The `src` lists are compared after the HDCA entry is popped or filtered, so dict ordering does not matter. `wait_for_history_jobs(..., assert_ok=True)` removes the obvious flake source. I see no flakiness risk.
- **nit**: `test_jobs.py:1443-1444`. The added assertion in `test_parameters_display` reads `search_response.json()[0]["outputs"]["out_file1"]["id"]`, which depends on the earlier search returning exactly the expected job first. That ordering was already relied on in this test, so this is fine.
- **note**: No test covers the imported-history case described above, which matches the decision not to handle it.

### Test run

`pytest lib/galaxy_test/api/test_jobs.py -k parameters_display` on HEAD: 4 passed, 66 deselected (70.9s).
