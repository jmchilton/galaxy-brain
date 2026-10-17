Fix 🎯 #24221 - paged collection options drop a collection's "map over" entry, and on 26.1 that entry couldn't be picked anyway.

A collection input that accepts several collection types lists some collections twice: once to use directly, once to map over. **Extract dataset** does this for every plain `list` in the history. On 26.1 the two rows look identical, and clicking the second one selects both:

| `release_26.1` | This PR |
| --- | --- |
| <img width="420" alt="Extract dataset Input List dropdown on release_26.1: 4: samples (list) listed twice with identical labels; after clicking the second row both rows are highlighted" src="screenshots/02_before_extract_dataset_mapover_row_clicked.png" /> | <img width="420" alt="Extract dataset Input List dropdown on this branch: 4: samples (list) and 4: samples (list) (one job per dataset) as distinct rows; only the map-over row is checked" src="screenshots/07_after_extract_dataset_mapover_selected_reopened.png" /> |

Past the first page of options (50 by default), the map-over row can also just vanish. The server ends a page partway through a collection's two entries and `has_more` counts history rows, so the second entry is never requested. When it is requested, both the tool form and the workflow run form merge pages by `id`+`src` and throw it away as a duplicate. The workflow run form drops it even when both entries arrive on the same page. The issue has the full table and a reproduction.

***Any history with a plain `list` hits the selection bug in Extract dataset; paging is a second way to lose the row. The "(one job per …)" suffix is part of the fix: without it the two rows are identical and only one can be picked.***

***This doesn't change how anything runs. The server already runs direct and mapped-over submissions correctly (existing `list` → dataset map-over API tests, plus a new baseline test for a `list:list` used whole or mapped over). This PR fixes which option the form lists, keeps and submits.***

***Values the server fills in (first load, rerun) still select the direct row; that's 🎯 #24219's territory, and drag-and-drop matching is 🎯 #24220.***

<details><summary>What changes</summary>

- **Server** (`pagination.py`): `accumulate_with_filter` finishes the row it's on, so a page can return `limit + 1` entries rather than splitting a collection across pages. This is the same fix as on dev.
- **Client page merge**: `ToolForm.vue` and `WorkflowRunDefaultStep.vue` share a new `mergeDataOptions`, keyed on `src`+`id`+`map_over_type`.
- **Selection identity** (`FormData`): `itemUniqueKey` includes `map_over_type`. `findDataOption` tries the exact entry first, then any entry for the same item, so values without `map_over_type` still resolve to the direct row as before. The keep-option cache, the `createValue` dedupe, incoming-value normalization and the drag-enter duplicate check all go through these helpers. Several of them used to match on `id` alone.
- **Label**: on collection inputs, map-over rows get ` (one job per <unit>)` (`dataset`, `list`, `dataset pair`, …). Dataset inputs get no suffix.

The helpers are line-for-line the ones on dev (from the `issue_20657_input_processing_mode` work), so merging forward should be easy. Dev shows a badge through a FormSelect `label-area` slot that 26.1 doesn't have, so here the label is plain text.

</details>

<details><summary>Known gaps (unchanged from 26.1, out of scope)</summary>

- **A value the server seeds still selects the direct row.** That covers first load, rerun and `replaceParams`. `/build` doesn't echo `map_over_type` in `value`, and fixing that means carrying map-over state through tool state, which belongs with the refresh/state work in 🎯 #24219.
- **Client search matches the suffix text**, so typing "one job" filters to map-over rows.
- Drag-and-drop matching of dropped collections is 🎯 #24220.

</details>

## Risks

Risks are minimal. It's a two-way door: a label suffix, one more page entry at most, and a client-side identity key. No API fields, stored state or workflow format change.

<details><summary>Risk Details</summary>

- Clients that assume a paged options response holds at most `limit` entries could be surprised. A page can now hold `limit + 1` when a collection's two entries straddle the limit. `has_more` and `offset` keep their meaning.
- FormData selection lookups change at about six call sites on a release branch. Where `id`-only matching used to pick an hda for an hdca with the same encoded id (or the other way round), it now matches on `src` too.
- Map-over labels show a new "(one job per …)" suffix in tool and workflow run forms.

</details>

<details><summary>Risk Review Advice</summary>

Look closely at `findDataOption`'s fallback and the `FormData.vue` call sites that used to match on `id` alone (keep-replace, `createValue`, `normalizeOption`). Those are where a value without `map_over_type`, or a cached keep option, has to keep resolving to the same row as before. The server change is a two-line loop change that lets a page exceed `limit` by one. Check the comment's claim that an offset landing mid-row still resumes correctly once merges key on `map_over_type`.

</details>

## Context

