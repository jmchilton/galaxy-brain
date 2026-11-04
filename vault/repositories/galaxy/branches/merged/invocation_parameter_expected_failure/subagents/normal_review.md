Accepted the review with no changes: runtime validation and failure handling stay intact, with only logging classification corrected. No recommendations were declined. The workflow unit suite passed (194 passed, 1 skipped).

<details>
<summary>Full normal review</summary>

# Normal review

No findings. Final diff is exactly one added existing enum member in FAILURE_REASONS_EXPECTED (lib/galaxy/schema/invocation.py:110), and git diff --check passes. Reviewed according to _shared/REVIEW_FOCUS.md.

Existing runtime paths already emit workflow_parameter_invalid for parameter-input validation (lib/galaxy/workflow/modules.py:1812) and generic step-parameter validation errors (:3377). The expected-failure tuple is consumed by workflow/run.py:274 solely to select info rather than error logging; the handler still raises the failure and preserves invocation behavior. The change does not introduce a new failure reason or alter request acceptance or validation rules.

This reuses the existing classification mechanism and applies uniformly to all emitters. No tests were changed or weakened. A new tuple-membership unit test would mirror the implementation; existing workflow unit validation is being run separately by the coordinator's testing agent. This review does not claim those results.

</details>
