Profile: generic_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: 14c205f7

Risks are minimal - this change doesn't lock the project into particular difficult to change choices (a two-way door). It adds an internal `RunResponse.collected_test_data` attribute and reuses the collector's result in `BaseEngine.test()`; the test report JSON format, CLI and engine return shapes are unchanged, and a revert restores the old post-shutdown recomputation.

<details><summary>Risk Review Advice</summary>

Check that every engine that calls output collectors does so while outputs are still reachable, and that the fallback (`collected_test_data is None`) still covers cwltool, toil and embedded Galaxy tool tests. Expect small textual conflicts with #1707 and #1708.

</details>
