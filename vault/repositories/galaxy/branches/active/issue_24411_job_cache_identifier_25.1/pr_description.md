Fix 🎯 #24411 - the job cache reuses a job that saw a different `element_identifier` or dataset name, so cached outputs carry the wrong label.

With `use_cached_job`, `JobSearch` treats a job that ran on a dataset as a collection element and a job that ran on the dataset directly as interchangeable. But tools that render `$input.element_identifier` or `$input.name` produce different output in each case, so a cache hit copies an output built from someone else's label:

| Earlier job | Cached request | Base (`release_25.1`) | This branch |
| --- | --- | --- | --- |
| `identifier_single` mapped over a list (`sample_a`) | same tool, plain run on the element's dataset | reuses it ❌ `sample_a` | new job ✅ dataset name |
| plain run on a dataset | same tool mapped over a list holding that dataset | reuses it ❌ dataset name | new job ✅ `sample_a` |
| mapped over a list (`sample_a`) | mapped over another list with the same dataset (`sample_b`) | reuses it ❌ `sample_a` | new job ✅ `sample_b` |
| `$input.name` tool mapped over a list | mapped rerun after the element's dataset is renamed | reuses it ❌ old name | new job ✅ new name |

***The issue says the reverse direction is already guarded; it isn't. The mapped request's `|__identifier__` check is bypassed by the job wrapper's second, name-agnostic search, because reading `element_identifier` never marked the job as name-consuming. This branch fixes all four rows.***

***Only cache misses are added, never new hits. Tools that read neither name nor identifier (e.g. `cat1`) still reuse across plain and mapped runs, and mapped workflow reruns in another history still hit the cache.***

***This targets `release_25.1` because stock XML tools like `identifier_single` return wrong cached output there; the user-defined tool half rides with 🔀 #24434 on `dev`.***

<details><summary>What changed</summary>

- `JobSearch._build_stmt_for_hda` (`managers/jobs.py`): dataset name match now applies to mapped requests too (row 4). A request without an identifier excludes jobs that recorded a `{k}|__identifier__` parameter via `NOT EXISTS` (row 1). Both sit under `require_name_match`, so name-agnostic tools are unaffected.
- `DatasetFilenameWrapper.element_identifier` (`tools/wrappers.py`) sets `consumes_names` on the evaluator, like `.name` already does, so identifier readers skip the name-agnostic late search (rows 2 and 3).
- `ToolEvaluator.__populate_input_dataset_wrappers` passes `tool_evaluator` to its fallback wrappers, matching the other three wrapper constructions.
- Corrects the `Job.copy_from` comment that called the map-over collection branch unreachable.

</details>

<details><summary>Tests</summary>

- Baseline commit (passes on base): mapped rerun reuses a mapped job; a name-agnostic plain run reuses a mapped job; a mapped workflow rerun in a copied history reuses the `identifier_single` step's job.
- Fix commits: one API test per table row in `test_jobs.py`. All four fail on `release_25.1` at their own `copied_from_job_id` assertion. Reverting `jobs.py` or `wrappers.py` alone turns its rows red again.
- The rename test runs as a fresh user (`_different_user_with_address`); `test_model_attributes_sanitization` now uses the same helper so neither writes an address onto the shared API test user.

</details>

## Risks

Risks are minimal - the change only narrows job cache matching and is cheap to revert (a two-way door).

<details><summary>Risk Details</summary>

- Tools that read only `element_identifier` now also need a dataset name match on mapped reruns, so renaming an element's dataset loses the cache hit. That's a lost hit, not a wrong one.
- Doesn't fix #24411 for user-defined tools on its own: `UserToolEvaluator` setting `consumes_names` rides with 🔀 #24434 on `dev`.
- The `NOT EXISTS` subquery adds work to cache searches for plain requests on name-consuming tools.

</details>

<details><summary>Risk Review Advice</summary>

Check that the name and `NOT EXISTS` conditions in `_build_stmt_for_hda` stay under `require_name_match`, so the name-agnostic search keeps its hits. Then check that setting `consumes_names` from `element_identifier` is the right signal for the job wrapper's late search.

</details>

## Context

Related to 🔀 #24434, which fixes #24410 (UDT `element_identifier`) and carries the `UserToolEvaluator` half of this fix. Alternative kept on 🌿[`issue_24411_job_cache_identifier_25.1_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_24411_job_cache_identifier_25.1_alt_original_scope) - rows 1-3 only: no name match for mapped requests, no fallback-wrapper `tool_evaluator`, old comment kept. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep scope after one re-scope (name match for mapped requests).</summary>

- Round 1 widened to the reverse direction and the mapped stale-name mirror case; both now have red tests.
- The UDT `consumes_names` one-liner stays with #24434 on `dev`.
- Remaining candidates (unified label predicate, `consumes_names` split, collection-output `copy_from`) are dev refactors or have no repro.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approve; one pure move applied.</summary>

- The name condition was hoisted above `identifier_key` so the re-scope diff reads as a plain hoist.
- Deferred to `dev`: one "label the job saw" predicate, an `|__identifier__` key helper, splitting `consumes_names`.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>No tests dropped; workflow test strengthened.</summary>

- The workflow test now asserts `copied_from_job_id` equals the first invocation's job, not just truthy.
- Red/green checked against base, the pre-rescope fix, and each production file reverted alone.
- The `evaluation.py` one-liner has no red test; no test tool reaches the fallback path through `.name`.

</details>

### ✅ Second Frontier Model Review

<details><summary>Two P1s, both refuted by running them.</summary>

- "Identifier-only tools lose workflow cache hits": the scenario is the branch's baseline workflow test, which passes; element output names match across histories.
- "Plain reuse of a mapped collection-producing job fails in `copy_from`": not reproduced on base or branch with a throwaway API test.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>No base refactor; baseline tests lead the branch.</summary>

- Every candidate was a behavior change or a `dev`-only refactor.

</details>

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Nothing new - a cached request that no longer matches just runs a fresh job.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. API tests assert output content and `copied_from_job_id`, not SQL or wrapper internals.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes - `Baseline tests: ...` pins the cache hits that must survive and passes on base.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.
- [x] Which existing workflows change behavior (if any)? `use_cached_job` reruns whose steps read `$input.element_identifier` or `$input.name` now miss when the identifier or name differs; same-identifier mapped reruns still hit, across histories too.
- [x] Who hits this in practice and what is the evidence? Job cache users with collections built from existing datasets (identifier ≠ dataset name); the #24411 repro with stock `identifier_single`. No external report yet.
- [x] Were simpler or existing approaches considered? Yes - the issue's guard alone misses rows 2-4; the alt branch drops row 4 to keep identifier-only hits after a rename.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
