Profile: gx_risk_assessment · Model: Opus 5.5 · Effort: low · Reviewed commit: 4d4f6232533c

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It swaps a mutating `set.pop()` for a non-mutating read of the cached HDCA summary, so the API output is unchanged on first call and only corrected on later calls; the rest is a unit test.
