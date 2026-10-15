Independent review requested no additional changes. Reconciliation preserves upstream normalization, restores required test imports, and replaces the redundant scheduler test with the stronger polished parametrization. No recommendations declined.

<details>
<summary>Full review</summary>

# Normal review: polished-fix reconciliation

No actionable reconciliation regression found. Reviewed the rebased `issue_20900_invocation_validation` implementation at `820e1afa4f0`, including the subsequent import cleanup, against original source `9b18c329c8f`, current dev `88127f42979`, and integrated polished-fix base `55a8da51904`.

The source branch retains all four polished fixes: explicit false/null input-copy handling, expected workflow parameter failure classification and persisted step index reporting, missing-input 404 behavior for all four sources, and scheduler rejection through the injected scheduling manager. The source's broader data-input resolver still performs the equivalent existence/access checks rather than retaining a redundant helper from the narrow missing-input fix.

The workflow service, app registration, landing-manager API, schema, and toolbox changes are identical to the original source at the reviewed state. Service dependencies continue to use the current architecture. Current dev's `step_parameters`/legacy-parameter conflict check and null/empty `ds_map` semantics survive the rebase. Multiple text/integer/float conversion now uses the polished shared parameter behavior; the source's extra validation is restricted to its remaining preflight checks. The length-validator doctest remains, testing each entry rather than the list length. No additional dead override is needed.

AST inventories found no lost API tests from dev and no lost workflow-module or landing-manager test functions from either source or dev. The original unknown-scheduler test is replaced by the polished scheduler parametrization, including unknown, default, omitted, and empty values. The changed missing-subworkflow-input test intentionally verifies earlier rejection and absence of invocation/job side effects. Its coverage is stronger for the new contract, rather than silently weakening an assertion.

Review limitations: this is a focused reconciliation review, not a repeat review of every previously reviewed generator feature or preexisting source behavior. Parent and implementation agent own runtime validation, including known preexisting valid-collection request failures; no duplicate server suites were started by this reviewer. Four independent source branches were not edited by this reviewer.

</details>
