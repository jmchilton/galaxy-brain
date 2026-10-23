# faqs/galaxy/datasets_quotas_for_datasets_and_histories.md — 26.2, source review

GTN `45d4932d33`; Galaxy `release_26.2` (`UNIQUE_DATASET_USER_USAGE` in `lib/galaxy/model/__init__.py`).
No UI steps. No tutorial embeds it.

## GTN

- `quotas-shared-histories` (main): "shared with you are only **partially considered** unless you
  import them" is wrong. Usage is the size of the unique datasets in your own unpurged histories, so
  shared data you haven't imported counts for nothing. Once imported it counts in full, even though
  the owner's copy counts for them too. Datasets from a data library never count.
- The deleted/purged bullets are right: the purging FAQ's run showed usage dropping only on purge
  (`test_purge_deleted_datasets_from_storage_dashboard` asserts it).
