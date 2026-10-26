# Filtered findings

- default P3 1 (`IntParameter.wrap` should return `None` for unconvertible legacy values, which would also drop the `ColumnDataProvider` guard). This re-litigates the PR description, which explicitly says "A stored value that can't be converted is returned unchanged" and "`ColumnDataProvider` ... ignores a value it can't convert."
- gx_test_challenger P3 2, trimming the trivial unit cases (`(3,3)`, `(None,None)`). Not actionable, and it would remove tests. The cheap passthrough cases also guard idempotence.
- gx_test_challenger P3 2, confirming that `"-1"` is accepted. The PR description explicitly keeps negative values. The `"2.5"` half of that item is now covered by verified P3 1.
- gx_risk_assessment advice to weigh a new public `IntParameter` against a consumer-only fix on a release branch. That report has no P-labeled findings, and adding `IntParameter` is an explicit decision in the PR description.
