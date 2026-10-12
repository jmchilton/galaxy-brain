# check-style-imports — independent review, batch 64

Approve author commit `33c3df90b4c83062869840b4d897ed05155b66ee` against pinned base `846fdc7466ed145ef8bab8fdf76a10bdb2c0476e`. Independent shuffled seed 640201 passes 21 cases. All 20 original examples/checks remain unchanged. The added literal aggregate expectation verifies two forbidden imports around an allowed import and their exact source line numbers.

The bounded author mutation's logs show first-result-only behavior passing all 20 original cases, failing only the added check, and restored final source passing all 21. This gives concrete value to the extra case without altering implementation or expanding shared helpers.

Independently verified byte-identical production script across both refs and exact equality of all 18 actual covered statement/function/branch-arm locations. The raw reports each contain 23 locations; five statement spans map entirely onto comment line 2, some beyond its real line length, with changed generated columns. Excluding precisely these five comment-only transform artifacts is justified; no real source location is lost. This is an explicitly qualified source-coverage result, not a claim of raw-map equality or CLI filesystem-scanning coverage. No further changes or new guidance recommended.
