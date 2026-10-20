# Initial review: #24280 (default profile)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5, low effort
- Reviewed commit: `ff83754163b26e9c19fd6d2d2fb241b69e4adf4a` (diff vs `origin/release_25.1`, merge-base `6cc95b16284`)

## Summary

Small, well-targeted fix. `_set_object_store_ids_full` now runs stored history/user `preferred_object_store_id` values through `validate_selected_object_store_id` (the same check used when the preference is saved, and the one #24214 added for request-level ids) and ignores stale ones with a warning, falling history -> user -> weighted default. Destination, request and invocation ids stay untouched; the PR says so explicitly. The fix reuses the existing validator and doesn't add a new one. The sample docs fix a real inaccuracy: weight 0 doesn't block writes when `allow_selection` is on. They also document how to retire a selectable backend.

Checked:
- No other server-side reader of `history.preferred_object_store_id` / `user.preferred_object_store_id` routes outputs. Every other hit is a setter, serializer, or request-level id, so the job wrapper is the right single choke point. Uploads go through the same path, and the test covers that.
- The client's tool form defaults `preferredObjectStoreId` to `null` (`client/src/components/Tool/ToolForm.vue:211`). It doesn't echo the stale history preference back as a request-level id, so #24214's request validation won't start returning 400s for affected users.
- `user://` preferences are validated against `job.user.object_stores`. That is correct even when the job user differs from the history owner.
- The new test follows the file's existing pattern: it resets at the end with no `try/finally`, same as its siblings. It covers user-stale, history-stale, and history-stale -> valid-user fallback. Writing to the DB directly is justified because the API rejects the stale ids.
- CI: the only failure is the Selenium `test_histories_list.py::TestSavedHistories::test_permanently_delete_history`, which is unrelated.
- The SQL in the docs uses the right table names (`galaxy_user`, `history`).

The behavior change for a retired scratch/private preference is called out explicitly in the PR description, so it isn't raised as a finding here. Retiring such a preference now sends data to the weighted default, which can mean a different quota, privacy and expiry.

## Findings

### P3 1: Per-job warning may flood logs after a backend is retired

`_validated_stored_preferred_object_store_id` logs at `warning` on every job whose history or user preference is stale (`lib/galaxy/jobs/__init__.py`, new helper). The stale id is never rewritten (the PR notes the job handler doesn't write to users or histories). So after an admin retires a popular selectable backend, every job from every affected user logs a warning until each user re-saves. A user with both a stale history and a stale user preference logs two per job. On a large server that is a lot of repeated, non-actionable noise. Consider `log.info`/`debug`, or a once-per-id warning. Optional; the warning is useful when diagnosing exactly the issue in #23868.

### P3 2: Narrow the new helper's signature

The new helper leaves `user` untyped, and `owner_type: str` only ever takes `"history"` or `"user"`. `user: Optional[User]` and `owner_type: Literal["history", "user"]` would document the contract at no cost. This is a nit; the PR already tightens `User.preferred_object_store_id` to `Mapped[Optional[str]]` in the same spirit.

## Notes (non-actionable)

- The PR targets `release_25.1` but carries milestone `27.0`. That is probably just metadata.
- The trailing-whitespace cleanup in both sample config files adds some diff noise to a backport, but it's harmless.
