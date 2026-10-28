# Filtered findings — galaxy#24540

Filtered during verification of `613265a0d2f`.

- **Adapters count `elements_deleted` from `hda.deleted or dataset.deleted` but `elements_purged` from `hda.purged` only** (gx_risk_assessment, learning_galaxy side note). Not actionable: `PurgableManagerMixin.purge` deletes before it marks purged, and the direct writers (`HDAManager` bulk purge, `DatasetInstance.clear`, history `purge_deleted`) keep purged ⊆ deleted. Adapter summaries feed tool evaluation, not the history panel. Client `deletedNotPurgedCount` clamps at 0 anyway. Job-output paths (`discover.py` via `output_collect.py`, and `set_metadata.py` for missing output files) can mark an HDA purged without deleting it. These predate the PR, and the zero clamp absorbs them: the description shows "N purged" with no deleted count.
- **`DatasetCollection.elements_deleted` session-less fallback returns a bool, not a count** (learning_galaxy, default P3 3 aside). Pre-existing code the PR doesn't touch. The PR's `elements_purged` returns an int on both paths. Verified P3 4 annotates it as `int` so it can't copy the quirk.
