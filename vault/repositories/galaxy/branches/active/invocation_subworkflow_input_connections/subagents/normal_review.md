Independent review found no actionable changes. No recommendations were declined.

<details>
<summary>Full review</summary>

# Normal review

No actionable findings in the independent `release_26.2` extraction against base `0c70fdd5182`. `git diff --check` passes.

The shared predicate matches the previous runtime invariant: an input is disconnected if no connection refers to its subworkflow step ID, it is required, and no default is set. Default detection uses object identity against a sentinel, preserving explicit null and falsy values instead of treating them as absent. The model's `get_input_default_value` supports both parameter defaults and data-input defaults. Optional and connected inputs remain accepted.

Recursive request validation examines subworkflow steps, reports an ordered parent-to-child path and input names, and runs before target-history creation. It does not alter data/parameter value validation or resolve/materialize inputs. The runtime replacement loop remains in place and the shared predicate retains its two existing fallback failure classes and details. The same persisted workflow models/IDs underpin request and runtime checks.

The API tests strengthen the old late-failure scenario to assert the intended early HTTP 400, error code and path, no invocation, unchanged jobs, and no requested new history. Added partial/nested cases exercise distinct graph shapes; new/existing-history variants check both targets. Falsy-default acceptance supplements the existing default/optional/connected positive controls. Runtime validation results are owned by the implementation agent; reviewer made no code changes or duplicate test runs.

Final validation reported by the implementation agent: focused API selection 10 passed; workflow units 193 passed, 2 skipped; existing hooks and diff checks passed. No review action remains.

</details>
