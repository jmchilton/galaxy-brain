# Test challenges review — PR #24840

Profile: gx_test_challenger (`_shared/reviewers/gx_test_challenger.md`). Model: Claude Opus 5.5. Effort: low. Reviewed commit: `67d7e1ca88a`.

Details: [test_challenges_debrief.md](test_challenges_debrief.md).

### P2 1 — Most empty/short-input fixes have no regression test
Of 10 fix commits only the Otu/Sabund sniff, Lower/Square distance-matrix empty sniff and CountTable empty `set_meta` are covered. GroupAbund short/blank lines and `skip`, AlignCheck `data_lines` clamp, DistanceMatrix blank-line skip, PairwiseDistanceMatrix UnboundLocalError, and SffFlow empty dataset are untested. Add a parametrized `test/unit/data/datatypes/test_mothur.py` using `MockDataset` from `test/unit/data/datatypes/util.py` with small `tmp_path` inputs; each case should fail on `release_26.2`.

### P3 1 — CountTable doctest hand-rolls a dataset with `Bunch` and lambdas
Move it into the pytest module above using the existing `MockDataset` (as `test_tabular.py` does) instead of a docstring mock.

### P3 2 — No positive Sabund sniff test with a `label` heading line
`mothur_datatypetest_true.mothur.otu` covers the Otu heading skip, but no sabund fixture has one, so the new Sabund heading branch is unexercised. Add a true sabund fixture starting `label\tnumOtus\t...`.
