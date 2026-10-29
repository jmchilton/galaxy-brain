# Filtered findings — #24535 (verify round 0, `deed873a70a`)

- Milestone 27.0 vs. the `release_26.2` base (aside in default P2 1): a metadata nit. It isn't something the author can act on in code, and P2 1's retarget supersedes it.
- gx_test_challenger P3 1, "Tests otherwise appropriate": informational only, so no action.
- Default design notes (layer choice for the int fix, other typed params, edge values, `sel` whack-a-mole, test placement): the reviewer marked them "no action required". The better-layered dev follow-up, spec-aware splitting at the `output_actions.py` TODO, is a separate refactor and not a review finding for this release-branch fix.
- Risk notes (the `sel` name being a one-way door, `IntParameter` accepting `["7"]` from the API): no P-labeled findings. Hiding `sel` from upload (P3 1) narrows its exposure.

## Trim round (2026-10-28)

- P2 2, "`sel` datatype registration has no test": Trimmed by John.
- P3 1, "`sel` datatype is shown in upload with no description": Trimmed by John.
