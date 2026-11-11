# Initial implementation debrief

Ported John's round 0 review branch `pr_24798_round_0_rev_0` onto `dev` after #24798 merged (`a73355ea2e5`). Upstream adopted P3 5 (dedicated `ReferenceDataParameterModel`, `table` as a plain field) and dropped `filter`, so the port reworked each commit against that shape.

```
created .../reference_data_followups/differential-review/snapshots/20261111T142512Z-implementation-f03e586886f1.json
  implementation @ f03e586886f1 vs origin/dev (merge-base a73355ea2e5c)
  first snapshot: 7 commits, 15 files, 26 hunks
```

## Commits (`f03e586886f`)

1. Baseline tests: reference_data fixtures through the #23888 user tool contract harness (P2 1). 18 cases (3 load paths × 3 input formats × single/multiple).
2. Baseline tests: closed-table tests assert which check fires (P2 2).
3. Baseline tests: admin `GalaxyTool` reads a closed table via the API (P3 4, admin half).
4. Baseline tests: parity of parsed model vs `to_internal()` across tool class × dump policy (drift guard).
5. Reject reference_data unless the input source is a YAML tool's (P3 1). `InputSource.parse_reference_data()`; XML `<options>` bypass closed in `basic.py` and the factory.
6. Load reference_data through its authoring model (P2 3). Factory returns `to_internal()`; parser/`ReferenceDataToolParameter` read `model.table`; disk tools now reject what the model rejects.
7. Share runtime dumping and the table access rule (P3 3). `reference_data_runtime_json()`, `ToolDataTable.readable_by(*, trusted)`.

## Dropped

- P3 2 (`filter.from_input` validation) and the filter halves of P2 3 / P3 4: `filter` no longer exists upstream.

## Verification

- Unit: `test_reference_data.py`, `test_yaml_parameters.py`, `test_evaluation.py` — 139 passed. Red check vs dev lib: 5 new cases fail (XML with `<options>`, XML param models, 3 disk rejections).
- API: contract harness 18 + `test_unprivileged_tools` 3 — passed.
- ruff/black/isort clean on changed files.

## Review

Normal review: ready, nits only, all acted on — [subagents/normal_review_1.md](subagents/normal_review_1.md).

## Side effect worth noting in the PR body

reference_data is now the only YAML parameter type strictly model-validated on disk. Unreleased type, so nothing real breaks.
