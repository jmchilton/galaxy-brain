Follow-up to 🔀 #22860 - fixes the bugs in notebook-to-workflow extraction before it first ships in 26.2.0, and aligns its new API names with the histories route.

| Notebook referencing a copied-in output: one pre-checked input wired to its consumer | The extracted workflow's report runs on fresh data, and notes what it dropped |
| --- | --- |
| ![Extract form seeded from a notebook: the copied-in cat1 output is one input card, its consumer is checked with a locked star](screenshots/notebook_extract_copied_input_form.png) | ![Workflow preview after extraction with a persistent "Notebook report notes" toast listing a dropped inline reference](screenshots/notebook_extract_report_warnings_toast.png) |

***Without this, 26.2.0 ships a regression from 26.1 and a pages API name Galaxy would have to keep.*** ***These are fixes, not new features: bugs in the code #22860 added, plus two older extraction and export bugs it brought into view.***

**The regression.** #22860 added a check that rejects labels its report directives can't quote. The plain history form names each input after its dataset by default, so on `release_26.2` checking a dataset named `my "reads"` makes Create Workflow return a 400 until you rename the input. API callers passing such names hit it on the legacy hid path too. 26.1 has no such check. This PR accepts those names again. Only a notebook report directive that would need the bad label is dropped, with a warning.

Each fix below was reproduced as a failing API or unit test first.

| Before (on `release_26.2`) | After |
| --- | --- |
| A notebook referencing a tool output copied in from another history leaves the extracted tool's input dangling | The copy becomes one pre-checked input, wired to its consumer |
| Inline embeds, visualization cells and some directive forms (quoted or spaced ids, `hid=`) keep the notebook's object ids, so the workflow's invocation reports show the notebook's data | Anything still naming an object from the notebook's history is dropped with a warning |
| Un-starring an output the report references is silently undone: the server exposes it again under a generated label | The form locks that star with a tooltip; API clients that skip it get a warning naming the output |
| An empty notebook, or one whose content is all dropped references, gets a blank report | The default report is kept |
| Checking an input card that lists in-history copies disables Create ("Step labels must be unique"); the API returns 400 for the repeated name | Copies of one original are one input |
| Report notes appear in a toast that vanishes after 3 seconds | The "Notebook report notes" toast stays until dismissed |

***Outside notebooks, two older behaviors change, both also on 26.1:***

