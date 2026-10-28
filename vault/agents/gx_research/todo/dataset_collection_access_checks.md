# Component - Dataset and Collection Access Checks

Document how Galaxy decides whether a caller can access a dataset, HDA, LDDA, HDCA or collection element: `GalaxyRBACAgent` (`can_access_dataset`, `can_access_datasets`, `can_access_collection`, `dataset_access_mapping`, and on dev `accessible_dataset_ids`), `DatasetManager`/`HDAManager`/`HDCAManager` `is_accessible` and `get_accessible`, history ownership/sharing/importable rules, the admin bypass, and `JobManager.get_accessible_job`. Cover which API responses filter per item versus fail the whole request, and the batching helpers that avoid per-item queries. Leave out library permission UI and object-store privacy (see `Component - Private Object Stores`).

## Why

Two branches (compare_runs, job_parameters_input_access_25.1) had to rediscover the several overlapping access helpers, their parity, and which one fits a batch of items; only branch notes describe them. `Component - Private Object Stores` covers the storage flag, not the role-based access rule.

## Requested by

- vault/repositories/galaxy/branches/active/job_parameters_input_access_25.1/brain_research.md: per-item access decision for data inputs in `parameters_display`, on a release branch without the dev batch helper.
- vault/repositories/galaxy/branches/active/converted_dataset_lookup_via_manager_26.0/brain_research.md: which helper (`HDAManager.is_accessible` / `get_accessible` vs `can_access_dataset`) to apply to a related dataset reached through a model relationship (implicit conversions), and how it treats admin, anonymous users and LDDAs.
