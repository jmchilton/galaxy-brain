Independent review found no actionable changes. No recommendations were declined.

<details>
<summary>Full review</summary>

# Normal review

No actionable findings. Reviewed the two-file extraction against exact `release_26.2` base `0c70fdd5182`; `git diff --check` passes.

All three invocation preference fields use the existing `validate_preferred_object_store_id` helper, shared with history/user preference validation and backed by the object store's selection policy. Unknown/disallowed selections fail before `_get_target_history` can create a history. The existing general-vs-split preference guard moves to the same early check without changing its predicate; its grammar is corrected. Preference values continue to be passed unchanged to `WorkflowRunConfig`.

The change preserves omitted/null/empty preference handling and valid general or split selections. It introduces no new resolver, runtime-state construction, parameter validation, service dependency, or scheduler behavior. Imports remain at module scope. The small API test directly exercises all three sibling fields and checks both HTTP 400 and absence of the requested history.

Validation is being run by the implementation agent: reported baseline reds returned 200 for all three fields; final focused API and existing selectable-store/split-store integration outcomes should be included in the handoff. Reviewer did not duplicate those running suites or modify code. No UI changes or browser tests are needed.

The change comprises 46 changed implementation/test lines (36 additions, 10 removals). Reusing a validator and moving an existing local guard does not constitute substantial plumbing, so the additional thermo-nuclear review threshold is not met.

</details>
