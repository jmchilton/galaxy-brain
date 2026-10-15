# Helper revision review

Acted-on findings: none. Deferred findings: none. Review is clean.

<details>
<summary>Full review</summary>

Reviewed the uncommitted diff against HEAD in `lib/galaxy_test/api/test_workflows.py`, limited to the two rerun lineage API tests, against the shared review focus and security reporting instructions.

- All individual invocation reads now use `WorkflowPopulator.get_invocation`. Its default `step_details=False` matches the endpoint default, its return value is the same decoded JSON mapping, and it also checks HTTP success.
- Exported invocation requests use the existing `invocation_to_request` helper, preserving the endpoint and decoded JSON while adding a success assertion.
- Default history invocation listing uses `history_invocations`. Its explicit `include_nested_invocations=True` matches the API default. The explicit element-view listing remains direct because the existing helper does not support the view parameter.
- The history access revocation uses `DatasetPopulator.update_history`, which sends the same payload as JSON to the same endpoint and returns the response. The existing explicit 200 assertion is preserved.
- Both populators retain the test's shared mutable interactor. `_different_user` updates that interactor's API key, so helper calls continue to execute under the intended user throughout the access test.

No new abstraction, source behavior change, or weakened assertion was introduced. Coordinator runs the two focused API tests; this review independently inspected the helper implementations and API defaults rather than duplicating that execution.

</details>
