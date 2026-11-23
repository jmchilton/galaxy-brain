# PR #24840 initial review (default profile)

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5, effort: low (as run by the coordinator)
- Reviewed commit: `67d7e1ca88a`
- Diff: `git diff origin/release_26.2...HEAD` (10 commits, `lib/galaxy/datatypes/mothur.py` + 2 test files)

## Verdict

Most of the empty-dataset hardening is fine and small (CountTable, GroupAbund, AlignCheck, DistanceMatrix, SffFlow, PairwiseDistanceMatrix `all_ints`). One real regression: the new Otu/Sabund label check rejects integer labels, which mothur's `phylotype` writes, so its list/rabund/sabund outputs no longer sniff. All 16 mothur doctests pass at the PR head.

## Bugs

### P2 1 — `is_mothur_label` rejects phylotype labels, so `phylotype` list/rabund/sabund outputs no longer sniff

`MOTHUR_LABEL_RE = r"^(?:unique|\d*\.\d+)$"` only allows `unique` or a decimal of at most 1. The comment says a label "is never a plain integer", but mothur's `phylotype` labels OTU levels by taxonomy depth: `1`, `2`, `3`, ... (tools-iuc `tools/mothur/phylotype.xml` exposes `label` values `1`..`6`; its `final.tx.1.subsample.1.pick.shared` test data has label `1`). Those `taxonomy*.list` / `.rabund` / `.sabund` files sniffed correctly before and are rejected now.

Evidence (scratch files, sniffed with the base and PR module):

```
file          base: Otu  Sabund   PR: Otu  Sabund
tx.sabund           True True         False False   # labels 1,2,3
tx.list             True  -           False   -     # header + labels 1,2,3
an.sabund           False True        False True    # labels 0.03,0.05
```

Tool outputs declare their format, so this only hits upload or auto-detection. Still, it's a sniffer behavior change on a release branch in a PR pitched as empty-dataset hardening. The tightening isn't needed to fix #5767: the issue's file repeats label `1` on every line, and the new duplicate-label check alone rejects it.

Fix: also accept positive integers as labels (e.g. `^(?:unique|\d+|\d*\.\d+)$`, with the `<= 1` bound applied only to decimals), keep the uniqueness check, fix the comment, and add a phylotype-style true doctest file (integer labels) for both Otu and Sabund. The `false2` files still fail because of the duplicate labels.

## Nits

### P3 1 — Replace the commented `assert sequence_count > 0` with `return False`

In `LowerTriangleDistanceMatrix.sniff_prefix` and `SquareDistanceMatrix.sniff_prefix`, the PR keeps `assert sequence_count > 0` and adds a two-line comment explaining that sniffer exceptions count as "no match". A plain `if sequence_count <= 0: return False` says the same thing without the comment, and it still holds under `python -O`, where the assert is stripped. With `-O`, a file holding just `0` gives `line_num == 1 == sequence_count + 1` and sniffs True. The new `if line_num == 0: return False` is also redundant now that `sequence_count = 0` is initialized, since `0 != 0 + 1` already returns False. Drop it, or keep it and drop the init.

### P3 2 — The empty-input sniff doctests and several set_meta fixes aren't red-to-green

The new `empty.txt` doctests for LowerTriangle/SquareDistanceMatrix also pass on the base: the old `UnboundLocalError` was already swallowed by `is_of_type` / `run_sniffers_raw` and counted as False. They lock in behavior, but they don't test the fix. The GroupAbund short/blank-line skip, the AlignCheck non-negative `data_lines`, the DistanceMatrix blank-line skip, and the SffFlow empty guard have no tests at all. Only CountTable got an empty-dataset `set_meta` doctest. Optional: add one parametrized unit test that runs `set_meta` on `empty.txt` (and a blank-line file) for each touched class, instead of more doctests.

## Notes (not findings)

- CountTable: passing `skip=1` explicitly to `Tabular.set_meta`, instead of hand-patching `comment_lines`/`data_lines`, is the right reuse. The only side effect: for count tables over `MAX_DATA_LINES`, `comment_lines` becomes `None` rather than `1`. That matches every other Tabular subtype.
- Otu and Sabund now repeat the same header-skip, label-check and uniqueness loop. A small shared helper would keep the two in sync, though this is optional for a release-branch fix.
- `false2.mothur.otu` and `false2.mothur.sabund` are byte-identical (the #5767 example). That's fine.
