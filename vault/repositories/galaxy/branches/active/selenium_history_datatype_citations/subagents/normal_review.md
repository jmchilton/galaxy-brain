# Normal review: selenium_history_datatype_citations

Reviewed the two cherry-picked commits (`044f422651c`, `579e9517c89` before fixups). Nothing must-fix, no security findings, conflict resolution clean. Acted on 1, 2, 3, 4 and 6. Fixups were folded into each commit; head `adea322053b`.

- 1: helper uses the existing `select_set_value(modal, datatype)`; dropped the `dropdown`/`input`/`option` selectors. Green under both backends.
- 2, 3: citations test reads `histories/{id}/citations` and `configuration.citation_bibtex`. It asserts count = tools + 1, Galaxy's citation first, the tool's after. No more hard-coded `Galaxy2026`/NAR title.
- 4: `apa_tab` now used (switch back to APA and re-assert).
- 6: promoted `history_panel_wait_for_hid_datatype(hid, datatype)` to `NavigatesGalaxy`; `test_collection_edit.py::test_change_datatype_simple_list` uses it.
- 7: `{"input1": 8}` → `{}`.

Not acted on:
- 5 (`citations.reference` overlaps `tool_form.reference`): scoped under `.citation-card` on purpose; separate page.
- 8 (shared hook for the Change Database/Build modal): out of scope for a missing-tests PR.

<details>
<summary>Full review</summary>

Nothing must-fix. No security findings. The navigation.yml conflict resolution is clean: additions only vs base, no stray `dataset_error`/`email_report` references.

**Should-fix**

1. Datatype option click can race under Selenium (`history_panel_change_datatype_of_selected`). vue-multiselect keys options by index, so an option found before re-filtering finishes can end up bound to another datatype (documented in `workflow_editor_change_output_datatype`). Fix: reuse `select_set_value(modal_selector, datatype)` (26 callers), or mirror the workflow-editor guard.
2. Citations test tied to Galaxy's yearly citation text (`Galaxy for accessible...`, `@article{Galaxy2026`). Breaks on the next NAR update or a custom `citation_bibtex`. Read `citation_bibtex` from the config API, or follow `test_bibtex_rendering` and assert rendered count = history citations API + 1.
3. Comment "Galaxy's (citation_bibtex) first" claims an order the test doesn't check.

**Nits**

4. `citations.apa_tab` unused (plus its data-description).
5. `citations.reference` duplicates `tool_form.reference: '.formatted-reference'`; scoping under `.citation-card` is fine.
6. `_wait_for_item_datatype` repeats `test_collection_edit.py:50`; optionally promote to a `NavigatesGalaxy` helper used by both.
7. `{"input1": 8}` is the integer param's default; `{}` shows it's irrelevant.
8. Sibling "Change Database/Build" modal has the same SingleItemSelector pattern and no data-description; out of scope.

**Checked, no issue:** imports at top; `retry_assertion_during_transitions` exported from `.framework`; names consistent (`muli` typo is upstream); `ok` selector matches convention; `use_bootstrap_dropdown` reused correctly; datatype test checks UI and API; Celery via `TestWithSeleniumMixin`; `_wait_on` polls on falsy.

</details>
