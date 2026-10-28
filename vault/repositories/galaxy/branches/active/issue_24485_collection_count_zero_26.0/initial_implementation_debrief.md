# Initial implementation debrief

Base `release_26.0`: truthiness checks came in with `6178df3dcff` (collection min/max, 26.0); `release_25.1` still compared `count is not None`. So this is a 26.0 regression, and the fix restores 25.1 semantics for `count`.

Commits:
- `f022bd2aed6` Baseline tests: new `test/unit/tool_util/test_verify_collection.py` pinning current count/min/max/element_count pass/fail behavior (10 cases, green pre-fix).
- `aeb3970d07e` Fix: `verify_collection` compares `count`/`min`/`max` to `None`; adds zero cases (count/max/element_count 0, pass and fail). 3 new cases red before, green after.

Verified: unit tests (`test_verify_collection.py`, `test_verify.py`, `test_verify_hid.py`, 95 passed); framework tools `empty_list` (count="0"), `expect_num_outputs` (24); framework workflow `filter_null` (element_count: 0). ruff/black/isort clean; mypy unchanged vs base.

Risk: tool/workflow tests elsewhere (IWC, tools-iuc) asserting `count="0"` / `element_count: 0` / `max="0"` on non-empty collections will now fail, as they would have on 25.1.

```
created .../differential-review/snapshots/20261028T043736Z-implementation-aeb3970d07e7.json
  implementation @ aeb3970d07e7 vs origin/release_26.0 (merge-base 29d1801ad21b)
  first snapshot: 2 commits, 2 files, 2 hunks
```
