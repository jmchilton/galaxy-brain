### P3 1: Make the cached HDCA summary immutable so this bug class can't recur (implementation verified)

The root cause of the bug fixed here is that `dataset_dbkeys_and_extensions_summary` hands out mutable sets from a per-instance cache, so any reader that mutates them (as `to_dict(view="dbkeysandextensions")` did with `set.pop()`) silently corrupts the result for every later reader on the same instance. The `next(iter(...))` fix is complete for the one known caller, but nothing stops the next one.

Return `frozenset`s for `dbkeys`, `extensions`, and the store-times pairs. All current consumers (`to_dict`, `HDCASerializer.serialize_elements_datatypes` / `serialize_store_times_summary`, `get_converters_for_collection`) only iterate, take `len`, or call `list(...)`, so it's drop-in, and a future mutation becomes an immediate `AttributeError` rather than silent cache corruption.

<details><summary>Details</summary>

Commit `7339a7f68fc` on `pr_24538_review_0`:

```python
            # Frozen so readers can't corrupt the per-instance cache.
            self._dataset_dbkeys_and_extensions_summary = (
                frozenset(dbkeys),
                frozenset(extensions),
                states,
                deleted,
                frozenset(store_times.items()),
            )
```

`test/unit/data/model/db/test_misc.py` passes (25 tests). With the old `dbkeys.pop()` temporarily restored, the PR's `test_hdca_dbkeys_and_extensions_view_keeps_summary` fails with `AttributeError: 'frozenset' object has no attribute 'pop'`.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>