| Before (on `release_26.1` and `release_26.2`) | After |
| --- | --- |
| The default invocation report's `invocation_inputs()` / `invocation_outputs()` sections export to PDF as raw directives, for every workflow | They render the invocation's datasets |
| Hid-path extraction (`/api/histories/{id}/extract_workflow`, bioblend's `extract_workflow_from_history`) wires a tool input only to whichever copy of a dataset Galaxy summarized last; sending another copy's hid leaves the input unconnected | Copies of one original are one input, wired whichever hid is sent |

***No stored workflow changes behavior; this changes what extraction builds and how reports export.*** ***The bugs came from reviewing #22860 after merge, not from user reports: 26.2 hasn't shipped, so nobody has hit them yet.*** ***Most of the diff is tests: the non-test change is +984/−773.***

***API change, safe only before 26.2.0:*** `GET /api/pages/{id}/workflow_extraction_summary` becomes `GET /api/pages/{id}/extraction_summary`, matching `/api/histories/{id}/extraction_summary` from 26.1. The unused `report_title` payload field is dropped; the report title is the workflow name. Both are new in 26.2, so ***this needs to merge before 26.2.0 or it becomes a breaking change.***

<details><summary>Report lock and seeding screenshots</summary>

| Referenced output's star is locked | Map-over reference seeds the mapped step |
| --- | --- |
| ![Hovering the locked star: "The notebook report uses this output, so it stays a workflow output"](screenshots/notebook_extract_report_lock_tooltip.png) | ![Mapped random_lines card and its collection input pre-checked; cat1 left unchecked](screenshots/notebook_extract_seeded_mapped_form.png) |

| Notebook referencing nothing | Invocation report of the extracted workflow on fresh data |
| --- | --- |
| ![No-seed info alert with every card unchecked](screenshots/notebook_extract_no_seed_form.png) | ![Invocation report showing fresh-alpha/beta, not the notebook's datasets](screenshots/notebook_extract_report_round_trip.png) |

</details>

<details><summary>What changed</summary>

- **Labels.** `_reject_unquotable` is gone from extraction validation. Line breaks in output labels collapse to a space. A report directive whose label can't be quoted is dropped with a specific warning. Suggested output names are directive-safe at the source, so pre-starred outputs keep their directives.
- **Seeding** (`workflow_extraction_summary.py`). The notebook closure is built on the `WorkflowSummary` graph. A job from another history is a step only if its inputs are in this history, so a whole copied history keeps its producers while a single copied dataset becomes an input. `HistoryBoundary` keys every history content, including hidden collection elements, and synthesized boundary rows list this history's copy, not the source.
- **Report rewrite** (`workflow_extraction_report.py`, `markdown_parse.py`, `markdown_util.py`). A final sweep drops any directive, inline embed or visualization cell still naming an instance object, including quoted or spaced id arguments, `hid=` and indented or CRLF cells the client accepts. The notebook's own `history_link` becomes `history_link()`.
- **Copies are one input.** `extract_steps_by_ids` and the legacy `extract_steps` both key inputs, tool inputs and outputs by original content. Implicitly converted inputs connect on both paths. Copies sent with different names get a 400.
- **Validation.** Names not parallel to their ids or hids get a 400 instead of an `IndexError`. A user-defined tool the caller can't access shows `CUSTOM_TOOL_INACCESSIBLE` on its card instead of a 500.
- **Shared code.** `PageManager.get_accessible_notebook`; one `ContentKind`/`ContentRef` vocabulary in `galaxy.schema.workflows` (OpenAPI unchanged); public `get_original_hda`/`get_original_hdca`, `original_content_ref`, `resolve_content`, `walk_directives`.
- **Client.** Summary rows carry `referenced_by_report`, which locks the star. `from_page` is a route prop. Extract Workflow ignores repeat clicks while the notebook saves. A copied collection's input card lists its in-history copies. The GCard clear-title button is icon-only, like rename.
- **Tests.** Three leading "Baseline tests" commits pin behavior that already holds on `release_26.2` (403s, rollback on a failed rewrite, converted-input wiring). A Selenium/Playwright round trip goes notebook → extract → invoke on fresh data → invocation report. Notebook chat selectors that a rebase had brought back into `navigation.yml` are removed again.

</details>

## Risks

The pages route rename and the dropped `report_title` are API changes. They're free only because neither has shipped, so this has to merge before 26.2.0.

<details><summary>Risk Details</summary>

- `/api/pages/{id}/workflow_extraction_summary` → `/api/pages/{id}/extraction_summary`; `report_title` removed from the by-ids extraction payload. Both are new in 26.2.
- New 400s: name lists not parallel to their ids or hids, and copies of one original sent with different names.
- Legacy hid extraction (also on 26.1): copies sent together now become one input instead of several, and wiring no longer depends on which copy `summarize` saw last.
- PDF export of `invocation_inputs()` / `invocation_outputs()`: a viewer who can open the invocation but not one of its datasets now sees an error block for that section instead of a raw directive. Custom reports with label directives already behave this way.
- Notebook reports drop inline embeds and visualization cells instead of rewriting them to labels, because the client resolves only `history_dataset_as_image` inline labels.
- In a history with duplicate hids, `get_hda_by_hid` picks the lowest-id visible dataset.

</details>

<details><summary>Risk Review Advice</summary>

The seeding boundary rule in `workflow_extraction_summary.py` decides which foreign jobs become steps and which become inputs. That's the judgement call most worth checking. The legacy `extract_steps` change in `workflow/extract.py` touches a long-standing path that bioblend uses, so look at how hids map to originals there.

</details>

## Context

Builds on 🔀 #22860. Alternative kept on 🌿[`extract_next_followups_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/extract_next_followups_alt_original_scope): the branch before its second scope pass. It lacks the 400 for names not parallel to ids, the single copies-to-one-input rule, quoted labels in expanded invocation sections, complete keys for the notebook history boundary, and everything after the retarget to `release_26.2`; it stays based on `dev`.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Expand modestly: finish the PDF section ids, the hid copies rule and local copies in boundary rows, all in code the branch already touches.</summary>

- E6 (ids in expanded invocation sections), E7 (legacy hid copies are one input) and E8 (synthesized boundary rows list the local copy) were added; each sits in a function the branch wrote or already edits.
- Retarget to `release_26.2` and the pages API rename were decided before 26.2.0 closes the window.
- Zero-input producers from another history stay boundaries: without a "copied from" signal on histories, making them steps would pull foreign jobs into single-dataset copies.
- Five decompositions are written up if reviewers want it split; the cheapest is two PRs via the alt branch.
- Out: label-rewriting inline embeds (client resolves only image embeds), visualization label cells, user-tool deactivation, HTML notebooks.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural regression and no file newly over 1k lines; the copies rule now has one home.</summary>

- Two tidies applied: `trans.user` for HDA access and an accurate by-ids validation docstring.
- `_collections_by_original` doesn't duplicate `group_inputs_by_original`: one works on payload ids, the other on this history's copies.
- Not acted on: moving content-ref helpers out of `workflow/extract.py` (no layering win), and the double `group_inputs_by_original` call per by-ids request (would move an access check).

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Every new test fails without its change at a behavior assertion; one that already passed on 26.2 moved to a baseline commit.</summary>

- `test_hid_extract_connects_implicitly_converted_input` passes on `release_26.2`, so it's the third "Baseline tests" commit.
- Earlier passes replaced call-order unit tests with an API test where the rewrite fails and no workflow is created, and turned the `*_rejected` quote tests into acceptance tests asserting the stored label.
- Shared helpers for Grep1 conversion setup and single-input wiring; populator downloads instead of raw `GET`s. Nothing dropped or weakened.

</details>

### ✅ Second Frontier Model Review

<details><summary>Codex found a copied collection's input card carrying the source id; fixed red-first.</summary>

- The card now lists this history's copy, so extraction doesn't need access to the source history. An existing test pinning the source id was re-pinned at the same strength.
- Earlier passes fixed indented/CRLF visualization cells and twice-copied outputs, and both reviews caught the converted-input and one-name-copies bugs in the hid path.
- Zero-input foreign producers stay boundaries (see Scope Evaluation).

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Four behavior-neutral refactors sit right after the baseline tests.</summary>

- `PageManager.get_accessible_notebook`, public `get_original_hda`/`get_original_hdca`/`skip_output_assoc_name`, public `walk_directives`, `DatasetPopulator.run_cat1`.
- The `ContentRef` vocabulary and `HistoryBoundary` were considered and left in place: both carry behavior or would force reworking feature commits.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A specific 400 in the form's alert (non-parallel names, differently named copies, label too long, non-notebook page). Report notes stay in a toast until dismissed, and a failed report rewrite creates no workflow.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They assert rewritten report lines and exact warnings. One `toolbox.calls` assertion is the only direct way to see each map walked once.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes, the first three commits.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None stored. Extraction changes: quoted names are accepted again, copies become one input on the hid path, and default-report invocation sections render in PDF.
- [x] Who hits this in practice and what is the evidence? Everyone extracting from a notebook on 26.2, and bioblend users of hid extraction. The evidence is reproduced failing tests from post-merge review; 26.2 hasn't shipped yet.
- [x] Were simpler or existing approaches considered? Yes. Five ways to split it are written up, and the smallest already exists as the alt branch. Shared helpers were made public rather than copied.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- API: `test_workflow_extraction.py` (copies on the by-ids and hid paths, converted inputs, quoted labels, report rewrite and rollback, new 400s) and `test_pages_history_attached.py` (seeding, boundary rows, copied collections, unshared sources, 403s).
- Unit: report rewriting, markdown export of invocation sections, extraction summary and closure, markdown validation.
- Selenium/Playwright: notebook seeding, map-over seeding, copied-in input, report lock tooltip, report notes toast, and the notebook → extract → invoke → report round trip.
- Vitest: extraction form, input/step cards, GCard, page editor.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
