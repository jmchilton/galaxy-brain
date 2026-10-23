Profile: gx_risk_assessment · Model: Opus 5.5 · Effort: low · Reviewed commit: c7394ba6229d320adcfcf8b79511bdc06014d12e

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It fixes the `raw_data` column `mean`/`median` computation (previously a float list index under Python 3, so numeric stats failed), excludes uncastable values from those stats, and adds API tests; `count` still includes uncastable rows and the response shape is unchanged, so rollback is a small revert.
