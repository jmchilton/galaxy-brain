---
type: research
subtype: component
tags:
  - research/component
  - galaxy/lib
  - galaxy/models
  - galaxy/datasets
  - galaxy/admin
status: draft
created: 2026-10-30
revised: 2026-10-30
revision: 1
ai_generated: true
component: User Disk Usage Accounting
galaxy_areas:
  - lib
  - models
  - datasets
  - admin
summary: "How Galaxy charges, frees and recalculates per-user and per-quota-source disk usage, and the open #24511 rework of it"
sources:
  - "vault/agents/gx_research/archive/user_disk_usage_accounting.md"
  - "https://github.com/galaxyproject/galaxy/pull/24511"
related_prs:
  - 24511
  - 22180
related_notes:
  - "[[Component - Job Completion Lifecycle]]"
  - "[[Component - Private Object Stores]]"
  - "[[Component - Jobs API and Job Cache]]"
---

# User Disk Usage Accounting

Verified against Galaxy `origin/dev` @ `65e6daff2334c8cfd4971682eecfb87f38a224be`. Line numbers are at that SHA, and paths are under `lib/galaxy/` unless they start with `scripts/` or `test/`.

[PR #24511](https://github.com/galaxyproject/galaxy/pull/24511) ("[25.1] Fix negative user disk usage after purging datasets", head `46102a0d363`) is **open** against `release_25.1` and not on `dev`. Most of the symbols the research request named come from that PR: `sole_dataset_sizes`, `dataset_holders`, `datasets_in_libraries`, `adjust_disk_usage_for_datasets`, `History.charge_added_datasets`, `Dataset.uncharged_states`, the pending SQL-expression write, and the Postgres difference-apply recalculation. None of them exist at this SHA. The [baseline](#baseline-at-this-sha) sections describe `dev`. The accounting code there matches `release_25.1` except for `HistoryManager.purge`, which [#22180](https://github.com/galaxyproject/galaxy/pull/22180) changed on `dev`. Everything #24511 would change is under [Proposed by #24511](#proposed-by-24511-open-251).

## Scope

In scope: where usage is stored, the rule for what a user is charged, every code path that charges or frees usage, the recalculation SQL and its entry points, and the concurrency between incremental writes and recalculation. Quota sources and the BYOS exemption are covered only as far as accounting needs them.

Out of scope: quota *enforcement* and the quota UI (`QuotaAgent.is_over_quota`, `quota/__init__.py:365-379`, and the job pause in `jobs/__init__.py:1911-1921`), admin quota CRUD, and the storage-move feature beyond the relabel hook. For job-level detail on `finish()`, see [[Component - Job Completion Lifecycle]]. For BYOS, see [[Component - Private Object Stores]].

## Model in one paragraph

Galaxy stores usage per user and keeps it current with **incremental** adjustments: jobs add their outputs' size when they finish, and purges subtract it. A **recalculation** recomputes usage from scratch. It counts every distinct dataset of the user's non-purged HDAs in non-purged histories, except datasets in a library and datasets in a user-defined (BYOS) store. Both sides are meant to implement the same rule. When they disagree, the stored value drifts until someone recalculates. #24511 is about that drift, and about how incremental writes interleave with a recalculation that is running.

## Storage

| What | Where | Notes |
|---|---|---|
| Default quota source usage | `galaxy_user.disk_usage`, `Numeric(15,0)`, indexed (`model/__init__.py:888`) | Usage for datasets whose quota source label is `None` |
| Labelled quota source usage | `user_quota_source_usage` (`UserQuotaSourceUsage`, `model/__init__.py:4498-4509`) | One row per `(user_id, quota_source_label)`, unique constraint `uqsu_unique_label_per_user`. Reached through `User.quota_source_usages` (`:914`) |
| Anonymous usage | none | Anonymous users are measured by `History.disk_size` of their current history (`QuotaAgent.get_usage`, `quota/__init__.py:54-71`). `GalaxySession.disk_usage` (`model/__init__.py:8918-8945`) has no writer outside its own setter at this SHA |
| Per-history size | `History.disk_size` hybrid property (`model/__init__.py:4097-4149`) | Sum of `total_size` over distinct non-purged datasets of non-purged HDAs. Computed on demand, not stored |
| Per-dataset size | `Dataset.total_size` / `file_size` | `set_total_size()` (`:5083-5095`) adds the extra files directory to `file_size`. `get_total_size()` (`:5074-5081`) sets it if missing **and commits** |

Readers: `User.get_disk_usage(nice_size, quota_source_label)` (`:1097-1124`) returns `disk_usage` for the default source and runs a raw `SELECT` on `user_quota_source_usage` for a label. `dictify_usage` / `dictify_usage_for` (`:1359-1412`) feed `GET /api/users/{user_id}/usage` (`webapps/galaxy/api/users.py:324`). `calculate_disk_usage_per_objectstore` (`:832-835`) backs `/objectstore_usage` (`:340`) with a separate per-object-store `GROUP BY`.

## Quota sources and BYOS

`Dataset.quota_source_info` (`model/__init__.py:4959-4963`) asks the object store's `QuotaSourceMap.get_quota_source_info(object_store_id)` (`objectstore/__init__.py:2236-2241`) for a `QuotaSourceInfo(label, use)`:

- A configured backend returns its own label and `use` flag. `use=False` means a backend with quota tracking disabled.
- A `user_objects://` (BYOS) id returns `QuotaSourceInfo(None, use=False)`, so BYOS data is never charged incrementally. The recalculation excludes it with `object_store_id NOT LIKE 'user_objects://%'`. The exemption and its enforcement side are described in [[Component - Private Object Stores]].
- Any other id returns the default `(default_quota_source, default_quota_enabled)`.

Every incremental write checks `use` before it adjusts. The recalculation instead builds its `WHERE` clauses from `default_usage_excluded_ids()` and `ids_per_quota_source()` (`:2260-2287`), which list the backends that are labelled or disabled.

`DatabaseQuotaAgent.relabel_quota_for_dataset` (`quota/__init__.py:177-264`) is a fourth writer. When a dataset changes object store (`DatasetManager.update_object_store_id_for_user`, `managers/datasets.py:144-170`, and cross-device storage moves, `managers/dataset_storage_operations.py:1655-1662`), it subtracts the dataset's size from the old label and adds it to the new one, for every user who has an HDA of the dataset. It maps ids to labels with `get_quota_source_label`, not `get_quota_source_info`.

## Baseline at this SHA

### Incremental writes: `User.adjust_total_disk_usage`

`adjust_total_disk_usage(amount, quota_source_label, preserve_update_time=False)` (`model/__init__.py:1134-1177`) is the only incremental primitive. It does nothing when `amount == 0`.

- **Default source, normal path:** `self.disk_usage = (self.disk_usage or 0) + amount`. This is a read-modify-write in Python, written to the database at the next flush. Two sessions that both loaded the user overwrite each other.
- **Default source, `preserve_update_time=True`:** an immediate `UPDATE galaxy_user SET disk_usage = disk_usage + :amount, update_time = <current>`. This avoids the `onupdate=now` bump. Only `HDAManager._purge` passes it, from the `preserve_owner_update_time` purge option. Because it uses `disk_usage + amount` without `COALESCE`, a `NULL` usage stays `NULL`.
- **Labelled source:** an immediate upsert that executes before any flush. Postgres uses `INSERT ... ON CONFLICT ON CONSTRAINT uqsu_unique_label_per_user DO UPDATE SET disk_usage = user_quota_source_usage.disk_usage + :amount`. SQLite uses `INSERT OR REPLACE` joined against the old row, a workaround for SQLite before 3.24. This path is atomic in the database and locks the label row until the caller commits.

`HistoryDatasetAssociation.purge_usage_from_quota(user, quota_source_info)` (`:6482-6485`) is a thin wrapper that subtracts `quota_amount(user)` when `use` is set.

### The charging rule at this SHA: `HDA.quota_amount(user)`

`quota_amount(user)` (`model/__init__.py:6487-6507`) returns the HDA's `get_total_size()`, or 0 when any of these hold:

- there is no user (anonymous users are measured per history, not charged);
- the dataset has any library association, or the HDA or its dataset is purged;
- another non-purged HDA of the same dataset belongs to `user`, so the user already pays for it.

The check loads `dataset.history_associations` and each HDA's history, so its cost is one query per holder. It does not look at the dataset state, so an output of a running job counts at its current partial size. `get_total_size()` also commits when `total_size` is unset.

The recalculation counts the same set. The main differences are that it also skips purged histories, and it doesn't check `dataset.purged`.

### Who charges

| Path | Code | What it charges |
|---|---|---|
| Job `finish()` | `jobs/__init__.py:2484-2523` | Sum of `set_total_size()` over `job.output_datasets`, to `job.user` only, under the last output's quota source. A purged output resets the sum (`research_issues/finish-purged-output-resets-collected-bytes.md`). The transaction layout is covered in [[Component - Job Completion Lifecycle#Disk accounting]] |
| Job `fail()` | `jobs/__init__.py:1580-1703`, `__update_output` `:2978-3001` | Nothing. It calls `set_total_size()` and keeps partial outputs, but doesn't charge them |
| `History.add_dataset(..., quota=True)` | `model/__init__.py:3885-3918` | `dataset.quota_amount(self.user)` for one HDA when the history has a user and `use` is set. Callers using the default: `HDAManager.create` (`managers/hdas.py:172`), `HDAManager.materialize` (`:205`), workflow `copy_inputs_to_history` (`workflow/modules.py:1187`), the skipped pick-value HDA (`:2373`), and the legacy async controller (`webapps/galaxy/controllers/async.py:197`) |
| `History.add_datasets(..., quota=True)` | `model/__init__.py:3920-3943` | Optimized branch (`len > 1`): `sum(get_total_size())` with no duplicate or already-held check, under `datasets[0]`'s quota source. No caller passes `quota=True` with several items at this SHA. `add_pending_items` (`:3837-3843`) always passes `quota=False` |
| `History.copy(target_user=...)` | `model/__init__.py:3971-4003` | `add_dataset(new_hda, quota=target_user != self.user)`, so a history copied to another user charges per HDA through `quota_amount`. Collection elements that are not also among the copied HDAs (deleted ones, for example) are not charged |
| Anonymous history adopted at login | `webapps/base/webapp.py:808-833` | For each HDA in the previous anonymous history, `adjust_total_disk_usage(hda.quota_amount(user), label)`. It does not check `quota_source_info.use`, and it runs whenever the previous session was anonymous, even if the history already belongs to the user |
| Upload / data fetch | `tools/actions/upload_common.py:152`, `model/dereference.py:91` | `quota=False`. The upload job's `finish()` charges instead |

Paths that add datasets to a history **without charging** at this SHA: `HDAManager.copy` (`managers/hdas.py:211-242`, through `stage_addition` / `add_pending_items`), collection copies, workflow inputs copied from another history, job-cache hits (`jobs/__init__.py:1439-1449` and `completed_job` in `tools/actions/__init__.py`, which share the cached job's datasets and never reach `finish()`; see [[Component - Jobs API and Job Cache]]), and model store / history archive imports (`model/store/__init__.py:1136-1137`). Copies of a user's *own* datasets are free under the rule. Copies of another user's datasets and imported data stay uncounted until the next recalculation.

### Who frees

| Path | Code | Behavior |
|---|---|---|
| `HDAManager.purge` | `managers/hdas.py:245-257` | With Celery, queues `purge_hda` (`celery/tasks.py:136-141`), which calls `_purge` in a worker. Without Celery, calls `_purge` inline |
| `HDAManager._purge` | `managers/hdas.py:259-279` | Computes `quota_amount(user)` first. Calls `DatasetAssociationManager.purge` (`managers/datasets.py:395-416`), which marks the HDA purged, stops the creating job, purges the `Dataset` if `user_can_purge`, and **commits**. Then it subtracts the amount and commits again. `user` is the history owner, not the requester |
| `HistoryManager.purge` (dev, after #22180) | `managers/histories.py:301-329` | With Celery, queues one `purge_history_datasets` task (`celery/tasks.py:157-217`) and marks the history purged right away. The task bulk-updates the history's HDAs to `deleted/purged`, commits, then **recalculates** the owner's usage from scratch (`calculate_and_set_disk_usage`) instead of subtracting, and finally purges the dataset files. Without Celery, it loops `hda_manager.purge` per HDA |
| `HistoryManager.purge` (`release_25.1`) | same method | Loops `hda_manager.purge` per HDA (one `purge_hda` task each with Celery), then marks the history purged |
| Storage Dashboard, datasets | `HDAStorageCleanerManager.cleanup_items`, `managers/hdas.py:464-490` | Per HDA: `get_owned`, `quota_amount`, `purge_usage_from_quota`, `purged = True`. Then one commit, and the files are removed by `purge_datasets` (`managers/datasets.py:97-112`, a Celery task when enabled), which only removes datasets that no HDA still holds |
| Storage Dashboard, histories | `HistoryStorageCleanerManager.cleanup_items`, `managers/histories.py:712-730` | `HistoryManager.purge` per history. It reads `history.disk_size` *after* the purge to report the bytes freed (`research_issues/history-cleaner-reports-zero-freed-bytes.md`) |
| Legacy controller | `webapps/galaxy/controllers/history.py:222-240` (`purge_deleted_datasets`) | `purge_usage_from_quota` and `purged = True` in one commit per HDA |
| `finish()` / `__update_output` on an output purged while its job ran | `jobs/__init__.py:2493-2496`, `:2995-3001` | `full_delete()` removes the file. Nothing is subtracted, because nothing was charged |
| `cleanup_datasets.py --purge_datasets -r` | `scripts/cleanup_datasets/cleanup_datasets.py:619-667` | Subtracts the full size from each holder, but the call omits the required label (`research_issues/cleanup-datasets-adjust-usage-missing-label.md`) |
| `pgcleanup.py` purge actions | `scripts/cleanup_datasets/pgcleanup.py:395-431` | Doesn't subtract. Actions mixing in `RequiresDiskUsageRecalculation` collect affected user ids and run the recalculation statements for each one afterwards |

### Recalculation

`calculate_user_disk_usage_statements(user_id, quota_source_map, for_sqlite)` (`model/__init__.py:737-806`) is a standalone function so that `pgcleanup.py` can reuse it. It returns a list of `(sql, params)`:

1. **Default source:** `UPDATE galaxy_user SET disk_usage = (<UNIQUE_DATASET_USER_USAGE>) WHERE id = :id`. The template (`:713-734`) sums `COALESCE(total_size, file_size, 0)` over distinct `dataset_id`s of non-purged HDAs in the user's non-purged histories. It excludes datasets with an LDDA (`LEFT JOIN ... IS NULL`) and BYOS ids. The default-source condition is `object_store_id IS NULL` (when default quota is enabled) or `object_store_id NOT IN :exclude_object_store_ids`.
2. **Each labelled source:** the same scan restricted to `object_store_id IN :include_object_store_ids`, written as an overwrite. Postgres uses `ON CONFLICT ... DO UPDATE SET disk_usage = excluded.disk_usage`. SQLite uses `INSERT OR REPLACE` against the old row.
3. **Cleanup:** `DELETE FROM user_quota_source_usage` for labels no longer configured.

At this SHA both backends **overwrite**. Postgres and SQLite differ only in upsert syntax.

Entry points:

- `User.calculate_and_set_disk_usage(object_store)` → `_calculate_or_set_disk_usage` (`:1233-1262`) runs the statements with expanding binds for plural keys. It expires `disk_usage` after each one and commits once at the end.
- `PUT /api/users/current/recalculate_disk_usage` and the admin `/api/users/{user_id}/recalculate_disk_usage` (`webapps/galaxy/api/users.py:186-224`) → `UsersService.recalculate_disk_usage` (`services/users.py:72-91`). With Celery this is the `recalculate_user_disk_usage` task (`celery/tasks.py:122-133`); without it, a `recalculate_user_disk_usage` control task (`queue_worker/__init__.py:351-359`). The Storage Dashboard "Refresh" uses the first route.
- `purge_history_datasets` (above) and `pgcleanup.py`.
- `scripts/set_user_disk_usage.py`: for one user (`-u` / `-e`) or all users, calls `calculate_and_set_disk_usage` and prints the change. `--dry-run` prints only the default source via `calculate_disk_usage_default_source` (`model/__init__.py:1203-1231`). See `research_issues/set-user-disk-usage-script-global-user.md`.

### Locking and known races at this SHA

- **Lost default-source updates.** The Python read-modify-write means two concurrent writers for one user (two job handlers finishing jobs, or a handler and a Celery `purge_hda`) can drop one adjustment. Labelled sources don't lose updates because their upsert increments in SQL.
- **`_purge` commits twice.** `purged=True` commits before the decrease. A recalculation that runs between the two commits already excludes the dataset, and the later decrease then subtracts it again, so usage can go negative. This is the #24511 headline bug ([#24291](https://github.com/galaxyproject/galaxy/issues/24291)).
- **History purge ordering (`release_25.1`).** With Celery, the history is marked purged before its `purge_hda` tasks run. A recalculation in between skips the whole history, and each task then subtracts again. On `dev`, #22180's batch task avoids this double count by recalculating instead of subtracting. It still marks the history purged in the request before the task marks the HDAs.
- **Recalculation overwrites concurrent adjustments.** Under Postgres READ COMMITTED, the scan reads one snapshot and the `UPDATE` then writes it. An adjustment that commits after the snapshot but before the `UPDATE` is overwritten. A recalculation is a single transaction across all its statements, so it holds the `galaxy_user` row lock, then each label row lock, until its final commit.
- **Purging a running output.** `quota_amount` doesn't check state, so purging an output of a running job subtracts its partial size. That size was never charged, because `finish()` skips purged outputs.
- **Lock order.** A recalculation locks `galaxy_user` first, then the label rows. A transaction that adjusts both a labelled source and the default source, such as the Storage Dashboard dataset cleaner over mixed sources or the login adoption, locks the label row at the immediate upsert and `galaxy_user` only at the later flush. That is the opposite order, so it can deadlock with a recalculation.

The standing remedy is a recalculation, which the dashboard exposes as "Refresh".

## Proposed by #24511 (open, `[25.1]`)

Described from the PR diff at head `46102a0d363`. This is **not** on `dev`. Refresh this section against the merged code and its forward-merge, where `HistoryManager.purge` will have to reconcile with #22180's batch task. The jmchilton review branch `pr_24511_review_0` adds further changes, listed in `vault/repositories/galaxy/reviews/active/24511/review_0_branch_details.md`.

### One charging rule, set-based

- `Dataset.uncharged_states = (NEW, UPLOAD, QUEUED, RUNNING, PAUSED)`: outputs of jobs that haven't finished. Unlike `non_ready_states` (`model/__init__.py:4855`), it excludes `SETTING_METADATA`, which also applies to already-charged datasets whose metadata is being regenerated. `quota_amount` returns 0 for these states, `HDAManager.copy` skips `set_size()` for them, and the purge paths skip them.
- `dataset_holders(session, datasets, exclude=(), user=None) -> {Dataset: set[user_id]}` (module function): one query per 1000 datasets over `HDA ⋈ History` for non-purged HDAs with a user. It prefers objects already loaded in the identity map and also scans `session.new`, because the session doesn't autoflush and callers are still building HDAs.
- `datasets_in_libraries(session, datasets)`: the LDDA check, also chunked, and it also sees unflushed LDDAs.
- `User.sole_dataset_sizes(hdas) -> {Dataset: int}`: for the non-purged HDAs whose datasets are not purged and not in `uncharged_states`, it returns the datasets for which `dataset_holders(..., exclude=hdas, user=self)` finds no other holder and that are not in a library, with sizes from `total_size`, or from `set_total_size()` if unset (no commit). This one function answers both "what does adding these HDAs charge" and "what does purging them free".
- `User.adjust_disk_usage_for_datasets(sizes, sign=1, preserve_update_time=False)`: groups by `quota_source_info.label`, drops `use=False` sources, and calls `adjust_total_disk_usage` once per label.
- `History.charge_added_datasets(hdas)`: `user.adjust_disk_usage_for_datasets(user.sole_dataset_sizes(added))` for HDAs that belong to this history.

### New chargers

- `finish()` keeps the `set_total_size()` / `full_delete()` loop and calls `_charge_outputs(datasets)` (new on `MinimalJobWrapper`). That charges **every user holding** each non-purged output, found with `dataset_holders`, locking users in ascending id order. `fail()` charges outputs whose `total_size` was still `None` before it refreshed them, so "no total size yet" becomes the "not charged yet" marker. Details: [[Component - Job Completion Lifecycle#Proposed by #24511 (open, `[25.1]`, not on `dev`)]].
- `HDAManager.copy` charges the copy when the source belongs to another user. `DatasetCollectionManager.copy` with `copy_elements`, `History.copy` (now including collection elements), workflow inputs copied in `workflow/run_request.py`, and early (`tools/actions`) and late (job wrapper) cache hits (`job.output_hdas()`) all call `charge_added_datasets`.
- `ObjectImportTracker.charge_imported_datasets(history)` runs after `import_model_store`, `create_objects_from_store`, and the legacy `JobImportHistoryArchiveWrapper`.
- Login charges the anonymous history once (`charge_history = history.user is None`) after assigning `history.user`, through `charge_added_datasets`, so `use=False` sources and duplicate copies no longer count.
- `add_dataset(quota=True)` and `quota_amount()` remain for the callers listed above. History copies now pass `quota=False` and charge in bulk.

### New freeing path: `HDAManager.mark_purged`

`mark_purged(user, hdas, preserve_owner_update_time)` drops already-purged and uncharged HDAs, subtracts `user.sole_dataset_sizes(hdas)`, sets `deleted/purged` on the HDAs, and commits, all in **one transaction**. A recalculation therefore sees the purge and the decrease together or not at all.

- `_purge` checks `error_unless_dataset_purge_allowed()` first, then calls `mark_purged`, then the existing file removal.
- `HistoryManager.purge` (PR version, written against `release_25.1`) loads the history's unpurged HDAs and calls `mark_purged` on all of them before purging any files or the history. That moves the usage decrease from Celery into the request. The `dev` forward-merge has to fit this into #22180's batch task, which currently recalculates instead.
- The Storage Dashboard dataset cleaner loads the selected HDAs in one query, checks `error_unless_owner`, subtracts `sole_dataset_sizes` once, and reports that sum as `total_free_bytes`. The history cleaner reads `disk_size` before purging.

### Write mechanics and recalculation

- **Pending SQL-expression writes.** For a persisted user on the normal default-source path, `adjust_total_disk_usage` now sets `self.disk_usage = func.coalesce(User.disk_usage, 0) + self._pending_disk_usage_delta`, a `ClauseElement`. Further adjustments before the flush add to the same delta, so they still cost one `UPDATE`, and the database applies it atomically. `_has_pending_disk_usage_adjustment` detects the pending state, and `get_disk_usage()` flushes before reading. `dictify_usage` now goes through `get_disk_usage()`. Code that reads `user.disk_usage` directly can see an expression object instead of a number. A transient user still gets a plain Python sum. The `preserve_update_time` path adds `COALESCE` and expires the attribute unless an adjustment is pending.
- **Lock order.** Before a labelled upsert on Postgres, it takes `SELECT ... FROM galaxy_user ... FOR UPDATE`, so it locks the user row and then the label row, in the same order as a recalculation and a same-transaction default adjustment.
- **Postgres difference-apply.** The recalculation's default statement becomes `SET disk_usage = COALESCE(disk_usage, 0) + ((<scan>) - (SELECT snapshot.disk_usage ...))`, and the labelled upsert does the same against `user_quota_source_usage`. The scan and the snapshot subselect come from the same statement snapshot. If a concurrent adjustment commits meanwhile, the `UPDATE` waits on the row and then applies the difference on top of the adjusted value, so the adjustment is kept and no lock is held during the scan. **SQLite keeps the overwrite.** This is correct only if every writer uses an atomic increment, so a direct assignment to `disk_usage` anywhere (including the relabel and script paths above) would leave drift in place.

### What the PR leaves alone

It doesn't repair usage that is already wrong. The PR body tells admins to run `scripts/set_user_disk_usage.py` and users to press Refresh. It also changes quota policy on a release branch, because copies of others' data, cache hits and imports now count right away. The risk and performance discussion is in `vault/repositories/galaxy/reviews/active/24511/` (`risks.md`, `performance_challenges_review.md`). Follow-up refactors (caller-owned commit in `mark_purged`, folding `quota_amount` into `sole_dataset_sizes`) are drafted there in `followup_refactor_issue.md`.

## Tests

| File | Covers at this SHA |
|---|---|
| `test/unit/data/test_quota.py` | `TestPurgeUsage`, `TestCalculateUsage` (default, BYOS `:121`, readjusting incorrect values `:135`, disabled and alternate sources, removal of unused labels, relabel in both directions `:317`, `:337`), `TestQuota`, `TestQuotaObjectStore`, `TestUsage` |
| `test/integration/test_recalculate_user_disk_usage.py` | The `RecalculateDiskUsage` mixin over plain, hierarchical, and no-Celery hierarchical object stores |
| `test/integration/test_scripts.py:111` | `set_user_disk_usage.py` smoke test |
| `test/integration/objectstore/test_changing_objectstore.py`, `test_bulk_storage_operations.py` | Usage across object store changes and storage moves |

#24511 adds integration classes for failed jobs, copied running outputs, anonymous login, cached jobs and copies, extends `test_storage_cleaner.py`, and adds Postgres concurrency tests in `test/unit/data/model/db/test_misc.py`.

## Research issues found

- `vault/agents/gx_research/research_issues/finish-purged-output-resets-collected-bytes.md` (existing): `finish()` drops earlier outputs' bytes when one is purged.
- `vault/agents/gx_research/research_issues/history-cleaner-reports-zero-freed-bytes.md`: the history cleaner reads `disk_size` after the purge.
- `vault/agents/gx_research/research_issues/cleanup-datasets-adjust-usage-missing-label.md`: the legacy cleanup script's usage adjustment raises `TypeError`.
- `vault/agents/gx_research/research_issues/set-user-disk-usage-script-global-user.md`: `quotacheck` reads a module-level `user`, and `--dry-run` reports only the default source.

## Related

- [[Component - Job Completion Lifecycle]]: `finish()`'s disk accounting step, its transaction, and #24511's `_charge_outputs`.
- [[Component - Private Object Stores]]: BYOS quota exemption and `QuotaSourceMap` for user stores.
- [[Component - Jobs API and Job Cache]]: the job cache paths whose outputs share datasets and skip `finish()`.
- Review records: `vault/repositories/galaxy/reviews/active/24511/`.
