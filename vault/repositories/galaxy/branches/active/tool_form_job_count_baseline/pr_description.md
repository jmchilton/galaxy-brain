Refactor ahead of 🌿[`tool_form_job_count`](https://github.com/jmchilton/galaxy/tree/tool_form_job_count) - the tool form previews how many jobs Run will start, and blocks batches the server would reject.

<details><summary>This shouldn't change Galaxy's behavior - ***this only adds tests and refactoring aimed at making our main PR easier to review***.</summary>

I'm so sorry to give you more to review but John (the human) has deemed the base branch complex and thinks the quality of the main and more important review will go up if we get these more mechanical changes out of the way ahead of time. 
</details>

***One deliberate exception to "no behavior change": an unknown batch `hdca`/`dce` id now returns a 404 (`ObjectNotFound`) instead of a 500.***

<details><summary>The main PR for 🌿[`tool_form_job_count`](https://github.com/jmchilton/galaxy/tree/tool_form_job_count) will have the sales pitch for the feature and approach but some details are here.</summary>

- `/api/tools/{id}/build` gains a `job_expansion` preview, counted with the expansion classifier refactored here and from collection element counts, without loading datasets.
- The tool form shows "This will run N jobs." with a breakdown, and warns about empty batches, size mismatches and multi-job remaps. Batched inputs are labelled with their section and repeat block titles.
- Run is disabled only where `/api/tools` would reject the request: a batch mismatch, or a remap onto more than one job. An empty batch stays runnable.
- Only the tool form changes. The workflow editor and workflow run form are untouched.
</details>

## The Refactorings

- Sharing one batch classifier and collection loader across `expand_meta_parameters`, `expand_meta_parameters_async` and `validate_matched_batch_lengths` (`meta.py`) is used by 🌿[`tool_form_job_count`](https://github.com/jmchilton/galaxy/tree/tool_form_job_count) to count jobs with the same classification execution uses, instead of a third copy.
- Passing enclosing sections, conditionals and repeat blocks to `visitInputs` callbacks, plus `findInputPathByDottedName` (which `findInputByDottedName` now uses), is used by 🌿[`tool_form_job_count`](https://github.com/jmchilton/galaxy/tree/tool_form_job_count) to label batched inputs with their section and repeat titles.
- Sharing `repeatTitle` with `FormRepeat` is used by 🌿[`tool_form_job_count`](https://github.com/jmchilton/galaxy/tree/tool_form_job_count) so those labels match the repeat headings on the form.
- Moving collection selection into `NavigatesGalaxy.tool_form_select_collection` is used by 🌿[`tool_form_job_count`](https://github.com/jmchilton/galaxy/tree/tool_form_job_count)'s E2E tests to pick batch collections. Here it replaces a sleep in `test_rerun_dataset_collection_element` with a wait.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- The `meta.py` refactor drops the bare-id, `"id|subcollection_type"` string and non-dict batch value forms. `__collection_multirun_parameter` only lets through dicts whose `src` is `hdca` or `dce`, so these can't be reached. On `dev` the sync branches for them never set `src`, so they would have crashed anyway.
- `validate_matched_batch_lengths` now treats a value without `__class__` as a batch, as `expand_meta_parameters_async` already did. Request validation runs first and requires `__class__`, so this can't come up.
- An unknown batch id was a `NoResultFound` (sync) or an `AttributeError` (async), both 500s. Both paths now raise `ObjectNotFound`.
- `visitInputs` callbacks get a fourth argument. Existing callbacks ignore it.

</details>

<details><summary>Risk Review Advice</summary>

The `meta.py` commit is the one to read closely. Check that `_meta_value_classifier` classifies each value form exactly as the three old classifiers did, for both flat and nested state. The baseline tests in the first commit pin dataset, `hdca` and `dce` batches, nested splits, linked and unlinked batches, and the mismatch errors on `dev` before the refactor.

</details>

## Context

Groundwork for 🎯 #20657 through 🌿[`tool_form_job_count`](https://github.com/jmchilton/galaxy/tree/tool_form_job_count), which shows how many jobs a batched tool request will run.

## Process

These baseline tests were written ahead of the main change by [John's Implementation Agent](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_workhorse/AGENTS.md#baseline-tests).

Base branch refactoring and rebasing happens automatically during implementation using [John's Refactor Baseline Process](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

This branch was created during John's normal branch polishing process using the [Decompose Baseline Process](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_branches/DECOMPOSE_BASELINE_CHANGES_AND_POLISH.md)

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? An unknown batch collection id gives a 404 naming the missing collection type instead of a 500. Other failures are unchanged and pinned by the baseline tests.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They assert job counts, per-job states and raised exception types, rendered repeat titles and lookup results.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. The first two commits pass on `dev`, and the tests for the 404 and the container path come with their changes.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [x] This is a refactoring of components with existing test coverage.

<details><summary>Tests</summary>

- `test/unit/app/tools/test_meta_expansion.py` (new): sync and async expansion over dataset, `hdca` and `dce` batches, nested splits, linked and unlinked batches, mismatches, and `validate_matched_batch_lengths`. Written and passing on `dev` before the refactor. The unknown-id tests fail on `dev` and pass here.
- `Form/utilities.test.js`: `findInputByDottedName` across sections, repeats and conditionals (passes on `dev`). New tests for `visitInputs` parents and `findInputPathByDottedName` fail on `dev` at their assertions.
- `Form/FormRepeat.test.ts` (new): repeat block titles.
- `test_tool_form.py::test_rerun_dataset_collection_element` exercises the E2E helper.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
