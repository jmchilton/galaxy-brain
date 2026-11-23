Run via Claude Opus at medium effort.

## General

- [x] What does the user see when it fails? Nothing new: if a mapped job has no HDCA→ICJ link (e.g. histories imported from pre-fix exports), `_own_output_dataset_collection_instances` (`lib/galaxy/managers/jobs.py:2197`) returns the full list and Dataset Details shows the collection as it does today; the import pass (`lib/galaxy/model/store/__init__.py:1462`) silently skips missing ICJs/HDCAs.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. `test_import_export_history_with_implicit_collection_jobs` (`test/unit/data/model/test_model_store.py:895`) checks the round-tripped HDCA links a new ICJ whose jobs are the elements' creating jobs; API tests (`test_parameters_display_map_over`, `test_parameters_display_map_over_collection_output`, `test_import_export_map_over_collection`) assert the `parameters_display` payload the UI renders, and fail without the fix.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes, `8432a4fb470` (`test_parameters_display` output assertions + `test_parameters_display_collection_output`), passing on base per `test_challenges_debrief.md`.
- [x] Are the comments free of excess archeology? Yes. The helper docstring describes current map-over association behavior; the rest are one-line `Regression test for ...#25004` and short intent notes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## Workflow-related

- [x] Which existing workflows change behavior (if any)? None execute differently; only the Job Outputs summary for mapped jobs (including workflow map-over steps) drops the parent implicit HDCA, and imported histories regain `HDCA.implicit_collection_jobs` (`job_source_type == "ImplicitCollectionJobs"`). `/api/jobs/{id}/outputs`, `Job.to_dict`, job search/cache and `io_dicts` are unchanged.
- [x] Who hits this in practice and what is the evidence? Any user viewing Dataset Details for an element of a map-over output; reported from UMSA Galaxy on release_26.1 via #25004 (CESNET/usegalaxy#406, repro history on usegalaxy.org, `recetox_aplcms_remove_noise`); root cause dates to 2021.
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes (`scope_evaluation.md`): removing the job↔implicit-HDCA association breaks search/cache/access checks; filtering `/outputs`/`to_dict` breaks `submitAsync.js`; switching `io_dicts` to the ICJ predicate fixes nothing and regresses older imports; a name heuristic for imported jobs was rejected in favor of exporting the real link.
