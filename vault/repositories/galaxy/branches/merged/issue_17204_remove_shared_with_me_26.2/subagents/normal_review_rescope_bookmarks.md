# Normal review: recipient bookmark cleanup (rescope phase 1)

Verdict approve, no bugs. Acted on: `super().unshare_with` runs first (no bookmark deletes queued when there's no share); owner/recipient tests now share with two recipients plus an owner bookmark and assert only the unshared recipient's bookmark goes; renamed `_share_with(user_ids)` param to `users` (callers pass emails). Red check against base `workflows.py`: both bookmark tests fail at the "not in bookmarked" assertion.

Not acted on:
- Return type on the override: base `unshare_with` has none.
- `order_index` gaps after direct delete: harmless (no `order_by`, `set_workflow_menu` doesn't set it).

<details><summary>Full review</summary>

- `flush=False` batching works with `update_current_sharing_with_users`; explicit `select` (not `user.stored_workflow_menu_entries`) also catches deleted workflows that the relationship's primaryjoin hides.
- Owner's and other recipients' bookmarks untouched (`user_id` filter).
- Only callers of `unshare_with`: `unshare_with_me`, `update_current_sharing_with_users` (also via `users_shared_with` deserializer). Unpublish/link access don't touch user shares. Workflow delete/undelete keeps both share and bookmark, consistent.
- Workflow-only override fine; no other sharable type has per-recipient state.
- One pre-existing security note sent to a private report, not about this commit.
</details>
