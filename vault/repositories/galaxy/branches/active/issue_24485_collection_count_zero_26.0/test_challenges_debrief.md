# Test challenges debrief

Only test file: `test/unit/tool_util/test_verify_collection.py` (calls public `verify_collection`, parametrized, no mocks beyond a noop verify_dataset lambda). Kept; not implementation-mirroring. No existing API/framework test covers a failing count=0/max=0 (only `empty_list.xml`, `filter_null.gxwf-tests.yml` positive cases), and a framework test for negative verification is heavy. No E2E needed (test-infra only). Mocks are fine; dataclass swap not worth it.

## Change made
- `{"count": "0"}, 0` and `{"max": "0"}, 0` pass cases passed before fix (vacuous: check skipped), so they were not red in the fix commit. Moved into the Baseline commit (green pre-fix; guard against over-correction).

## Red/green verified (original interactor.py)
- Baseline commit: 12 pass pre-fix.
- Fix commit's 3 new fail cases (count=0 w/ 1 elem, max=0 w/ 1 elem, element_count=0 w/ 1 elem) fail at their own assertion pre-fix, pass after.
- ruff/black/isort clean; 15 pass.

## Commits (unpushed)
- def6a11f5de Baseline tests for verify_collection size checks
- 8eb7779ec8a Fix collection output tests ignoring count/max of 0
