# custom_build_no_converter_400_26.0 polish debrief (2026-10-21)

Head `96113857dae` throughout. Polishing changed no branch code.

## CI
Fork CI on `96113857dae` was all queued/pending with no reds at start and at hand-off. The earlier run on `75c806699c3` was cancelled by the push.

## Checklist (GENERAL.md only)
Every item passed; nothing to fix.

## Strengthening (one round)
Branch tasks: none. Verification only:
- Ran #24310's `test_custom_build_from_inaccessible_dataset` on this branch (temporarily added, reverted). It returns 403 `403002`: the converter tool action's own input access check now propagates instead of being wrapped as a 500. So "only unconvertible requests change status" was wrong.

Description fixes:
- Table gained a "Galaxy error with its own status" row; Risks reworded to match.
- Bold-italic audience line: API clients and trimmed datatypes configs; the stock UI only offers FASTA datasets.
- Bold-italic #24310 line: complementary, both needed (a cached `len` skips the tool's access check).
- Scope-eval bullet corrected: API tests use stock datatypes, so a happy-path FASTA API test is blocked by the no-current-history bug, not missing converters. Selenium on 26.0 covers only pasted `len`.
- "What does the user see" qualified: UI alert only on a server missing a converter.
- Skipped citing the API-key `assert history` bug as the row-4 example, since that invites widening scope.

Outside the PR: corrected `gx_issues/to_file/custom_build_fasta_api_no_current_history.md`, which said the `AssertionError` would still be swallowed on this branch. It now surfaces as an unhandled 500.

## Questions for John
- Landing order versus #24310: recommend this lands only after #24310 is merged forward into 26.0 (or fold into #24310 on 25.1). Reason given privately in the polish session.
- Fix the API-key no-current-history bug (`history=` on `get_converted_dataset`) here or keep it as the queued separate issue? Kept separate.
