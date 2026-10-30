Lands ahead of 🔀 #24225 the fixes from it whose bugs also exist on 26.1 - extracting a workflow from a history holding copies of a dataset or collection fails or builds the wrong inputs, and PDF export shows the default report's invocation sections as raw directives.

***The Extract Workflow form, its summary API and by-ids extraction are new in 26.1 and shipped in 26.1.0–26.1.2; #24225 stays a draft for its notebook work, which 26.1 doesn't have.***

On `release_26.1`, copy a list into the same history and open Extract Workflow. The input card lists the source collection twice and never the copy, and submitting the form fails:

| Before (`release_26.1`) | After |
|---|---|
| ![Extract Workflow form listing "1: Test Dataset Collection" twice in one input card](screenshots/before_workflow_extract_collection_with_copy.png) | ![Extract Workflow form with one input collection card listing hids 1 and 6](screenshots/workflow_extract_collection_with_copy.png) |
| ![Red alert "hdca_ids contains duplicates" after Create Workflow](screenshots/before_workflow_extract_collection_with_copy_submitted.png) | Creates a one-input workflow. |

The same root - copies of one original treated as unrelated items - breaks extraction in several more ways on 26.1, and two neighboring endpoints answer bad input with a 500 or an all-or-nothing 403:

- **Hid and by-ids extraction:** copies of one original become one workflow input, wired whichever copy is sent. Tool outputs with in-history copies (hid) and implicitly converted inputs (by-ids) now connect instead of dangling. Hid extraction of a collection copied in from another history no longer fails with "hid N does not appear to be a collection". Copies sent under different names → 400.
- **Extraction summary:** one input card per original, listing this history's copies (hids), so the form posts local ids instead of a duplicated - or, once the source history goes private, unreachable - source id. A row for another user's (or a deactivated) user-defined tool is marked `custom_tool_inaccessible` instead of 403ing the whole summary.
- **Input names not parallel to their ids/hids:** 400 instead of 500.
- **PDF/basic export:** the default report's `invocation_inputs()`/`invocation_outputs()` expand to the datasets by id, so they render instead of appearing as raw directives.

***This is a port, not new design: every fix and nearly every test is #24225's, reshaped onto 26.1's code (keys stay 26.1's `("dataset"|"collection", id)`, helper names match #24225).*** Three 26.1-only tests: job-less collection copies in the summary, explicit empty by-ids input names (26.1 only; 26.2 rejects empty names), and the E2E test above. ***Most of the diff is tests: the non-test change is +257/−170.*** One deliberate divergence: by-ids default input names keep an explicit `""` (`is not None`), as base does; #24225 still uses `or`.

