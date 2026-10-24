# Polish debrief

Head `238622866a2` on `release_26.1` (`28dcf86a6c4`).

Rework (John, 2026-10-24): rebased onto `release_26.1`, same branch force-pushed; dev version saved as `udt_element_identifier_api_test_alt_dev` (`d5ddac3f416`). Conflicts were in tests and `shell_quotable` plumbing (dev-only); dropped it. Decisions: no cache guard here (#24411); plain datasets fall back to HDA name.

Changes during polish:
- New commit: plain-dataset `element_identifier` falls back to HDA name (runtimeify + `to_cwl` UDT path). Red first (`null\n` vs `reads.txt\n`), then green.
- Checklist fixes: removed unused `get_hdca_implicit_collection_jobs_id` helper from baseline commit; limited the `to_cwl` name fallback to the UDT path (`element_identifiers is not None`) so `when`/`valueFrom` expressions don't get it.
- Strengthening: corrected scope sentence (workflow UDT steps on plain data do change; XML converted inputs gain recorded identifier), `when`/`valueFrom` wording, reuse note in risks, why-26.1 line.

Verification: on base code the 4 `-k element_identifier` tests fail at the content assertion (`null`); on branch they pass. `test_unprivileged_tools.py`+`test_workflows.py -k "element_identifier or user_defined_tool or udt or when"` 29 passed; earlier `when/conditional/expression/pick_value` 36 passed; unit `test_modules`/`test_runtime` 106 passed; black/ruff/flake8 clean. Fork CI on head still running at handoff, no failures seen.

Not done:
- XML-tool converted-input identifier is untested (description says so).
- Job-cache crossing when identifier != dataset name remains (#24411 branch is on 25.1; UDTs also need `consumes_names`).
- Hardening debriefs (scope, thermo, test challenges, Codex, baseline) predate the rework and the fallback commit; not re-run.
