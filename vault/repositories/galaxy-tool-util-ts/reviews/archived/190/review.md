# Review: TypeScript draft parity fixes

Reviewed `/private/tmp/gxformat2-219-ts` branch `fix/draft-parity-219` against base `eb7e4ea3`, including both handwritten source changes, the added purity/idempotence tests, synced expectations, added fixtures, and schema-package changeset.

No blocking correctness or regression findings.

- The list-step iterator now agrees with normalized Format2 on anonymous index IDs and workflow-input offsets. Extraction computes surviving identities from original iteration positions and inserts string IDs only when filtering would move an anonymous step. It creates fresh step objects before adding IDs, including recursively extracted inline drafts.
- Shared input/step semantic checks are reused rather than duplicated. The diagnostic collector checks raw inputs and raw step state, recurses into both concrete and draft inline workflows, and retains diagnostic paths. The existing whole-workflow semantic validator now also follows draft inline workflows.
- Reference splitting reuses the shared longest-label resolver, covering slash-containing labels without changing bare workflow-input behavior.
- List-form input TODO detection, implicit subworkflow inference, and code-point ordering align with Python. The code-point comparator also correctly orders BMP private-use characters before supplementary-plane characters, where UTF-16 sorting would disagree.
- Existing tests were retained, and fixture-based extraction tests check validity, non-mutation, and idempotence for both outer and nested list steps. A changeset accompanies published-source changes.

Verification performed independently: `pnpm exec vitest run packages/schema/test/draft-checks.test.ts` passed (86 tests); `git diff --check` passed. Direct runtime checks confirmed supplementary-plane ordering and shared semantic diagnostics for a concrete inline subworkflow's invalid input restriction.

Optional coverage improvement: the mixed-case shared sorting fixture only uses ASCII labels. A supplementary-plane versus BMP pair would protect the explicit code-point comparator from being simplified to ordinary JavaScript sorting later; current implementation was verified manually and is correct.

## Follow-up: malformed nested raw input robustness

Reviewed the follow-up guards in `semantic-validators.ts` and the `synthetic-draft-bad-nested-input-shapes` fixture/expectation. The non-mapping column, nonstring collection-type, and nonarray column-definition/column-choice checks correctly turn malformed nested inputs into diagnostic-friendly errors. Nullable values and empty lists permitted by the schemas retain their previous behavior. No blockers in these guard changes.

Independent rerun of draft and declarative fixture suites passed: 526 passed, 5 expected failures, 1 skipped (532 total). The new nested malformed-input expectation passed.

Nearby pre-existing semantic parity gap reported to the implementer: Python rejects nonempty `fields` on a known non-collection input type even if `collection_type` includes `record`; TypeScript's existing block only checks the rank. A raw nested input with `type: data`, `collection_type: record`, and a nonempty fields list therefore differs. This is not caused by the new robustness guards, but aligning the shared validator would improve the synchronization objective.

## Final disposition: commit 0dc940df / TypeScript PR #190

Verified the final source now checks nonempty record fields against known collection input types before the text-only checks. The shared negative fixture `synthetic-draft-bad-record-input-type` covers the previously reported data-input parity gap, resolving that observation.

Verified the new shared `synthetic-draft-unicode-order` fixture compares a supplementary-plane emoji with the BMP private-use character U+E000, with expectations for planner selection, dropped-step order, and dropped-output order. This resolves the optional Unicode coverage suggestion.

No outstanding findings from this review. Final aggregate validation reported by the implementing agent: schema suite 5100 passed; full monorepo suite 6293 passed; required checks passed. No additional broad tests run for this final source/fixture inspection.
