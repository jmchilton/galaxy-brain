I reproduced one extraction regression when an expression output feeds a conditional **select discriminator**.

At `lib/galaxy/workflow/extract.py:174–177`, replacing the recorded option with `ConnectedValue()` makes both the visitor and `Conditional.value_to_basic` try to select a branch from that marker. No option matches, so both extraction endpoints return HTTP 500 (`ValueError: No case matched value`).

I tested a saved workflow with `param_value_from_file -> output_filter_exception_1/options|options`: its invocation completes with all jobs `ok`, but selecting both jobs gives 500 in both endpoints. Disabling only the new reconnect pass on the same invocation gives 200 in both. This fixture seeds the persisted edge and uses normal topological ordering plus `allow_tool_state_corrections`, to avoid confusing this regression with the independent current import limitation for connected select discriminators.

Could we preserve the concrete discriminator through traversal/serialization, or handle the marker explicitly without losing the branch, and add a case where the discriminator itself is connected? The conditional unit case currently connects only the child text parameter and leaves the selector literal.

Otherwise the shared pass and invocation boundaries look good. The changed-input round-trip API tests are useful coverage. Locally: 131 workflow unit tests passed, 1 skipped, and both new API tests passed.

## Risks

The implementation is reversible, but exported workflows persist the restored dependency behavior. Grouped parameter state and strict same-invocation source matching need particular care; the conditional-select failure above should be resolved before merging.
