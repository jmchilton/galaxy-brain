# Initial review — galaxyproject/galaxy#24407

- Profile: `default`
- Model: claude-opus-5-5, effort: medium
- Reviewed commit: `2273ae0bca5` (base `origin/release_26.1`)
- PR: "[26.1] Fail a discovered output collection when its job errors before writing any element" (fixes #24406)

## Verdict

Small, well-placed fix. Approve after considering P2 1. The fix sits in `collect_dynamic_outputs`, which both the non-extended path (`JobWrapper.finish` -> `Tool.discover_outputs`) and the extended-metadata path (`set_metadata.py`) go through. In both paths `final_job_state` is set before discovery, and `job_context.add_dataset_collection(has_collection)` runs after the `try`, so the FAILED state gets exported and imported in extended metadata too. The scheduler (`workflow/run.py` ~L528) already turns a non-populated, non-waiting HDCA into `collection_failed`, so the PR reuses an existing abstraction rather than adding a new failure channel. Runner-side failures (`JobWrapper.fail`) already reached `collection_failed` through `HDCA.waiting_for_elements`. This PR closes the remaining gap: a job that reaches `finish()` with an error exit code and no discovered files. Dynamic outputs that discovered some elements before failing keep their old behavior (populated with errored elements, downstream paused), and that is reasonable.

No security findings.

## Findings

### P2 1: Map-over case changes behavior but is untested, and the outcome may depend on the database

When a tool with a dynamic `list` output is mapped over a list, each job populates a sub-collection (a `DatasetCollection`, not an HDCA) of the implicit `list:list`. `finalize_dataset_collections` (`tools/execute.py` ~L793) marks every sub-collection OK when the jobs are created, *before* they run. So the new `handle_population_failed` on an element whose job failed empty persists, and the parent HDCA becomes non-populated:

- On Postgres, `populated_optimized` checks intermediate collections' `populated_state`, which per its own comment covers empty sub-collections. One failed element out of N should therefore fail the whole downstream invocation with `collection_failed`, pointing at the parent HDCA. Before the PR, the other elements carried on and the failed element dropped out silently. Contrast mapped non-dynamic outputs: one failed element pauses only its downstream jobs, which can then be rerun-and-remapped.
- On SQLite, `populated_optimized` falls back to `_build_nested_collection_attributes_stmt`, which walks leaf DCEs. That comment says it does not handle empty sub-collections, so a FAILED sub-collection with no elements may be invisible there and the old silent-continue behavior would remain. I haven't verified this by running it.

Failing the invocation is arguably the right outcome (it matches the top-level fix's intent: silent data loss is the bug). But it is a user-visible change on a release branch, and the PR description and test don't cover it. Suggest adding a second API test: map `collection_creates_dynamic_list_failbool` over a list where at least one element fails (a `failbool` per element, or reuse an input-driven variant), then assert on the invocation state and the implicit HDCA's `populated_state`. Run it on Postgres (CI) so the DB-specific `populated_optimized` path is exercised. If the SQLite path really does diverge, either extend the leaf-walk branch to consider intermediate states or scope the fix to top-level collections. Calling the divergence out in the PR body would also do.

### P3 1: Comments justify the design rather than state the what

The new code comment in `output_collect.py` and the test's opening comment each spend 2–3 lines explaining why (consumers mapping over zero elements, the invocation completing with no data). That rationale is already in the commit message and PR body. One line, e.g. `# errored job with no discovered elements is a failed population, not an empty one`, would do. The test name already carries the intent.

### P3 2: Compare against `Job.states.ERROR` rather than the `"error"` literal

`output_collect.py` imports from `galaxy.model`, and the sibling check in `model/store/discover.py:201` uses `galaxy.model.Job.states.ERROR`. Using the constant here is consistent and grep-able. (The `"ok"` literal elsewhere in `discover.py` shows the codebase is mixed, so this is a nit.)

### P3 3: Population-failed message overstates what is known

"Job failed before producing any datasets for this collection." Files may have been written but not matched the `discover_datasets` pattern. Something like "Job failed and no datasets were discovered for this collection." is accurate in both cases. Users see this message via `populated_state_message`.

## Notes (not findings)

- No existing test tool combines `discover_datasets` with a fail toggle. `collection_creates_dynamic_nested_fail` writes files before `exit 1`, and `collection_creates_list_of_pairs` uses `structured_like`. So adding `collection_creates_dynamic_list_failbool` is justified, and its name follows the sibling convention.
- An API workflow test is the right layer. A unit test on `collect_dynamic_outputs` would add little here.
- I did not run the API test (per the coordinator's instructions). The PR body says it fails without the change.
