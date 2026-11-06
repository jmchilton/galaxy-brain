# Component - HDA Copies and Dataset Sharing

Document how HDAs share `Dataset` rows: `HistoryDatasetAssociation.copy`, `copy_from` and `Job.copy_from_job`'s use of it, the `copied_from_history_dataset_association` / `copied_to_history_dataset_associations` links, which callers go through each path (history and collection copies, model operation tools, `DatasetCollection.replace_elements_with_copies`, expression tool outputs, deferred materialization), what propagates to copies and what stays per-copy, what `Dataset.full_delete` does and doesn't do, and how the row locks from galaxyproject/galaxy#24673 serialize `copy` with `copy_from` if that PR has merged forward. Leave out job cache matching rules (see `Component - Jobs API and Job Cache`) and disk usage charging (see `Component - User Disk Usage Accounting`).

## Why

#24673 turns HDA copying into a locking contract and changes which attributes propagate to copies, and no research note covers copies as a model facet. `Component - Jobs API and Job Cache` stops at `copy_from(out_data, ...)` and `Component - Collection Models` covers collections only.

## Requested by

- vault/repositories/galaxy/reviews/active/24673: `copy` / `copy_from` semantics, dataset sharing and purge behaviour needed to understand the late job cache race.
