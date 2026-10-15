# Release draft handoff — 2026-10-14

John requested a rebase onto `release_26.2` and a draft PR, after trimming the title to one and checking the human-read checklist.

Fetched upstream `release_26.2` and fork head. Release base is `8b729ff0050c32573ad0fa999e5e1b4d015dca8c`, identical to the prior base. `git rebase origin/release_26.2` reports up to date, with no conflicts or rewritten commits. Head remains `b0a8d368d607d2d86300a28d0c9f284516750abf`, already on the fork; no force-push needed. Worktree clean; diff check passes. Prior filter validation applies unchanged.

Opened draft [#24120](https://github.com/galaxyproject/galaxy/pull/24120) against `release_26.2`, using the remaining title and current user-edited description. Test instructions now name the release base. No mentions added. Fork CI remains six queued/two skipped at the unchanged head, without failures; PR CI pending. Keep draft as explicitly requested.

Updated record and queue to `ci_wait`. Tracking updates committed locally; vault push remains deferred to avoid publishing the unrelated unpublished backlog.
