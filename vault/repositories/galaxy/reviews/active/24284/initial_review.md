# Initial review: galaxy#24284 — default profile

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Opus 5.5 (claude-opus-5-5), medium effort
- Reviewed commit: `7399ba875a9ac05778d177b36b39eabf30cbb9c1` (diffed against `origin/release_25.1`)
- Commits: `2f56e05acff` (cherry-pick of ef18e12c195, plus new integration tests), `7399ba875a9` (query reduction for #24233)

## Summary

Small, well-scoped backport. The `discover.py` one-liner matches what dev/26.2 already ship. The second commit is correct as far as I can trace it:

- Precreated outputs are exported `for_edit` with a raw `id` and land in `hdas_by_id`. Sessionless-discovered HDAs get a `temp_id` `encoded_id` and land in `hdas_by_key`. So dropping `hdas_by_id` skips exactly the precreated outputs, which matches directory mode (it only applies defaults to discovered primaries in `finalize_storage`/`_populate_elements`).
- `inspect(hda).identity[0]` avoids refreshing each expired HDA just to read its id. That is the point of the change, and every tracked HDA is persistent after the import's commit.
- The eager load (`joinedload(dataset).selectinload(actions)`) gives `set_default_hda_permissions` its `dataset.actions` check without lazy loads.

Ruff passes on the touched files, and CI showed no failing checks when reviewed. Extended-metadata coverage for commit 2 comes from the `test_extended_metadata.py` tests added in #24233 (fetched list, discovered datasets, dynamic list of pairs), which already run under private defaults.

## Findings

### P3 1: Unconditional SELECT when a job discovers nothing

`discovered_hda_ids` is empty for most extended-metadata jobs, which have only precreated outputs. `select(...).where(id.in_([]))` still runs a round trip (SQLAlchemy renders an empty-set expression; it does not short-circuit). The old code issued no discovered-dataset queries in that case. Since the commit is about cutting queries at job finish, guard it:

```python
if discovered_hda_ids := [inspect(hda).identity[0] for hda in object_import_tracker.hdas_by_key.values()]:
    ...
```

`lib/galaxy/jobs/__init__.py` ~L2173.

### P3 2: Permission-assertion helper and tests copied verbatim across integration files

The new `TestPrivateDefaultPermissionsIntegration` tests and `_assert_history_datasets_private` in `test/integration/test_default_permissions.py` are a line-for-line copy of the ones #24233 added to `test/integration/test_extended_metadata.py` (`test_fetched_list_elements_get_default_permissions`, `test_dynamic_collection_elements_get_default_permissions`, same helper body). The cherry-picked API test also re-implements the same "fetch `datasets/{id}` and compare `permissions`" loop.

Suggested fix: move the helper onto `DatasetPopulator`, next to `make_private` / `make_dataset_public_raw` / `user_private_role_id`. For example, `assert_history_datasets_have_permissions(history_id, expected_count, access_private: bool)` or a `get_dataset_permissions(dataset_id)` accessor. Then have both integration files and the API test call it. Optional on a release branch; it keeps forward-merges from carrying two copies.

## Non-findings / notes

- The dedupe `{hda.dataset: hda ...}` ("Copied HDAs share a Dataset") is functionally redundant. `DatasetPermissions.__init__` assigns `self.dataset = dataset`, and `back_populates="actions"` appends to the eagerly loaded `dataset.actions`, so the second HDA sharing a dataset already hits the early return. The PR description calls the once-per-dataset visit out deliberately, and it does save the redundant `actions` check, so I'm not filing it.
- The first commit is labelled a cherry-pick but also adds the `test_default_permissions.py` integration tests. Upstream ef18e12c195 only touched `discover.py` and the API test. The PR description explains this; fine.
- Forward-merge note in the PR description (take theirs on 26.2/dev for the API assertion and `typing` import) is consistent with what I see. dev still has the #24233 two-list loop, so commit 2 will carry forward cleanly.
- No security-sensitive findings. The change narrows the set of HDAs touched, and the trace above shows the skipped set is exactly the precreated outputs, which already carry permissions from job creation. Directory mode never applied defaults to those either.
