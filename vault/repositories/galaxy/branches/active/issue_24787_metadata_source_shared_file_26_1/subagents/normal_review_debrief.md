Acted on the mixed `store_by` regression, the same-Dataset test gap and the helper simplification. Did not act on the test-shape nit, `extended_celery`, or repairing existing rows.

Not acted on:

- Five read-only integration checks each run a full job: left for the test challenge step.
- `extended_celery` isn't covered: same job-side path, not run.
- Existing damaged rows stay damaged, and an affected output still resolves to the input's row. Reported for the scope evaluation.
- The Dataset id comparison in `_belongs_to_other_dataset` is reachable only from `ExtendedDirectoryMetadataGenerator.load_metadata`, which the reviewer found has no production caller. Kept: `make_copy` now returns `None` for another Dataset's file, so a clone misjudged there would lose its file.

<details><summary>Details</summary>

Run via Opus 5.5 at the session's effort (medium).

**HIGH, fixed.** The first version fell through to `object_store.exists()` for a job-side Dataset with no `object_store_id` or id. With any `store_by: id` backend in a distributed store, even at weight 0, that raises `AssertionError`; `output_collect.py` catches it and the collection fails. Fix: `make_copy` returns `None` directly. Reproduced with `TestMetadataSourceDiscoveredExtendedMixedStoreBy` (red on the first version with an empty collection, green now).

**MEDIUM, fixed.** Nothing pinned same-Dataset behaviour. Added `test_make_copy_of_new_metadata_file`. Mutating the helper to `return True`, `return False`, identity-only, and dropping the identity check each fail it.

**LOW, resolved by the fix.** `session.add` is `None` job-side after fall-through: no longer reached.

**LOW, partly acted on.** Helper now uses `MetadataFile.dataset`, and its docstring no longer overstates the clone path.

**Paths reviewed.** Job-side `metadata_source` and `init_from` (other Dataset, set_meta regenerates); HDA/LDDA copies and `copy_dataset_instance_metadata_attributes` (same Dataset object, unchanged); model store import (file owned by target, unchanged). Every datatype with a `FileParameter` regenerates via `new_file` even with `overwrite=False`, except maf on non-MAF input and tool-provided metadata, which skip `set_meta`.

**Base.** `807c53fc441` puts `metadata_source` in the job-side output definition and adds the job-side provider; it's in 26.1, not 26.0.

</details>
