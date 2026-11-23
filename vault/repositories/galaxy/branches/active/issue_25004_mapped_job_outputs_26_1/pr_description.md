Fix 🎯 #25004 - Dataset Details' Job Outputs no longer lists the map-over collection as an output of each mapped job.

Map `cat1` over a three-element list and open Dataset Details for any element. Job Outputs for that element's job:

| Output | Before | After |
|---|---|---|
| `out_file1` | the element's dataset ❌ plus the whole 3-element output list | the element's dataset |

***Long-standing (the association dates from 2021), not a 26.1 regression; it was reported on 26.1.*** Each mapped job made one element, but map-over execution associates the implicit output collection with every job in the map-over, and `summarize_job_outputs` (behind `/api/jobs/{id}/parameters_display` and `/api/datasets/{id}/parameters_display`) listed every associated HDCA. It now skips the HDCA that belongs to the job's own map-over (same `implicit_collection_jobs_id`). A job that isn't part of a map-over, including one whose tool itself creates a collection, keeps its HDCA outputs. A mapped collection-creating job lists its own datasets, not the parent collection.

***Display-only: the job ↔ implicit HDCA association stays, because job search, the job cache, access checks and workflow extraction rely on it. `/api/jobs/{id}/outputs` and `Job.to_dict` are unchanged; the client's tool submission reads them.***

History export didn't record which map-over an HDCA came from, so on an imported history the filter couldn't recognise the collection and the bug came back. A second commit exports `HDCA.implicit_collection_jobs` and relinks it on import. That also gives imported map-over collections `job_source_type == "ImplicitCollectionJobs"`, where before they pointed at a single mapped `Job`. ***The new key is optional: older Galaxies ignore it on import, and commit 3 can be split out. Histories exported before this fix still show the collection after import.***

<details><summary>Tests and commits</summary>

Three commits, 6 files, +196/−1 (about 40 production lines):

1. **Baseline tests** - pin `parameters_display` outputs for a plain `cat1` job (job and dataset endpoints) and an unmapped `collection_creates_pair` job. They pass on `release_26.1`; the second guards against filtering out too much.
2. **The fix** - `_own_output_dataset_collection_instances` in `lib/galaxy/managers/jobs.py`. `test_parameters_display_map_over` and `test_parameters_display_map_over_collection_output` (a collection tool mapped into `list:paired`) fail on `release_26.1` at their output assertions and pass here.
3. **Import keeps HDCA → ICJ links** - `HDCA._serialize` and `ModelImportStore._import_collection_implicit_collection_jobs`. `test_model_store.py::test_import_export_history_with_implicit_collection_jobs` and `test_histories.py::test_import_export_map_over_collection` fail without the store change. Commit 3 stands alone if reviewers prefer it split out.

</details>

## Risks

Risks are minimal - a display filter plus an extra optional key in history exports that older Galaxies ignore on import (a two-way door).

## Context

Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as implemented: display filter plus the import fix.</summary>

Dropping the job ↔ implicit HDCA association would break search, cache and access checks. Filtering `/outputs` or `to_dict` would break `submitAsync.js`. Moving `io_dicts` to the ICJ predicate fixes nothing, because it already overwrites the implicit HDCA with the job's own sub-collection, and it would regress older imports. Showing each job's own sub-collection as a row needs client work and is left for later.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_25004_mapped_job_outputs_26_1/scope_evaluation/). Run via claude-opus-5-5 at low effort.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>No refactor needed; every production hunk is a behavior change.</summary>

History left as three commits: baseline tests, the display fix, the import fix.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_25004_mapped_job_outputs_26_1/baseline_refactor/). Run via claude-opus-5-5 at low effort.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>All four <code>parameters_display</code> tests kept as written.</summary>

With `managers/jobs.py` reverted to `release_26.1`, the two baseline tests pass and the two map-over tests fail at their own assertions. No E2E test was added: the client renders the endpoint payload, which the API tests assert directly.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_25004_mapped_job_outputs_26_1/test_challenges_debrief/). Run via claude-opus-5-5 at low effort.

</details>

### ✅ [N.O.T. M.A.R.I.U.S. Performance Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_PERFORMANCE.md)

<details><summary>No performance problems; no code changed.</summary>

On a single-job detail endpoint, each mapped job adds 1 to 3 primary-key loads, one per declared output collection. That cost doesn't grow with the size of the map-over or the history. This comes from reading the code; nothing was measured.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_25004_mapped_job_outputs_26_1/performance_challenges_debrief/). Run via claude-opus-5-5 at low effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>Two findings, both fixed: imported histories lost the HDCA → ICJ link, and a baseline test only checked a status code.</summary>

The first finding led to commit 3 (export and import of `implicit_collection_jobs`). For the second, the baseline test now asserts the dataset endpoint's outputs.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_25004_mapped_job_outputs_26_1/codex_review/). Run via gpt-6.2-sol.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural regressions; each fix sits in the layer that owns it.</summary>

Declined: moving the filter onto `model.Job`, which would suggest the association is wrong in general; merging the import pass into ICJ import; sharing a one-line test helper across modules.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_25004_mapped_job_outputs_26_1/thermo_nuclear_review/). Run via claude-opus-5-5 at low effort.

</details>

### ✅ [John's Agentic Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All 9 items pass (general + workflow-related).</summary>

- [x] What does the user see when it fails? Nothing new: if a mapped job has no HDCA → ICJ link (e.g. histories imported from pre-fix exports), the filter returns the full list and Dataset Details shows the collection as it does today; the import pass skips missing ICJs/HDCAs.
- [x] Is the diff free of unrelated or stale generated changes? Yes.
- [x] Are unit tests not just testing the literal implementation? Yes. The model-store test checks the round-tripped HDCA links an ICJ whose jobs created its elements; the API tests assert the `parameters_display` payload the UI renders and fail without the fix.
- [x] Are baseline tests in their own leading commits? Yes, `8432a4fb470`, passing on base.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments describe previous implementation or bugs, what purpose do they serve? N/A.
- [x] Which existing workflows change behavior? None execute differently; only the Job Outputs summary for mapped jobs (including workflow map-over steps) drops the parent implicit HDCA.
- [x] Who hits this in practice and what is the evidence? Anyone viewing Dataset Details for a map-over element; reported from UMSA Galaxy on release_26.1 in #25004 with a repro history.
- [x] Were simpler approaches considered? Yes, see Scope Evaluation above.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_25004_mapped_job_outputs_26_1/pr_checklist/). Run via Claude Opus at medium effort.

</details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
