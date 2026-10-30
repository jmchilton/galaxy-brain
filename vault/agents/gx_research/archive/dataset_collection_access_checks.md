# Component - Dataset and Collection Access Checks

Document how Galaxy decides whether a caller can access a dataset, HDA, LDDA, HDCA or collection element: `GalaxyRBACAgent` (`can_access_dataset`, `can_access_datasets`, `can_access_collection`, `dataset_access_mapping`, and on dev `accessible_dataset_ids`), `DatasetManager`/`HDAManager`/`HDCAManager` `is_accessible` and `get_accessible`, history ownership/sharing/importable rules, the admin bypass, and `JobManager.get_accessible_job`. Cover which API responses filter per item versus fail the whole request, and the batching helpers that avoid per-item queries. Leave out library permission UI and object-store privacy (see `Component - Private Object Stores`).

## Why

Two branches (compare_runs, job_parameters_input_access_25.1) had to rediscover the several overlapping access helpers, their parity, and which one fits a batch of items; only branch notes describe them. `Component - Private Object Stores` covers the storage flag, not the role-based access rule.

## Requested by

- vault/repositories/galaxy/branches/active/job_parameters_input_access_25.1/brain_research.md: per-item access decision for data inputs in `parameters_display`, on a release branch without the dev batch helper.
- vault/repositories/galaxy/branches/active/converted_dataset_lookup_via_manager_26.0/brain_research.md: which helper (`HDAManager.is_accessible` / `get_accessible` vs `can_access_dataset`) to apply to a related dataset reached through a model relationship (implicit conversions), and how it treats admin, anonymous users and LDDAs.

## Debrief

- **Created** `vault/research/Component - Dataset and Collection Access Checks.md`, verified against Galaxy `origin/dev` @ `65e6daff`.
- **Correction to the request**: `accessible_dataset_ids` is *not* on dev. It exists only on the unmerged `compare_runs` branch (commit `1e8f1517438`, no PR), together with `SharableModelManager.accessible_ids`. The note documents the dev baseline and labels both helpers as proposed in their own section.
- **Covered**:
  - The two rules: the dataset rule (role-based) and the history rule (sharable).
  - Each `GalaxyRBACAgent` helper with its input type, query cost and parity.
  - Manager `is_accessible`/`get_accessible` per manager. `HDCAManager` doesn't implement `is_accessible` (501).
  - The two LDDA paths, the admin bypass (where it lives and where callers must add it), and anonymous-user and role-resolution details.
  - HDCA vs DCE gating, and `get_accessible_job`: output, collection and history fallback, the 25.1 difference, PR #22603.
  - A surface table of fail vs degrade vs filter vs skip.
  - A "choosing a helper" guide covering related datasets reached through relationships, such as converted HDAs and how their permissions are derived at converter-job creation.
- **For the requesters**:
  - `job_parameters_input_access_25.1`: on 25.1 there's no batch role-id helper. Use per-item `hda_manager.is_accessible` / `can_access_dataset` with an explicit admin bypass, or `dataset_access_mapping`.
  - `converted_dataset_lookup_via_manager_26.0`: apply `hda_manager.is_accessible` to the converted HDA's own Dataset. Admins pass. Anonymous users pass only for public datasets. LDDAs use the dataset rule via `is_accessible`.
- **Research issues filed**: `research_issues/hdcamanager-is-accessible-not-implemented.md`, `research_issues/rbac-batch-access-helpers-dead-duplicates.md`.
- **Cross-refs**: `related_notes` backlinks added, with revision bumps, to `Component - Private Object Stores`, `Collection Models`, `Collection API`, `Implicit Dataset Conversion` and `API Tests`. The stale open question in `Implicit Dataset Conversion` ("same permission checks?") wasn't edited. The new note's "Choosing a helper" section answers it.
- **Out of scope**:
  - Library permission UI and object-store privacy, per the request.
  - Workflow/page/visualization access beyond the shared `SharableModelManager` rule.
  - Legacy mako controller checks in `webapps/base/controller.py`.
