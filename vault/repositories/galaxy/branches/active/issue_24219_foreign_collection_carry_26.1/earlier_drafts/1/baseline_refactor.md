# Refactor baseline evaluation

No refactoring of the base branch was performed.

Scope: `origin/release_26.1...3147227b128` (5 commits; `basic.py` +24, `test_tools.py` +46, `test_jobs.py` +22).

Candidates considered:
- `basic.py`: purely additive. One new method `_carry_selected_hdca` (reuses existing `_classify_hdca`, `_history_query`, `_carried_state_label`, `make_hdca_entry`) plus one call in `DataCollectionToolParameter.to_dict`. No existing code is reshaped, so there is nothing to apply to the base first.
- `test_tools.py` `_build_tool_param(inputs=)`: a 4-line optional kwarg on a test helper. It could stand alone as a pre-fix commit, but it is test-only, has no caller on the base, and splitting it would need a parallel `_restructured` branch (no force-push) for no reviewer benefit. The #24219 pin branch adds the same kwarg; identical hunks merge cleanly either way.
- Rejected refactors from `thermo_nuclear_review.md` (hoisting `history_query` into `to_dict`, a shared `_carried_hdca_entry` helper with `DataToolParameter._carry_unresolved_inputs`): not in the branch, and on a stable branch they would add signature churn and forward-merge friction against 26.2's `_carry_selected_hdca`. Better done on dev.

Branch history unchanged; no `_restructured` branch created. No tests rerun (no code changes).
