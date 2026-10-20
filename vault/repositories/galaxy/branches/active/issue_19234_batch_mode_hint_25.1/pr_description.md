Fix 🎯 #19234 - the tool form says when a selected collection will be mapped over a collection input, and what each job gets.

Megahit's paired input takes a `paired` collection. Select a `list:paired` instead and Galaxy runs one job per pair, but the form doesn't say so. The old info line only appeared for the form's batch-enabled input modes. A collection mapped over a collection input, or over a multiple `data` input, isn't one, so it never showed. This branch shows it, and says what each job gets instead of only "mapped over".

| | `release_25.1` | This branch |
|---|---|---|
| `list:paired` into a `paired` input | *(no hint)* | The supplied input will be mapped over this tool: one job per dataset pair. |
| `list:list` into a multiple `data` input | *(no hint)* | The supplied input will be mapped over this tool: one job per list. |

<img width="700" alt="collection_paired_test with a paired list selected for the Input pair parameter; below it: The supplied input will be mapped over this tool: one job per dataset pair." src="screenshots/tool_form_map_over_paired_collection_hint.png" />

<details><summary>Nested collection on a multiple <code>data</code> input</summary>

<img width="700" alt="identifier_multiple with a list:list selected for Input 1; below it: The supplied input will be mapped over this tool: one job per list." src="screenshots/tool_form_map_over_nested_collection_hint.png" />

</details>

***Display only: the job request is unchanged. The `batch` flag the form submits uses the same expression as before, extracted as `isBatchSelection`. Workflow run forms show no new hint: a collection given to a workflow input goes to the workflow whole.***

***It's a minimal fix for the batch case in the issue, aimed at `release_25.1` because it's small and the hint logic is unchanged on 26.0. A selection that fills a collection input directly (megahit's co-assembly side) still gets no hint; describing that belongs in a broader `dev` redesign, not a release branch.***

<details><summary>Implementation</summary>

- `variants.ts`: `isBatchSelection(variantBatch, values)` - a batch variant, or any selected value the server tagged with `map_over_type`. Extracted from `createValue` with no behavior change.
- `FormData.vue`: `mapsOver` is a collection on a `data` input (the old condition) or a value with `map_over_type`. For a single selection, `mapOverUnit` names what each job gets from the existing `COLLECTION_TYPE_TO_LABEL` map ("dataset pair", "list"); "dataset" for `single_datasets` or a collection on a `data` input; `<code>type</code> collection` for unlabeled types like `paired_or_unpaired`.
- The `map_over_type` part of the hint is skipped when `flavor` is set, as in both workflow run forms; there the line stays as on `release_25.1` ("batch mode" for batch-enabled module variants only).
- Several selected values get the generic "mapped over" line with no unit.
- The server has tagged options with `map_over_type` since before 25.1, so there are no backend changes.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It adds one line of form text and doesn't change what gets submitted.

<details><summary>Risk Review Advice</summary>

The hint follows the server's `map_over_type`, so it's only as accurate as that tag. On 25.1, a dropped collection can be wrongly tagged as map over by the drop-matching suffix check (#24220, filed for 26.0); the hint now shows for those drops too. That makes the existing mis-tag visible but doesn't cause it.

With several collections selected, the server runs one job per selected collection, and the hint still says the looser "mapped over this tool" with no unit. Left for the `dev` redesign.

</details>

## Context

Targets `release_25.1`; it merges forward into `release_26.0` cleanly. A subset of 🌿[`issue_20657_input_processing_mode`](https://github.com/jmchilton/galaxy/tree/issue_20657_input_processing_mode), the parked `dev` redesign of this hint, which should rebase over it after merge-forward; `isBatchSelection` is copied from it verbatim and the wording matches. Alternative kept on 🌿[`issue_19234_batch_mode_hint_25.1_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_19234_batch_mode_hint_25.1_alt_original_scope) - shows the generic "mapped over this tool." line without naming what each job gets.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep: the hint names the job unit, which answers the issue's batch case.</summary>

A first round expanded the generic "mapped over" line to name the job unit; the second said keep. Everything else is filed separately (#24218, #24219, #24220, #24221, targeting 26.0/26.1) or is unsettled design in the `dev` redesign: a hint for direct collection selection, a pre-selection hint, dropdown markers. Accurate multi-selection wording was the one in-branch candidate, left out because it doesn't touch the reported case and the `dev` redesign replaces it.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>One duplicated predicate folded into a single <code>mapsOver</code> computed.</summary>

The "is this mapped over" rule was written in both the template and `mapOverUnit`; both now read `mapsOver`. Left alone for a backport: the `{ code, text }` unit shape, `FormData.vue` being over 1k lines (already true on 25.1), and the template/computed split - the `dev` redesign restructures all of these.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>All tests kept; each new one fails on the base component at its own assertion.</summary>

The baseline commit passes on unmodified 25.1 (23/23). With the base `FormData.vue` and `variants.ts`, 8 of the 30 head tests fail, each at an `expect`. Tests mount the real component and assert end-anchored hint text, the emitted payload and checkbox presence. Selenium checks the full hint sentence in a live tool form.

</details>

### ✅ Second Frontier Model Review

<details><summary>Codex returned no findings in either round.</summary>

Read-only review of the full diff with surrounding code, including the server's multirun logic in `meta.py`.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary><code>isBatchSelection</code> extracted onto base ahead of the fix.</summary>

`6028edab3f3` is behavior-preserving (jest 23/23, `vue-tsc` clean). Extracting `mapsOver` onto base was considered and skipped: on base it would be a one-use rename of an inline `v-if`.

</details>

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? The hint doesn't show, as before; submission and jobs are unaffected. An unlabeled collection type reads "one job per `type` collection".
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Jest mounts the real component and asserts the rendered hint, the emitted `batch`/`map_over_type` payload and the checkbox; Selenium checks the hint in a live tool form.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `9b6f39b7609` pins the current hint and passes on unmodified 25.1.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None. Display only; the submitted `batch` flag is unchanged.
- [x] Who hits this in practice and what is the evidence? Users of tools like megahit, whose `paired` input runs one job per pair when given a `list:paired`. Reported in #19234 (24.1, usegalaxy.eu).
- [x] Were simpler or existing approaches considered? Yes. The generic "mapped over" line without a job unit was built first and kept as an alternative branch; it's jargon to the reporter. Porting the full `dev` redesign was too large and unsettled for 25.1.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [x] Instructions for manual testing are as follows:

<details><summary>Tests and manual steps</summary>

- `client/src/components/Form/Elements/FormData/FormData.test.js` (`FormData batch hint`): nested `list:paired` on a `paired` input, toggling the selection, a dropped `list:paired`, `single_datasets`, an unlabeled `paired_or_unpaired` type, multiple selections, a nested collection in a workflow run form (no hint), and the existing batch cases.
- `lib/galaxy_test/selenium/test_tool_form.py::TestToolForm::test_map_over_paired_collection_hint` (new) and `test_rerun_dataset_collection_element` (hint assertion added) check the full hint sentence in a live tool form.
- Manually: create a list of pairs, open a tool with a `paired` collection input (e.g. `collection_paired_test`), and select the list. The form should say "The supplied input will be mapped over this tool: one job per dataset pair."

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
