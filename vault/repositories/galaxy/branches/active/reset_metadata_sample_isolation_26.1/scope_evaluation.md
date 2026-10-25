Recommendation: retain the scope as implemented. The branch fixes the complete sample-isolation problem—de-suffixed copies entering repository scans, copies surviving revision changes, and historical revisions reading tip samples—through the existing validation context for every metadata-generation caller. No additional scope change is recommended.

## Possible Decompositions

The final diff against `d9647406cf6` changes two non-generated files, with 89 added and 24 removed lines. One possible two-PR sequence is: (1) the behavior-preserving `files_dir` path/cleanup preparation from `c6ee20cecd5`; (2) sample workspace isolation and revision-local sample selection, together with the final public-API regressions. The test migration commit could be folded into the second piece when preparing that decomposition. Alternatively, the present ordered commits can remain together. This describes the available split without recommending one.

## As implemented: isolate sample validation and select revision-local inputs

Use `ValidationContext` as the single owner of temporary sample files while retaining the repository directory as the scan/path source. Remove the tip-working-copy fallback for resets; cover both sample-only tools and historical table/sample changes through the public repository API.

| Pros | Cons |
|---|---|
| <ul><li>Addresses all three observed symptoms with one ownership rule, including exception cleanup.</li><li>Applies the same staging rule to reset and non-reset metadata generation, avoiding a reset-only mode.</li><li>Already uses the canonical abstraction and public API coverage.</li></ul> | <ul><li>Some repositories receive different metadata after reset: sample-only tools disappear and historical revisions use their own samples.</li><li>Reset also stops accepting an ordinary root `.loc` as a substitute for a required sample.</li></ul> |

This is already the modest generalization favored by the scope process: a consistent validation workspace rather than a guard for one sample filename or one reset symptom. The review reports identify no remaining adjacent sample-isolation defect requiring another expansion.

## Contract: fix only scan contamination or only historical sample selection

Keep only the temporary-directory change, or only remove the tip-sample fallback. Each could repair one symptom, but they would leave the other half of the same reset failure surface intact.

| Pros | Cons |
|---|---|
| <ul><li>Smaller individual behavior change.</li></ul> | <ul><li>Leaves either stale inputs or de-suffixed copies affecting reset results.</li><li>Does not deliver the complete isolation guarantee demonstrated by the two regression scenarios.</li></ul> |

## Expand: isolate real-upload table validation from process-wide tables

The source dry-run branch records that upload-side table configuration checking can depend on tables accumulated in a worker, while generation already uses fresh validation tables. A broader change could make that upload check use per-upload state, remove it as redundant, or validate against a defined registry.

| Pros | Cons |
|---|---|
| <ul><li>Could eliminate worker-history-dependent upload acceptance.</li><li>Extends isolation to an adjacent validation stage.</li></ul> | <ul><li>Requires choosing the intended upload validation policy; these alternatives accept different repositories.</li><li>The extracted fix neither adds nor relies on that process-wide check, and already isolates metadata generation.</li><li>Combining it would merge the separate upload-policy decision back into the independently extracted reset repair.</li></ul> |

Do not expand here. This is a different state boundary and acceptance contract, rather than another consumer of the temporary sample workspace. The source branch already records it as a decision for John; this review found no new scope evidence that resolves that decision.

## Expand: recreate all empty/non-downloadable metadata rows during reset

The source branch notes that uploads can retain a non-downloadable row for a sample-only revision while reset does not recreate that row. Expand reset to reproduce the complete row history, beyond the tool metadata this branch repairs.

| Pros | Cons |
|---|---|
| <ul><li>Could provide fuller upload/reset historical parity.</li></ul> | <ul><li>Changes reset's general row-retention policy rather than sample selection or staging.</li><li>The source evaluation did not establish that difference as a regression caused by this fix.</li><li>Would require defining which otherwise empty intermediate revisions reset must preserve.</li></ul> |

Do not expand without a concrete row-retention requirement. Preventing a sample-only revision from becoming an executable tool is necessary here; preserving every intermediate metadata row is a separate behavior decision.

## Expand: consolidate repository path conversion or add a sample resolver

Extract the remaining path-conversion loops or introduce a generalized sample-resolution layer. The quality review considered those options and found that the existing validation context already removes the relevant ownership and cleanup complexity.

| Pros | Cons |
|---|---|
| <ul><li>Could centralize older path handling.</li></ul> | <ul><li>No additional caller or unresolved use case needs a resolver.</li><li>Would enlarge the installed-repository path semantics surface without strengthening the delivered isolation behavior.</li><li>The current change removes plumbing rather than adding another abstraction.</li></ul> |

<details>
<summary>Scope inputs and boundary</summary>

Reviewed the current record, recovered initial debrief, test challenge, code-quality review, baseline-refactoring report, and the original dry-run branch's second scope evaluation and rescope debrief. The latter explicitly describes extracting this reset repair as an independent deliverable and separately records upload validation and data-manager decisions. Dry-run response fields, data-manager revision keys, upload moderation, and client integrations are not prerequisites for this repair. This conclusion rests on the already-general implementation and distinct behavior contracts, not on the release target or the original issue's wording. Correctness and test execution were left to the completed review steps; no code or tests were changed in this scope evaluation.

</details>
