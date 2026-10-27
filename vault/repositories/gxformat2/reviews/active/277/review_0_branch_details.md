Branch `pr_277_review_0` (from reviewed commit `177a083`) fixes both verified P3 findings: it trims the stale `dict[str, Any]` arm from the `_normalize_outputs` annotation, and pins the new lax behavior with a null-output fixture that both lax and strict validation must reject. Red-to-green confirmed for the lax expectation against `main`'s lax model; full suite passes (945 passed, 8 skipped), mypy and pyrefly clean.

- `f5a27da` Drop stale dict[str, Any] from _normalize_outputs annotation — matches the parameter type to `GalaxyWorkflow.outputs` after the `Process.yml` change.
- `c08990c` Pin lax rejection of null workflow outputs — adds `format2/synthetic-null-output.gxwf.yml`, its catalog entry, and lax/strict `expect_error` expectations in `validate_format2.yml`.
