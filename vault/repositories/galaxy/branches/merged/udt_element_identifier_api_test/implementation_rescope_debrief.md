# Re-scope debrief

The scope evaluation recommended expanding modestly: (1) persist identifiers for implicitly converted mapped-over inputs, and (2) a plain-dataset HDA-name fallback for UDTs.

- Took (1): `2d506996bef` copies the transient `element_identifier` onto the converted HDA in `actions/__init__.py` `process_dataset`. Red→green API test `test_run_mapped_over_converted_input_writes_element_identifier` (csv list → tabular-only UDT). Element_identifier, labels and workflow API tests: 16 passed. `test_actions.py`/`test_execution.py` green.
- Left (2) for John: it changes the pinned `null` contract (baseline test), and whether to mimic CWL-null or the Cheetah name is a product call.
- The original scope is kept as alt `udt_element_identifier_api_test_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).
- Review ([subagents/rescope_review.md](subagents/rescope_review.md)): Cheetah is not fixed by (1), so the commit message was corrected and Cheetah is noted as a follow-up.
