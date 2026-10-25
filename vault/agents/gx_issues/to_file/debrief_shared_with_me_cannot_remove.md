# Debrief: shared_with_me_cannot_remove

- Source: `shared_with_me_cannot_remove.md` (26.2 FAQ hardening loop, GTN `histories_unsharing_histories.md`).
- Verified on `origin/dev`: commits `5de92dfbf46` and `06874b7bb40` exist with the cited subjects. `sharable.py` has only owner-side `unshare_with` and `update_current_sharing_with_users`, with no recipient endpoint.
- Duplicate search (`gh issue list --search "shared with me remove"`, `"unshare history shared with me"`) found open #17204 with the same complaint and the same FAQ. Related but broader: #1826 and #7479.
- Result: rejected as a duplicate, with no proposal written, so there was no subagent review (that step applies only to proposals). See `reject_shared_with_me_cannot_remove.md`.
