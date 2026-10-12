# fetchModels — batch 64 author review

All seven original cases and 36 executed assertions remain. There are twelve assertion source lines: the row helper runs eleven times with two checks each, and the round-trip comparison runs for five original targets. All fixture properties, omissions, hash/tag values, collection types, expected errors, row values, and round-trip comparisons remain unchanged.

The generated UrlDataElement/NestedElement/target schemas still require backend-defaulted fields absent from these fixtures. Canonical api/tools URL and nested-element builders were inspected: they explicitly add those defaults, which would change the missing-field and round-trip inputs. Narrow single API-type assertions remain at those fixture boundaries; unnecessary unknown double casts and the malformed-element any cast are removed. The intentionally missing-URL fixture still enters the real runtime validation path. No API schema or production signature changes.

The row helper now uses the model's CellValueType and inferred row instead of any and RowType casts. Its separate row-presence and exact-cell assertions remain. The existing tag-order normalizer moves outside the round-trip loop, uses structuredClone to preserve the target type, and visits unknown values to sort only cloned tags arrays. It retains the original deep-copy/tag-order comparison semantics without reconstructing objects through any. No new shared helper or test scenario is introduced.

Pristine and final shuffled seed 640101 both pass seven cases. V8 matches exactly: thirteen files/399 covered statement/function/branch-arm locations, zero lost or added. This pure model suite renders no shared UI. Evidence: `/private/tmp/readability64-models-{before,after}` and logs. File ESLint/Prettier and explicit absolute-config hooks pass after the repository import-order autofix; the driver owns integrated full client types.

No supporting-file, production, helper, dependency, or README edits. Existing guidance supports retaining meaningful omission fixtures and narrowing local helper types; no new advice proposed.
