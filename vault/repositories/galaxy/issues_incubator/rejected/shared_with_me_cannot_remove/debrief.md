# Debrief: shared_with_me_cannot_remove

- Source: `shared_with_me_cannot_remove.md` (26.2 FAQ hardening loop, GTN `histories_unsharing_histories.md`).
- Verified on `origin/dev`: commits `5de92dfbf46` and `06874b7bb40` exist with the cited subjects. `sharable.py` has only owner-side `unshare_with` and `update_current_sharing_with_users`, with no recipient endpoint.
- Duplicate search (`gh issue list --search "shared with me remove"`, `"unshare history shared with me"`) found open #17204 with the same complaint and the same FAQ. Related but broader: #1826 and #7479.
- Result: rejected as a duplicate, with no proposal written, so there was no subagent review (that step applies only to proposals). See the Rejection section.

## Rejection

Duplicate of open [#17204](https://github.com/galaxyproject/galaxy/issues/17204) "Bug: Copy and Unshare functions on Histories Shared with Me" (`kind/enhancement`, `area/UI-UX`, last activity 2025-05-20).

jennaj reported the same loss in 24.0rc1: the recipient can't unshare, so the "shared with me" listing gets cluttered. She links the same GTN FAQ (`histories_unsharing_histories`) and a help forum thread (https://help.galaxyproject.org/t/unsharing-shared-histories/15105). Labeled enhancement, not a release blocker.

### What the draft adds over #17204

- Regression history: the legacy grid's Unshare (`5de92dfbf46`, 2017) dropped a recipient's own `HistoryUserShareAssociation`; the grid was removed in `06874b7bb40` (2024-02-07).
- No recipient API today: only the owner path, `SharableModelManager.update_current_sharing_with_users` / `unshare_with` (`lib/galaxy/managers/sharable.py:204,263` on `origin/dev`).
- Scope: workflows (and probably pages/visualizations) shared with you have no remove action either.
- Fix sketch: a recipient-side endpoint in the sharable service (e.g. `DELETE /api/histories/{id}/sharing/me`, name open), a card action, and an API test plus an E2E test.

### Recommendation

Don't file a new issue. Post the points above as a short comment on #17204 if wanted, or fix it PR-first with a link to #17204. Still seen on 26.2rc1.

Commented on #17204 and labeled `release-testing-26.2` on 2026-10-25.
