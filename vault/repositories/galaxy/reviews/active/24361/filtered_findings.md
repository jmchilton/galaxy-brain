# Filtered findings — galaxy#24361

- **default P3 2 (old versions refused at download time though HAL still serves them):** re-litigates a decision the PR body's "Limits" section calls out: version-pinned paths fail with "browse again" once the indexed version changes, and historical versions are not implemented.
- **default P3 8 (import `DEFAULT_API_URL` into `templates/models.py`):** optional nit. Duplicating per-source config models and defaults is the established sibling convention.
- **gx_test_challenger P3 1 (extract pure parsing helpers for dict-based tests):** no longer actionable. The new `test_hal.py` covers the host, scheme, path-shape and filename rules through the public API.
- **gx_test_challenger P3 2 (trim `test_production_hal`'s `writable is False` assertion):** a nit-picky test trim that weakens an assertion.
- **gx_risk_assessment:** no P findings. It reports the persisted `hal` type name and path shape as one-way decisions; these belong in the risk notes, not the posted review.
