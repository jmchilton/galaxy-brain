This is a two-way door: deferred tool-test parsing changes when existing work runs, without introducing a persistent data format or API contract, and can be reverted cheaply.

<details><summary>Risk Details</summary>

- The first request that needs a tool's tests now pays the parsing and validation cost; malformed tests can surface at request time rather than during tool loading.
- Deferred XML parsing reconstructs a source after memory optimization, so correctness depends on that round-trip preserving the test definitions.
- Additional CI pod logs improve failure diagnosis and have no effect on deployed Galaxy behavior.

</details>

<details><summary>Risk Review Advice</summary>

Verify that test-data, tool-download and tour consumers still receive the same test definitions after tool loading and memory optimization. The new unit coverage checks lazy parsing and caching for two XML profiles; a representative endpoint check would help confirm the changed timing is acceptable.

</details>
