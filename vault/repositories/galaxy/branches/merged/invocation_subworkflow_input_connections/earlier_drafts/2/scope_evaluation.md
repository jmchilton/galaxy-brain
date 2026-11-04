Recommend a modest expansion: finish applying the shared disconnected-input invariant to the runtime backstop, so wholly and partially disconnected required subworkflow inputs produce the same accurate disconnected-input failure before any connected outputs are resolved. The current early recursive submission check is sound, but the touched fallback still reports a partially disconnected input as an unrelated upstream output failure. Keep the existing failure schema and wholly disconnected diagnostic; add focused runtime regression coverage for callers bypassing submission validation.

## As implemented: early recursive rejection with existing runtime diagnostics

Reject saved subworkflow graphs with required inputs lacking both connections and defaults before history/invocation construction. Share the connection/default/optional predicate with runtime, retaining the old fallback diagnostic branches.

| Pros | Cons |
| --- | --- |
| • Covers immediate, partial and nested missing connections.<br>• Preserves optional and explicit falsy defaults.<br>• Small standalone fix. | • Partial runtime failures still blame an unrelated connected output.<br>• Runtime behavior now has a shared predicate but retains a contradictory interpretation of that predicate. |

## Recommended: consistent disconnected-input runtime failures

Evaluate the shared missing-input list once at entry to `WorkflowProgress.subworkflow_progress`; when nonempty, raise the existing disconnected-required-input `InvocationUnexpectedFailure` before resolving connected inputs. Remove the misleading partial-connection `InvocationFailureOutputNotFound` construction, leaving genuine missing-output failures in the normal connection resolver untouched. Cover the bypass-preflight runtime contract with persisted model/progress tests for wholly and partially disconnected inputs and retain optional/default/connected positive controls.

| Pros | Cons |
| --- | --- |
| • Fixes a concrete adjacent bug in code this branch already changes.<br>• Makes the backstop describe the same structural problem as submission validation.<br>• Removes the loop-variable-dependent error branch and avoids delaying structural failures while resolving unrelated outputs.<br>• Uses existing schema and established wholly disconnected error semantics. | • Changes the failure reason of partially disconnected runs that bypass ordinary submission.<br>• Requires focused runtime regressions in addition to API coverage. |

<details><summary>Evidence and implementation boundary</summary>

`run.py:subworkflow_progress` currently computes all missing required inputs, then resolves connections while visiting each input. For a missing input with any sibling connection present, it constructs `InvocationFailureOutputNotFound` using the final `input_connection` from scanning unrelated connections. Neither that output nor its producer caused the structural gap. The all-disconnected branch already has an accurate disconnected-input diagnostic, so using it consistently fixes the related bug without introducing an enum, schema/client regeneration, or new request feature.

The earlier thermo review explicitly considered rewriting runtime error construction but deferred it to preserve established fallback behavior; the fresh strengthening review similarly deferred broader validation to maintain the prior boundary. The revised scoping policy favors this bounded adjacent correction. Existing API tests remain valid; new direct runtime tests should exercise real saved workflow models through `WorkflowProgress`, rather than merely mocking the predicate. Test at least no connections and one valid sibling connection with another required input missing, asserting the failing subworkflow step and absence of a fabricated output/dependency attribution. A pending connected sibling can also establish structural failure precedence. Preserve explicit defaults, including false/zero/empty/null where already supported.

</details>

## Alternative modest expansion: recursive empty/cyclic workflow sanity checks

Generalize the root-level empty/cycle checks into the new recursive graph walk and include nested step paths in those failures.

| Pros | Cons |
| --- | --- |
| • Extends existing graph sanity checks using a traversal already present.<br>• Could reject further deterministic saved-graph failures before persistence. | • Requires separate evidence for valid empty-subworkflow semantics and import-time cycle handling.<br>• Less directly connected to the demonstrated missing-connection bug than correcting its existing runtime diagnostic. |

This is a reasonable future structural-validation extension, but the concrete runtime correction is the appropriate modest expansion for this branch; do not automatically reject empty nested workflows without establishing their execution contract.

## Smaller: submission-only guard with duplicated predicate

Leave runtime entirely unchanged and duplicate the optional/default/connected condition in request validation.

| Pros | Cons |
| --- | --- |
| • Minimizes runtime diff. | • Duplicates subtle default-presence semantics.<br>• Preserves inaccurate runtime failures and increases drift risk. |

## Larger: generalized invocation graph and value preflight

Combine connection structure with input accessibility, collection shape, parameter typing, materialization and invocation lifecycle validation.

| Pros | Cons |
| --- | --- |
| • Could provide a comprehensive early-validation contract. | • Introduces several independent data/value concerns.<br>• Not needed to correct saved connection detection and fallback reporting.<br>• Requires much broader compatibility evidence than this bounded correction. |

The recommendation is based on the actual polished patch at `bdbbdfcd2cc8a2a80306d0d0f28aa9445c5e3768`, its adjacent resolver/schema code, and existing implementation, test challenge, strengthening and code-quality notes. This is a scope assessment; no code changes or fresh execution results are claimed here.
