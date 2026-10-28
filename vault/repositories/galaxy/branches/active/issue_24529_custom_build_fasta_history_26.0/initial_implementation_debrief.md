# Initial implementation debrief

Head `0ee1473ec4e` on `release_26.0`. `add_custom_builds` resolves a history the requester owns (FASTA's history if owned, not deleted/archived → `trans.history` → most recent non-deleted/non-archived → 400) and passes `history=` to both `get_converted_dataset` calls. Fixes API-key 500 (`assert history`). API test `test_custom_build_from_fasta` red (500) before, green after; asserts outputs land in FASTA's history, not a newer one.

Not fixed (same omission elsewhere): `services/datasets.py:849,928`, `model/__init__.py:5787` and dependency recursion `5547/5576`, `visualization/genomes.py:321,400`, `managers/dbkeys.py:146`, `visualization/data_providers/registry.py:114`.

```
created .../differential-review/snapshots/20261028T050139Z-implementation-0ee1473ec4e2.json
  implementation @ 0ee1473ec4e2 vs origin/release_26.0 (merge-base 29d1801ad21b)
  first snapshot: 1 commit, 2 files, 6 hunks
```

## After rescope

See `implementation_rescope_debrief.md`.

```
exists .../differential-review/snapshots/20261028T053851Z-implementation-dacb7d38dd6b.json
  implementation @ dacb7d38dd6b vs origin/release_26.0 (merge-base 29d1801ad21b)
  since 20261028T050139Z-implementation-0ee1473ec4e2:
    commits: 1 same, 0 rebased, 0 changed, 5 new, 0 dropped
```

## After rescope 2

```
created .../differential-review/snapshots/20261028T150017Z-implementation-1ba51ea6acc9.json
  implementation @ 1ba51ea6acc9 vs origin/release_26.0 (merge-base 29d1801ad21b)
  since 20261028T061915Z-hardening-0a6c27e2cae3:
    commits: 5 same, 0 rebased, 0 changed, 1 new, 0 dropped
    hunks:   19 carried, 1 changed, 1 new, 1 dropped
```
