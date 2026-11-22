Run via claude-opus-5-5 at low effort.

Top-line: no code changes made. The diff is small, puts each fix in the layer that owns it, and adds no stray branching to a busy flow. The review found no structural regressions, only minor points, and each was declined below.

Declined:
- Move `_own_output_dataset_collection_instances` onto `model.Job` as a property. Its only caller is `summarize_job_outputs`. A model property would suggest the job-to-implicit-HDCA association is wrong in general, but job search, the job cache, access checks, and `/api/jobs/{id}/outputs` all depend on it. Keeping the filter next to the display code keeps that clear.
- Fold `_import_collection_implicit_collection_jobs` into `_import_implicit_collection_jobs`. The HDCA link needs both the HDCA tracker and the ICJ tracker to be filled first. A separate pass that runs right after ICJ import says that directly. Merging the two would mix iteration over collection attrs into the job-store loop.
- Reuse `_output_values` from `test_jobs.py` in `test_histories.py`. It is a one-line comprehension in another test module. Sharing it would mean adding a populator helper on a stable-branch fix, and that is not worth it.

## Details

1. Structure. `summarize_job_outputs` gets one change: the hdca source becomes a helper call. The helper has an early return when the job has no ICJ association, then one comprehension that compares `implicit_collection_jobs_id`. The comparison uses ids, so it needs no extra relationship loads beyond the HDCA. Nothing more to simplify. A broader idea would be to stop associating implicit HDCAs with every mapped job, which would remove the filter altogether. That is out of scope by design, because the association is load-bearing and the branch targets release_26.1.
2. Serialization and import. The `implicit_collection_jobs` key on the HDCA uses `serialization_options.get_identifier`, the same pattern as nearby fields. On import, the new pass skips anything it cannot resolve. That is correct, because the ICJ is only in the store when its jobs were exported, and the comment says so. No added optional parameters, casts, or modes.
3. File size. `model/__init__.py`, `managers/jobs.py` and `model/store/__init__.py` were already well over 1k lines. The branch adds about 40 lines across them and crosses no threshold.
4. Tests. The new API tests share `_list_in_history` and `_displayed_output_values` instead of copying setup code. The unit test builds a realistic map-over shape: the ICJ, one job per element, and the HDCA associated with every job. It checks job order against the element creating-jobs. Acceptable.

Verdict: approve on code quality.
