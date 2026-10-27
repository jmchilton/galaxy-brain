# Normal review (initial implementation)

Verdict approve with nits; no bugs, no security findings. Acted on: added the workflow "not confirmed" vitest case.

Not acted on:
- Options object for `useWorkflowCardActions` (7 positional params) / `useHistoryCardActions`: only two callers each; follow-up, not on a release branch.
- Shared client `unshareWithMe(type, id)` helper: typed `GalaxyApi()` per-type path params make it awkward; three call sites stay inline.
- `sharedWithMeView && shared.value` guard: view flag is authoritative; server rejects non-recipients anyway.
- `localize()` on interpolated strings: matches existing pattern in `useHistoryCardActions.ts`.
- Viz grid has no confirm: matches grid convention (viz Delete doesn't confirm).
- 404 message shows model class name (`StoredWorkflow not found`): matches `by_id`.
- Recipient's workflow bookmark (`StoredWorkflowMenuEntry`) left behind: owner-side unshare does the same today, no divergence; candidate follow-up (override `unshare_with` in workflow manager).

<details><summary>Full review</summary>

- Auth: `trans.anonymous` checked before `get_share_assocs`, so it never runs with `user=None` (which would return all assocs). Missing item and not-shared item both 404 with identical message. Owner/stranger/anon -> 404/404/403, all tested.
- Selenium selectors match GCard ids (`g-card-extra-actions-history-<id>`, `g-card-action-unshare-with-me-history-<id>`); `api_get` uses browser cookies so the 403 assertion runs as the recipient.
- schema.ts diff additions only, four routes.
- Placement in `ShareableService` matches siblings; reuses `manager.unshare_with` (one duplicate assoc query, not worth changing).
- Route `PUT .../unshare_with_me` consistent with `share_with_users`/`unpublish`/`disable_link_access`; 204 rather than `SharingStatus` so recipients don't see other recipients.
- Pages: API only, no shared-with-me pages UI exists; call out in PR.
- Release target: `release_26.2` is at rc1; feature-shaped (4 routes + schema). Frame as restoring functionality lost with legacy grid; dev is fallback.
- Tests strong: mixin runs for all 4 types, exact `users_shared_with` equality, recipient GET 403 after, repeat 404; no assertion passes without the behavior.
</details>
