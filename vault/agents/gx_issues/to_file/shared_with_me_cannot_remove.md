# Regression: can't remove a history someone shared with you

Found by the 26.2 FAQ hardening loop (GTN `faqs/galaxy/histories_unsharing_histories.md`), Galaxy 26.2rc1.

Frame as a regression / missing feature. Keep it low key: not a security report.

## Behavior

A user who has a history shared with them can't remove it from their "Shared with me" view. The
shared-history card only offers **View**, so the history stays until the owner changes the sharing.
You shouldn't have to keep things in that view that you don't want there.

## Regression

The legacy "Histories shared with you by others" grid (`HistoryController.list_shared`) had View,
Copy and **Unshare**. Unshare deleted the current user's own `HistoryUserShareAssociation` (no owner
involvement). It was restored in 2017 (`5de92dfbf46` "Restore basic copy and unshare operations").
When the list moved to the Vue history cards, Unshare wasn't carried over, and the grid code was
then removed as unused in `06874b7bb40` "Remove unused legacy history grids" (2024-02-07).

Today, only the owner can change the share list (`SharableModelManager.update_current_sharing_with_users`
in `lib/galaxy/managers/sharable.py`). There's no API for a recipient to drop their own association.

Workflows shared with you (`is:shared_with_me` in the workflow list) have no remove action either;
pages and visualizations share the same sharing model, so they're probably the same.

## Suggested fix

- API: let the current user drop their own share association for an item shared with them, such as
  `DELETE /api/histories/{id}/sharing/me` (name open), in the sharable service, so every sharable
  type gets it.
- UI: a "Remove from shared with me" action on shared history cards (and shared workflow cards).
- Test: API test for the recipient removing their share, then an E2E for the card action (the
  galaxy_ui_driver branch has shared-history helpers from `test_import_shared_history`).

Then GTN's `histories_unsharing_histories.md` can document the recipient-side action again.