***This lands first, and the merge-forward is already done:*** 🌿[`extraction_hid_copies_pdf_sections_26.1_merge_26.2`](https://github.com/jmchilton/galaxy/tree/extraction_hid_copies_pdf_sections_26.1_merge_26.2) merges this branch into `release_26.2`, resolving each conflict with #24225's 26.2 version of the same fix. API `test_workflow_extraction.py` passes there (107 passed); the 26.1-only empty-name test is dropped in the merge, since 26.2 already rejects empty input names with a 400. #24225 then rebases onto that merge (🌿[`extract_next_followups_on_26.1_merge`](https://github.com/jmchilton/galaxy/tree/extract_next_followups_on_26.1_merge)) and shrinks to its notebook work.

<details><summary>Commits</summary>

1. Baseline tests: hid extraction connects an implicitly converted input (passes on base).
2. Route by-ids extraction test helpers through `_extract_by_ids[_raw]` (test-only refactor).
3. Build extraction summary input rows in one `input_row` helper (no behavior change).
4. PDF export: `invocation_inputs`/`invocation_outputs` expand to object ids (`markdown_util.py`, independent of the rest).
5. Extraction: copies of one original are one input; 400 for unparallel names; per-row `custom_tool_inaccessible`.
6. Extraction summary: one input card per original, listing in-history copies.
7. Test: job-less collection copies share one input card.
8. E2E: the form extracts a list and its in-history copy as one input (+2 `navigation.yml` selectors).

Commit 4 is independent and could ship alone; commits 6-8 need commit 5. Split options are in the scope evaluation below.

</details>

## Risks

The one-way door is a small API-shape change on a release branch: the extraction summary now groups input rows by original (more rows for multi-file uploads, local ids for collection copies), and malformed extraction payloads now get 400s. ***The summary's schema is unchanged and 26.1's own form is its only client; rows regroup by original, and payloads that used to 500 now 400. Only requests that already built a workflow with a dangling input, or hit a 500, are now rejected.***

<details><summary>Risk Details</summary>

- `GET /api/histories/{id}/extraction_summary` input rows: one per original rather than one per producing job, so a multi-file upload yields one card per file, and collection rows list this history's copies rather than the source HDCA. The response schema is unchanged; the client already handles it.
- Extraction requests whose names aren't parallel to their ids/hids, or that send copies of one original under different names, now get 400 (previously 500, or silently wrong workflows).
- `custom_tool_inaccessible` was already a summary row field; it's now set instead of failing the whole request.
- Merge-forward conflicts in 7 files (26.2 moved the summary into `workflow_extraction_summary.py` and reshaped `extract.py`); the prepared merge resolves them, and a merge that instead takes 26.2's side would drop these fixes while their tests come through and fail.

</details>

<details><summary>Risk Review Advice</summary>

Focus on `create_workflow_extraction_summary` in `histories.py` - the only substantial 26.1-specific code, which the merge-forward replaces with 26.2's `workflow_extraction_summary.py`. Check that grouping by `_original_key` and listing `contents_iter` collections matches what `extract.py` accepts. `extract.py` mirrors draft #24225, so it needs review here; each change is pinned by a test that fails on base.

</details>

## Context

The 26.1-applicable half of 🔀 #24225 (draft on `release_26.2`), landed first; its notebook-to-workflow parts have no 26.1 counterpart. Merge-forward prepared on 🌿[`extraction_hid_copies_pdf_sections_26.1_merge_26.2`](https://github.com/jmchilton/galaxy/tree/extraction_hid_copies_pdf_sections_26.1_merge_26.2); #24225 rebased onto it on 🌿[`extract_next_followups_on_26.1_merge`](https://github.com/jmchilton/galaxy/tree/extract_next_followups_on_26.1_merge). Alternative kept on 🌿[`extraction_hid_copies_pdf_sections_26.1_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/extraction_hid_copies_pdf_sections_26.1_alt_original_scope) - extraction-layer fixes only, no summary-card change; the 26.1 form still posts duplicate `hdca_ids` and can reach the new "different names" 400. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [John's Agentic Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All 6 items pass; bad extraction input now gets a 400 naming the fields, not a 500.</summary>

- [x] What does the user see when it fails? A 400 naming the offending fields, not a 500; the summary flags an inaccessible user-tool row instead of returning 403.
<details>

- Names not parallel to their ids or hids: `RequestParameterInvalidException` "dataset_names has 1 entries but dataset_hids has 2; they must be parallel" (`_validate_parallel_names`, `services/workflows.py`). Before this it was a 500 (IndexError).
- Copies of one original sent with different names: 400 "hda_ids includes copies of one dataset with different dataset_names: 'numbers' and 'digits'" (`_copies_named_differently`). The form can't send this because it shows one card per original (`d3e327d5dcd`).
- A collection hid that isn't a collection still gives a 400 "hid N does not appear to be a collection", now raised from `group_hid_inputs_by_original`.
- Summary with another user's tool, or a deactivated one: the row is `invalid="custom_tool_inaccessible"`, `checked=False` (widened `except` in `histories.py`), where the whole summary used to 403.
- PDF/basic export: unlabeled or empty invocation associations are left out (`_invocation_section` returns `""`). Raw directives no longer leak into the output.
</details>

- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. `test_invocation_sections_render_contents` checks the rendered PDF/basic markdown (contents, headings, no leftover `galaxy` fences). The `test_workflow_markdown.py` asserts on the expanded directive text, which is the contract `resolve_invocation_markdown` hands to `to_basic_markdown`, and they also run `validate_galaxy_markdown` on the result. The extraction behavior is covered by API tests.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `aa07cf68c2f` (hid path connects an implicitly converted input) passes on base and comes first. The other new tests fail on base (except `test_extract_by_ids_keeps_empty_input_name`, which guards a draft regression), so they ship with their fixes.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/extraction_hid_copies_pdf_sections_26.1/pr_checklist/). Run via Claude Opus 5.5 at medium effort.

</details>

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as implemented (second evaluation, after one expansion).</summary>

- First evaluation recommended expanding to the summary-card half of #24225; its symptoms (duplicate `hdca_ids` 400, one card per job-less copy) reproduced red, then were fixed.
- Every remaining #24225 commit is notebook/26.2-only, a fix #24225 itself still needs, or behavior #24225 also leaves unchanged on the history path.
- Leftover, deferred to dev: tool rows for copied cross-history tool outputs still list the source HDCA.
- Split options offered: PDF fix alone (B), extraction then summary (C), by concern (D).

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/extraction_hid_copies_pdf_sections_26.1/scope_evaluation/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No changes; structural cleanups declined because merge-forward replaces the code with #24225's.</summary>

- Flagged in the new summary code: four closures sharing state, a mixed row/placeholder list, input classification that could be hoisted. 26.2 restructures all of it.
- Ported `extract.py`/`markdown_util.py` code is kept identical to #24225 except the by-ids `is not None` names; unifying `InputGroup`/`HidInputGroup` deferred to dev.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/extraction_hid_copies_pdf_sections_26.1/thermo_nuclear_review/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>One finding, fixed: the branch's draft of by-ids extraction turned an explicit empty input name into "Input Dataset".</summary>

Now uses `is not None`, as base and the hid path do, with a red→green test `test_extract_by_ids_keeps_empty_input_name`. #24225 still has the `or` form.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/extraction_hid_copies_pdf_sections_26.1/codex_review/). Run via gpt-6-sol at medium effort.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Added the E2E test for the form-level symptom; all other tests kept.</summary>

- On bare `release_26.1` the Baseline test passes and 16 of the 17 other branch-added API tests fail at their own assertion; `test_extract_by_ids_keeps_empty_input_name` passes on base (it guards a draft regression).
- The new Selenium/Playwright test asserts one input-collection card listing both hids, then a one-input `list` workflow; passes under Playwright.
- Ported tests match #24225's text for merge-forward.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/extraction_hid_copies_pdf_sections_26.1/test_challenges_debrief/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Two refactors moved ahead of the fixes: by-ids test helpers, and one <code>input_row</code> summary helper.</summary>

The summary fix's `histories.py` diff shrank from +46/−31 to +29/−5, leaving just the grouping.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/extraction_hid_copies_pdf_sections_26.1/baseline_refactor/). Run via Claude Opus 5.5 at high effort.

</details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details>

API `test_workflow_extraction.py` (copies, converted inputs, name 400s, summary cards, user-tool rows), unit markdown export tests, and Selenium `test_extract_collection_with_in_history_copy`.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