Regression from 🔀 #22643 (26.1), which added option paging and listed both entries per collection. 🔀 #23384 added the workflow run form merge. Backports the #24221 commits on 🌿[`issue_20657_input_processing_mode`](https://github.com/jmchilton/galaxy/tree/issue_20657_input_processing_mode); the server commit is cherry-picked and the client is hand-ported, since 26.1's forms use the Options API. If this lands first, the matching commits drop out of that branch. Sibling paging bug: 🎯 #24219. Alternative kept on 🌿[`issue_24221_paged_map_over_options_26.1_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_24221_paged_map_over_options_26.1_alt_original_scope): the server fix and page merge only, which restores the row on later pages but leaves it identical to the direct row and impossible to select.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as is. The re-scope makes the restored row selectable, and the remaining nearby work is either not modest or owned by another branch.</summary>

- Expanded once, from the original scope (server fix plus page merge) to include selection identity and the label. A probe test showed that on 26.1 the restored row shared the direct row's key and label, so it couldn't be picked.
- Rejected expansions: `/build` echoing `map_over_type` (state-model change, overlaps #24219), folding in the #24220 drop fixes (own branch), dev's shared merge helpers (no behavior change on 26.1), and dev's final per-item `createValue` rule (can't be reached on 26.1).
- Decompositions considered: server/client split, or a three-way stack. One PR is fine at +343/-64, about 237 lines of it tests.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>One behavior-preserving commit adds the id+src lookup helpers before the fix.</summary>

- `27506823dcb` adds `isSameItem`/`findDataOption` and routes FormData's value lookups and keep-option keys through them. This is the FormData/types half of the matching dev commit, applied verbatim. The final tree is identical.
- Left in the fix commits, because they change behavior: `mergeDataOptions` (a single id+src helper would have made ToolForm drop same-page map-over entries), the `id`-only call sites, and `handleIncoming`'s rewire.
- It can be squashed into the map-over commit if reviewers want fewer commits.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Every new test fails without its fix commit at its own assertion; tests that passed on base moved into the baseline commit.</summary>

- Replaced a helper-only `types.test.ts`, which failed at import on base, with component tests at both `mergeDataOptions` call sites (ToolForm, WorkflowRunDefaultStep). Each one fails on base at its own assertion.
- Added a baseline API test running `collection_list_or_nested_list_input` with a `list:list` both directly and mapped over. Nothing else covered submitting a map-over for a collection that also matches the input directly.
- The API paging test flips from "splits direct and multirun entries" (baseline) to "keeps them together" (fix). With base `pagination.py`, the fix version fails at its first assertion.
- Moved the "collections on a dataset input are unlabelled" FormData test into the baseline, since it passes on base.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural blockers. One duplication (`handleIncoming` repeating `normalizeOption`) was removed.</summary>

- The re-scope dropped a second identity key (`pageMergeKey`). One key (`itemUniqueKey`) now serves selection, the keep cache, dedupe, page merge and `trackBy`, and the fallback lives only in `findDataOption`.
- Not acted on, to keep dev parity or because they predate the branch: `findDataOption`'s accessor generic, the exported `isSameItem`, the near-duplicate `mergeFetchedOptions` bodies, and `FormData.vue`'s size (1318 lines on base).

</details>

### ✅ Second Frontier Model Review

<details><summary>Codex found nothing in round 2.</summary>

It reviewed the full diff and the surrounding code (`basic.py`, `variants.ts`, FormSelect). Its sandbox blocked pytest/vitest, so it ran the Python assertions and some extra multi-match boundary checks directly.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A value whose map-over entry isn't listed falls back to the direct row without a message, as on 26.1. Server-seeded values (first load, rerun) still land on the direct row (see Known gaps).
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The FormData tests assert rendered labels, selection and emitted values; the pagination unit tests drive `accumulate_with_filter` with fake rows, including a two-entry row at the limit; the API tests check `/build` pages and job results.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes, `Baseline tests for option paging`, which passes on `release_26.1`.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None at execution. On the run form, map-over rows for multi-type collection inputs are labelled, survive page merges and can be selected.
- [x] Who hits this in practice and what is the evidence? Anyone mapping a collection over a multi-type collection input, starting with Extract dataset on any plain `list`. The evidence is the issue's API and merge reproductions plus the before/after screenshots. There's no user report yet.
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes. Server fix plus page merge only (kept as the alt branch) restores a row nobody can select. Echoing `map_over_type` from `/build` is a state-model change that belongs with #24219.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Test coverage</summary>

- Unit: `test/unit/app/tools/test_parameter_pagination.py`, including a two-entry row that reaches the limit (fails on `release_26.1`) and an offset that lands mid-row.
- API: `test_tools.py -k "test_build_collection_options or test_build_data_options or pagination"` (13 cases) and `test_tool_execute.py::test_list_of_lists_direct_or_mapped_over_list_or_nested_list_input`.
- Client: `FormData.test.ts`, `ToolForm.test.js`, `WorkflowRunDefaultStep.test.js`. Locally, the vitest Form/Tool/Workflow/Run suites pass 295/295 and vue-tsc is clean.

</details>

- [x] Instructions for manual testing are as follows:
  1. In a history with a `list`, open Extract dataset (`__EXTRACT_DATASET__`). The Input List dropdown shows `samples (list)` and `samples (list) (one job per dataset)` as separate rows, and selecting the second checks only that row.

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
