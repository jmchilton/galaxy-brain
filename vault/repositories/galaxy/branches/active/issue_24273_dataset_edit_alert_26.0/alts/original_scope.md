# original_scope

Branch: `issue_24273_dataset_edit_alert_26.0_alt_original_scope` at `072f8e9fa80` on the `jmchilton` fork.

This is the branch as it stood after the first hardening pass, before the re-scope. `DatasetView` blocks only on the first load of a dataset, so a background refetch no longer unmounts the Edit tab. `DatasetAttributes` rebuilds its forms in place, both after a save and when the stored dataset's `update_time` changes.

How it differs from the parent: the parent keeps all of this and adds the expansion recommended in [scope_evaluation](../scope_evaluation.md):
- the "first load blocks" logic becomes a shared composable used by `DatasetView` and `DatasetDisplay`;
- `loadError` blocks the view only before the first load;
- the upstream save-error fix from #23985 is backported.
