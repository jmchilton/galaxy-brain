Toward 🎯 #20657 - the tool form now says how many jobs Run will start, and won't start a batch the server is going to reject.

| Map a 3-element list over `cat1` | Map over an empty list | Batch a 3-element and a 2-element list together |
|---|---|---|
| ![This will run 3 jobs.](screenshots/tool_form_job_count.png) | ![No jobs will run because a batch input is empty](screenshots/tool_form_job_count_empty_batch.png) | ![Batch inputs must have matching sizes](screenshots/tool_form_job_count_mismatch.png) |
| "This will run 3 jobs." Run stays enabled, and its tooltip ends in " - 3 jobs". | Warns that nothing will run. ***Run stays enabled: mapping over an empty collection is supported on `dev` and creates an empty output collection.*** | Names both inputs with their sizes, qualified by repeat block (`1: Dataset › Select (2)`). Run is disabled, with the reason in its tooltip. |

On `dev`, the tool form says an input "will be mapped over" but never says how many jobs that adds up to. Matched inputs zip, unlinked inputs multiply, and nested collections split at the depth the tool's input asks for, so a `list:list` mapped over a data input, or two unlinked lists, can launch far more jobs than the user expects. A size mismatch between batched collections is only found after Run: `/api/tools` comes back with a 400, and a tool request fails once its task runs. Client validation can't catch it, because it only sees one selection per field.

***The count comes from the server's own expansion classifier, so it can't drift from what Run actually does. It is computed from collection element counts without loading datasets.*** ***Run is blocked only where the server would reject the request anyway: a batch mismatch, or a remap that would run more than one job. Both submission paths reject these, `/api/tools` at submit and tool requests at submit or when their task runs. Every other notice is advisory, and the server still validates every request.***

***The preview counts the flat state the form sends to `build`, but the form usually submits a nested tool request (when celery and tool requests are enabled). Both go through the shared classifier, and parity tests pin the flat count against async expansion, including batches inside repeats, conditionals and sections.***

***Only the tool form uses the preview; the workflow editor and workflow runs are unchanged.*** ***`job_expansion` is a tool-form preview, not a dry-run API: it is omitted when nothing is batched, and `job_count` is null whenever the server can't be sure.***

