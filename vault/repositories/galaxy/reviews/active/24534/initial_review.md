# Initial review: galaxyproject/galaxy#24534

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5, effort low
- Reviewed commit: `1bf150cceb0` (base `origin/dev`)
- Tests not run locally (read-only static review).

## Verdict

Small, correct, well-motivated fix. `LibraryDataset.expired_datasets` is the right existing abstraction for "other versions", the `ld.dataset` `AttributeError` and the swallowed exception are real latent bugs, and the commit-before-`full_delete()` ordering matches the legacy script. No blockers. Findings are about test reach and one cross-PR ordering hazard.

## Findings

### P2 1: No test reaches the `full_delete()` branch the PR rewrote

Both new tests create content via `type="from_hda"`, so the dataset is shared with a live HDA in `self.history`; `no_history_assoc` is false and `dataset.full_delete()` never runs. In `test_purge_library_item_retires_all_versions` the expired version also shares the same dataset, so `no_library_assoc` is false too. The two code changes inside that branch (dropping `trans.sa_session.add(ld.dataset)`, replacing `except: pass` with `log.exception`) are therefore unexercised, and nothing asserts that a purge of an unshared library dataset actually purges its `dataset`.

Suggested fix: in the current-version test, also assert `ldda.dataset.purged is False` (shared case), and add a case where the source HDA is purged first (or content is uploaded directly into the library) and assert `ldda.dataset.purged is True` after the library purge. This pins the "only purge when unreferenced" rule the PR description emphasizes.

### P3 1: New inconsistent state if a purged entry is undeleted before #24516 lands

`DELETE /api/libraries/datasets/{id}?undelete=true` (`lib/galaxy/webapps/galaxy/api/library_datasets.py::delete`) still sets `library_dataset.deleted = False` without checking `purged`; #24516 (open) is what refuses that. The new code comment "A purged library dataset can never be undeleted" is only true once #24516 merges. Until then, an undeleted purged entry now points at a `deleted` current LDDA, so once any sharing HDA is purged, `pgcleanup` can reclaim the dataset behind a visible library entry (previously the live LDDA vetoed it). The PR says the three PRs can merge in any order; this one is safer merged after (or with) #24516.

Suggested fix: note the ordering dependency in the PR, or reword the comment to describe intent ("purge is irreversible") rather than a guarantee this PR does not enforce.

### P3 2: First API test to reach into the embedded app's DB session

`_galaxy_app` / `_db_session` / `_add_version` are, as far as `lib/galaxy_test/api` goes, new: the only other `driver_or_skip_test_if_remote()` use (`test_tools.py`) runs a tool test, not ORM access. DB-level assertions and fixture rows inserted through the session have established homes in `test/integration` (`self._app.model.session`, the `sa_session` property pattern in `test_job_cache.py`, `test_job_files.py`, etc.), which never silently skip. Since neither `ld.purged` nor `ldda.deleted` is observable through the API after a purge, consider moving these two tests to an integration test that reuses that pattern instead of growing per-file helpers in an API test module (and the `from galaxy import model` import with it).

## Notes (not findings)

- `Dataset.user_can_purge` / `active_library_associations` could replace the inline `no_history_assoc`/`no_library_assoc` predicate, but the PR explicitly leaves that untouched; not re-litigated.
- `ld.expired_datasets` is a `viewonly` relationship; iterating and mutating its members is fine, and they are added via `add_all`.
- Imports in the service are module-level; `log` already exists there.
