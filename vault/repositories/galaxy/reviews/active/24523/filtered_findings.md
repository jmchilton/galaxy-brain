# Filtered findings — #24523 @ 55b681c1fa9

- gx_test_challenger P3 1, "`test_by_credentials` overlaps higher-layer tests" (drop the "API key wins" and "token alone" asserts): not actionable. The unit test pins the contract of the new shared `by_credentials` abstraction, which has two callers. The overlapping higher-layer coverage is endpoint-specific, and the Keycloak half only runs with Docker. Trimming would remove tests without a clear gain.
