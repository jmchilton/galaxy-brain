# Implementation debrief

STATUS: READY. Scope: as implemented (scope eval: no sibling drops of 0 on `release_26.0`; lint/XSD/helper ideas are dev features).

`verify_collection` compares collection `count`/`min`/`max` to `None` instead of by truthiness, so `count="0"`, `element_count: 0` and `max="0"` fail on non-empty collections again. Regression from `6178df3dcff` (26.0); `release_25.1` already used `is not None` for `count`. Target `release_26.0`.

Commits (head `8eb7779ec8a`):
- `def6a11f5de` Baseline tests: `test/unit/tool_util/test_verify_collection.py`, 12 cases green pre-fix (incl. zero-on-empty pass cases).
- `8eb7779ec8a` Fix + 3 zero cases red pre-fix (count/max/element_count 0 on 1 element).

Hardening: test challenge moved two pass cases into baseline; Codex no findings; thermo-nuclear skipped (<50 lines); no baseline refactor; `make format` clean; mypy unchanged vs base. Verified framework tests `empty_list`, `expect_num_outputs`, workflow `filter_null`.

PR note: external tool/workflow tests asserting 0 on non-empty collections will go red (as they would on 25.1).

```
exists .../differential-review/snapshots/20261028T044136Z-hardening-8eb7779ec8aa.json
  hardening @ 8eb7779ec8aa vs origin/release_26.0 (merge-base 29d1801ad21b)
  since 20261028T043736Z-implementation-aeb3970d07e7:
    commits: 0 same, 0 rebased, 2 changed, 0 new, 0 dropped
    hunks:   2 carried, 0 changed, 0 new, 0 dropped
```
