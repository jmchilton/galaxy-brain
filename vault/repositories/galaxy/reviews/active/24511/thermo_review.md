# Thermo review — PR #24511

- Profile: thermo_review
- Model: Claude Opus 5.5, effort low (coordinator-set)
- Reviewed commit: 46102a0d363 (base origin/release_25.1)

Verdict: correct direction (one set-based "sole holder" rule, DB-side increments), but on a release branch it lands as a second accounting rule beside the old one, wired into ~9 call sites by hand. Bug-fix scope is already large (~800 lines); collapse structural cleanup into a follow-up — see [thermo_followup_refactor_issue.md](thermo_followup_refactor_issue.md).

### P2 1: Two quota rules now coexist; legacy paths keep the old per-HDA rule

`User.sole_dataset_sizes()` + `dataset_holders()` is the new rule, yet `HDA.quota_amount()` / `purge_usage_from_quota()` survive and still drive `History.add_dataset(quota=True)` (`lib/galaxy/model/__init__.py:3826-3829`) and the legacy `purge_deleted_datasets` controller (`lib/galaxy/webapps/galaxy/controllers/history.py:234`), which purges without `mark_purged()` (no library check via `datasets_in_libraries`, no batched transaction). The PR patched `quota_amount()` for `uncharged_states` to keep the two in sync, which is the drift risk in action. Minimum for this PR: route `purge_deleted_datasets` through `hda_manager.mark_purged()` and make `quota_amount()` delegate to `sole_dataset_sizes([self])`; full removal goes in the follow-up.

### P2 2: Charging is opt-in per call site rather than at the addition choke point

`charge_added_datasets()` is called manually after `stage_addition`/copy in hdas.py, collections.py, run_request.py, actions/__init__.py, jobs/__init__.py, model_stores.py (x2), imp_exp, webapp, `History.copy`. Other `stage_addition` callers (e.g. `controllers/dataset.py:755` copy, `model/__init__.py:6797`, `dereference.py`) are uncharged, and the next copy path will be too — the same class of bug this PR is fixing. A natural home is `History.add_pending_items()` (which already flushes staged additions) or `stage_addition` itself, charging the staged HDAs in one `sole_dataset_sizes` call. Too big for 25.1; part of follow-up (single finding with P2 1 if the verifier prefers).

### P3 1: Mark-purged-and-refund logic duplicated in HDAStorageCleanerManager

`HDAStorageCleanerManager.cleanup` (hdas.py ~482-490) re-implements `HDAManager.mark_purged` (sole sizes, adjust -1, set deleted/purged, commit). Call `self.hda_manager.mark_purged(user, hdas_to_purge)`; have `mark_purged` return the freed sizes for `total_free_bytes`. Small, fits this PR.

### P3 2: History purge loads, commits, then re-queries the same HDAs

`HistoryManager.purge` selects HDAs, calls `mark_purged` (commits, expiring them), then re-selects by id purely to un-expire. Smell from `mark_purged` owning the commit; letting the caller own the transaction (or `mark_purged(..., commit=False)`) removes the reload.

### P3 3: Third ad-hoc state tuple on Dataset

`Dataset.uncharged_states` sits next to `non_ready_states`/`ready_states` and differs subtly (adds PAUSED, drops SETTING_METADATA); comment explains it but the filter `hda.dataset.state not in uncharged_states` is repeated in 5 places (hdas.copy, mark_purged, sole_dataset_sizes, quota_amount, jobs.fail via total_size None). A `Dataset.is_charged` property would name the rule once.

### Note (not a finding): `User._pending_disk_usage_delta`

Class-level non-mapped attribute plus `isinstance(__dict__["disk_usage"], ClauseElement)` sniffing is clever and fragile ORM plumbing; acceptable for the fix but worth isolating in the follow-up (e.g. always use explicit `update()` statements like the `preserve_update_time` branch).
