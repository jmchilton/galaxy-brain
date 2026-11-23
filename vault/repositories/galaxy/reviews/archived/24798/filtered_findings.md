# Filtered findings — #24798 round 0

Reviewed commit `5abbfd9d5a6`. Items dropped from `verified_review.md`, one line each.

- default P2 2 as written ("a `from_input` typo validates, loads and silently offers every entry") — disproved for the typo case: an unknown or later-declared `from_input` already fails at tool load (`Could not find dependency 'read' of parameter 'reference'`). Kept, narrowed, as P3 2 (model accepts it; a non-data `from_input` does silently offer every entry).
- thermo P2 2, second half (drop the legacy `to_cwl` reference_data branch) — new jobs still take it: the legacy `/api/tools` run in `test_run_with_reference_data` and the `legacy` contract-harness format reach `resolve_reference_data`. Dedup half kept as P3 3.
- thermo P3 2, first half (`self.type = "select"` mutation) — already documented in place as the form contract; the double `parse_dynamic_options` call half is fixed under P3 1.
- test challenger P3 1 (runtime trust check never reached through the evaluator) — confirmed (both `validated_state` modes fail first in `from_json` with "no legal values"), but that is defense-in-depth behind the form/`from_json` check, not dead or wrong code. The closed-after-submit test now pins the `from_json` failure for both modes (P2 2).
- test challenger P3 2 (eager `setup_for_reference_data` forces `test_runtime.py` Bunch churn) — two test attributes; not worth reshaping the evaluator.
- test challenger P3 3 (`reference: null` accepted at job_runtime for a non-optional multiple) — matches the `gx_select` convention: `SelectParameterModel.py_type` uses `optional or multiple`, and `gx_select_multiple` specs accept `null`.
- test challenger P2 4, removal half (drop the two closed-table unit tests and move the `/refs` path-leak check to the API) — strengthening applied; removing tests left to John/author.
- default P2 1 / test challenger P2 2, removal half (drop `TOOL_WITH_REFERENCE_DATA` / `test_run_with_reference_data`) — the harness now covers it; removal left to the author rather than done on the review branch.
- risk assessment items — one-way-door notes for reviewers, not P-labeled findings.
