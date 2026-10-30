# `cleanup_datasets.py` calls `adjust_total_disk_usage` without a quota source label

- Area: scripts/cleanup_datasets/cleanup_datasets.py (`_purge_dataset`)
- Found while: [[Component - User Disk Usage Accounting]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

`_purge_dataset` (`scripts/cleanup_datasets/cleanup_datasets.py:619-667`), with `remove_from_disk`, unlinks the file, marks every non-purged HDA of the dataset purged, and decreases each holder's usage:

```python
for user in usage_users:
    user.adjust_total_disk_usage(-dataset.get_total_size())
```

`User.adjust_total_disk_usage(self, amount, quota_source_label, preserve_update_time=False)` (`lib/galaxy/model/__init__.py:1134`) has required `quota_source_label` since `f7a4992b4b2` (2023-02-07, "Implement quota tracking options per ObjectStore"). The call raises `TypeError` whenever a dataset still has a non-purged HDA owned by a user. The generic `except Exception` (`:663-664`) logs "Error attempting to purge data file", after the file is already unlinked and before `dataset.purged = True` is committed. The HDAs' `purged = True` stay pending in the session, so a later commit in the same script run may still write them.

Even with a label, the block would not match the recalculation rule. It decreases by the full size whether or not that HDA was the user's only charged one, and ignores `quota_source_info.use`. It also tests `hda.user not in usage_users` but appends `hda.history.user`.

`test/integration/test_scripts.py:95-106` only runs `--purge_histories`, so this path is untested.

## Evidence / repro

Code read only. Repro idea: delete (not purge) an HDA's dataset so `dataset.deleted` is set while an HDA stays unpurged, then run `cleanup_datasets.py --purge_datasets -r --days 0` and look for the logged `TypeError`.

## Suggested fix

Pass `dataset.quota_source_info.label` and skip when `use` is false, or drop the incremental adjustment and recalculate affected users afterwards the way `pgcleanup.py`'s `RequiresDiskUsageRecalculation` does (`scripts/cleanup_datasets/pgcleanup.py:395-431`).