***The `meta.py` refactor lands first in 🌿[`tool_form_job_count_baseline`](https://github.com/jmchilton/galaxy/tree/tool_form_job_count_baseline); until that merges, this PR's diff includes it.***

<details><summary>What changes</summary>

- **Server.** `/api/tools/{id}/build` returns `job_expansion` (`{job_count, reason, inputs}`) when at least one input is batched, and omits it otherwise. It is skipped in workflow-building mode.
  - `summarize_meta_expansion` in `meta.py` reuses the classifier that `expand_meta_parameters` uses to build jobs. Tests check its counts against `expand_meta_parameters`, and against `expand_meta_parameters_async` for the same request in nested form.
  - Counts come from `DatasetCollection.element_count_at_depth` and `subcollections.split_count`, not from loading elements. A child collection referenced more than once counts once per reference, as the split does.
  - Collection access is checked before anything is counted. The preview never raises: an error, an inaccessible collection or an unknown id gives `reason: "unknown"` with no count.
  - Unknown batch collection ids now raise `ObjectNotFound` (404) in the execution path too, where `dev` gave a 500.
- **Client.** `ToolFormJobCount.vue` shows notices above Run, built by `jobCountNotices` in `jobCount.ts`.
  - A count, with a breakdown when several inputs are batched (`A, B (12 each) × C (3)`).
  - Warnings for an empty batch, a mismatch (sizes or structure), and a remap that would run several jobs. A muted note while a collection is still populating.
  - Input labels are qualified by their section and repeat block titles.
  - The `useJobExpansion` composable keeps the preview with the form data it was built from (for a preview that comes with the tool load, the first values the form reports). The preview is dropped after a failed update, and after an edit that changes a batched input without rebuilding the form (e.g. switching a conditional).
  - `ToolForm.vue` ignores build responses that a newer request has superseded, for both updates and version loads.
  - It also drops a `v-slot:footer` Run button. `ToolCard` has no `footer` slot, so the button never rendered.

</details>

## Risks

One-way door: `job_expansion` becomes part of the `/api/tools/{id}/build` response, and Run now trusts it for mismatches and remaps.

<details><summary>Risk Details</summary>

- API clients of the build endpoint may start reading `job_expansion`. Its shape (`job_count`, `reason`, per-input `name`/`count`/`linked`) is hard to change after that.
- A wrong `batch_mismatch` from the preview would block a valid request. The preview shares the execution classifier and is pinned against `expand_meta_parameters`, and only a definite mismatch blocks: `unknown` and `inputs_not_ready` never do.
- Building the form now runs a count query per level of each batched collection. With two or more linked collections, `match_collections` walks their structure and loads element rows (not datasets), which is the same walk execution already does.
- The `meta.py` refactor moves the execution path onto the shared classifier and loader. Value forms that `__collection_multirun_parameter` already filtered out are dropped. On `dev`, those branches would have crashed anyway.
- Known gap: switching a conditional *into* a branch with a new batched input keeps the old preview until the next rebuild. Run stays enabled, and the server still checks the request on submit.
- Edits made while a tool version is still loading don't start their own build. The load's response replaces the form.
- On the tool request path, a mismatch or multi-job remap that got past the preview would fail after polling, not at submit. Empty batches stay runnable, but `dev` pins them (`test_map_over_empty_collection`) on `/api/tools` only.

</details>

<details><summary>Risk Review Advice</summary>

Review the `job_expansion` shape and the `reason` values as API surface, and check that `runBlockedReason` only blocks on cases the server rejects on both submission paths. In `meta.py`, compare `summarize_meta_expansion` against `expand_meta_parameters` and `expand_meta_parameters_async`: they should classify inputs identically and differ only in counting rather than loading.

</details>

## Context

Builds on 🌿[`tool_form_job_count_baseline`](https://github.com/jmchilton/galaxy/tree/tool_form_job_count_baseline), which lands the baseline tests, the `meta.py` refactor, the `visitInputs` container path and the shared E2E helper first. Split out of 🌿[`issue_20657_input_processing_mode`](https://github.com/jmchilton/galaxy/tree/issue_20657_input_processing_mode), which adds the processing-mode hints for the same issue; either can land first. Alternative kept on 🌿[`tool_form_job_count_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/tool_form_job_count_alt_original_scope) - warnings only, with Run always enabled and unqualified input labels.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as implemented: the earlier recommended expansion (block Run where the server would reject, qualified labels) has already landed.</summary>

The remaining candidates are separate features (a workflow run form count, a request-API dry run, confirming large batches), a measured performance follow-up (`match_collections`), or steps backwards (the warn-only alt, dropping qualified labels, re-merging with `issue_20657`). An empty batch stays runnable, which matches `dev`'s `test_map_over_empty_collection`.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Preview state moved into a `useJobExpansion` composable, and batch detection folded into `summarize_meta_expansion`.</summary>

The preview and the form data it came from used to be two refs in `ToolForm.vue`, written separately in three places. They are now one ref behind a composable. `Tool.to_json` no longer needs its own batch check. Declined: replacing the `buildRequestId` guards with `LastQueue` (it serializes tasks rather than dropping stale responses), and reusing `_is_a_subcollection_type` in `split_count` (it accepts shapes the split rejects; `test_split_count_agrees_with_split` pins the two together).

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Added an end-to-end mismatch test and tightened the client tests.</summary>

Run blocking on a mismatch had been covered only by vitest with faked build responses and by the API test. `test_run_disabled_for_mismatched_batches` now covers it through the real form. It also covers the repeat-qualified label. The `visitInputs` parents test was fixed to fail at its assertion on `dev` rather than with a TypeError. Server tests use a real app and model objects with `expand_meta_parameters` as an oracle.

</details>

### ✅ Second Frontier Model Review

<details><summary>One confirmed bug, fixed red-to-green: a stale mismatch preview could keep Run disabled after a conditional switch.</summary>

Conditional test params don't trigger a rebuild, so the old `batch_mismatch` preview survived a switch that removed one of the inputs. The preview is now dropped once any input it lists has changed since it was built. Covered by "drops a blocking preview once a non-refreshing change edits a batched input" in `ToolForm.test.ts`.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Baseline tests, the `meta.py` refactor, the `visitInputs` container path and the E2E helper come first in the history, and are split out as 🌿`tool_form_job_count_baseline`.</summary>

The history rewrite left the final tree unchanged apart from the added tests. Each base commit passes on `dev` without the feature.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A mismatch or multi-job remap shows a warning, and Run is disabled with the reason in its tooltip. If the preview can't be computed, nothing is shown and Run isn't blocked.
  <details>

  - `summarize_meta_expansion` never raises. Errors become `reason: "unknown"`, logged at debug. The client shows nothing for `unknown`, a muted note for `inputs_not_ready`, and blocks on neither.
  - A failed build drops the preview and keeps the existing "Updating parameters failed" toast.
  - An unknown batch collection id at execution is now a 404 instead of a 500.
  </details>
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Server counts are checked against `expand_meta_parameters` and `_split_dataset_collection` as oracles, and client tests assert rendered text and Run state.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes, and they are split into the baseline PR.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None. The preview is skipped in workflow-building mode, and only the tool form uses it.
- [x] Who hits this in practice and what is the evidence? Anyone mapping a tool over collections. #20657 asks for the form to always explain how collections are processed. A mismatch is only reported after Run on `dev`.
- [x] Were simpler or existing approaches considered? Yes. A warn-only version (the alt branch above) left the "should Run be disabled?" question open, and a client-only count can't see collection sizes or structure.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- Selenium/Playwright (`test_tool_form.py`): `test_job_count_for_batched_collection`, `test_run_enabled_for_empty_batch`, `test_run_disabled_for_mismatched_batches`.
- API (`test_tools.py`): `test_build_job_expansion_over_collection`, `test_build_job_expansion_over_datasets`.
- Unit (`test_meta_expansion.py`): summaries for dataset, `hdca` and `dce` batches; nested `list:list` and `list:list:paired` splits; linked, unlinked and mixed batches; empty, mismatched, unpopulated, inaccessible and unknown collections. Each count is checked against `expand_meta_parameters`. `TestNestedMetaExpansionParity` checks flat counts against nested async expansion for batches in repeats, conditionals and sections. `test_misc.py`: `element_count_at_depth`, including a shared child.
- Client: `jobCount.test.ts` (notices, labels and blocking rules) and the `ToolForm.test.ts` job count tests (stale responses, failed updates, non-refreshing edits after an update or a tool load, Run state for mismatches and remaps).

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
