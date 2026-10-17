# Screenshot debrief: extract_next_followups

**Screenshots successfully obtained.** Taken on the `release_26.2` base, with head `0a2f2198beb`, Playwright headless, own Galaxy on :8095 and Vite on :5185, and a fresh user per test.

## E2E results on 26.2 (Playwright)

- `test_notebook_workflow_extraction.py`: 6 passed, 0 skipped, 0 failed (at `098d7d23860`). After the fix below, I reran the 3 changed tests. They pass on Playwright and on Selenium.
- `test_workflow_extraction.py`: 13 passed, 0 skipped, 0 failed (`GALAXY_TEST_REQUIRE_ALL_NEEDED_TOOLS=1`).

## Fixes made (commit `0a2f2198beb`, pushed)

- `notebook_extract_seeded_form` and `notebook_extract_seeded_mapped_form` showed "Loading dataset..." on every card. Added `extract_workflow_wait_for_output_previews()` (navigates_galaxy), which waits for the lazy item previews. It uses the new `workflow_extract.output_preview` and `output_preview_loading` selectors.
- In `notebook_extract_report_warnings_toast`, the toasts were still sliding in and sat mostly off-screen. `report_notes_toast` now matches only a settled toast, one without `g-toast-enter-active` or `g-toast-move`.
- No screenshot showed the report-lock tooltip (M7 C+B). `test_notebook_seeds_referenced_subgraph` now hovers the locked star and captures `notebook_extract_report_lock_tooltip`. It also asserts the tooltip text. This uses the new global `_.shown_tooltip` (`.g-tooltip[data-show="true"]`). The existing `tooltip_balloon` doesn't match GButton tooltips.

## Index

| File | Shows |
|------|-------|
| `notebook_extract_seeded_notebook.png` | Notebook editor toolbar with the Extract Workflow button. |
| `notebook_extract_seeded_form.png` | Form opened from a notebook: only the referenced cat1 run and its inputs are pre-checked, and its output star is locked on. |
| `notebook_extract_report_lock_tooltip.png` | Hovering the locked star shows "The notebook report uses this output, so it stays a workflow output". |
| `notebook_extract_seeded_mapped_form.png` | Referencing a map-over collection pre-checks the mapped random_lines card and its collection input. The cat1 run stays unchecked. |
| `notebook_extract_copied_input_form.png` | A cat1 output copied in from another history becomes the one pre-checked input card. Its consumer is pre-checked with a locked star. |
| `notebook_extract_no_seed_form.png` | A notebook that references nothing shows the no-seed info alert, with every card unchecked. |
| `notebook_extract_report_warnings_toast.png` | After extraction, a persistent "Notebook report notes" warning toast lists the dropped inline reference, under the success toast. |
| `notebook_extract_report_round_trip.png` | Invocation report of the extracted workflow, run on fresh data: shows `fresh-alpha/beta`, not the notebook's data. |
| `workflow_extract_step_labeled.png` | Labeled tool step "my cat step" with the GCard clear-title control, now an icon-only red x (GCard styling change). |
| `workflow_extract_output_starred.png` | Plain history extraction with a starred, editable output, for comparison with the locked star. |
| `workflow_extract_copied_inputs.png` | Plain history extraction from copied datasets: two input cards plus the cat1 step. |

## Notes / gaps

- The locked star and an ordinary active star look the same: both are dark, filled stars. Only the tooltip, and the click doing nothing, tell them apart. This may be worth a visual cue later, but nothing is broken.
- No E2E covers a copied collection's input card listing its in-history copies (`f1636108be0`). It is covered at unit/API level only, so there is no screenshot of it. I did not write a new test.
- The history panel in `workflow_extract_copied_inputs` reads "This history is empty". The copies were posted by API, and the panel had not refreshed. The test is pre-existing and unchanged on the branch, and the form itself is correct.
- I did not capture the page editor's Extract Workflow loading state (save-before-extract spinner). It lasts too briefly to screenshot reliably.
