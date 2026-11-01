# Initial implementation debrief: issue_24532_user_deletion_refusal_25.1

Fixes #24532. A self-deletion refused by `allow_user_deletion: false` now shows the component's "User deletion must be configured…" message instead of the generic error. Base `release_25.1`.

```
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/issue_24532_user_deletion_refusal_25.1/differential-review/snapshots/20261101T143013Z-implementation-f2f80d3736d5.json
  implementation @ f2f80d3736d5 vs origin/release_25.1 (merge-base 32317280ecb5)
  first snapshot: 3 commits, 2 files, 3 hunks
```

## Commits

1. `0b0cd6bb422` Baseline tests. Adds a 403/403005 failure test (generic message, no logout) plus the `mockDelete403`/`submitDeletion` helpers. It passes on unmodified 25.1.
2. `d952c47a769` Fix. Compares `err_code` with `CONFIG_DOES_NOT_ALLOW` (403004) and assigns the message. On 25.1 the 403 branch was a bare string expression, so it never set the message even when it matched. Adds a 403004 test, which was red before the fix ("An error occurred while deleting the user.").
3. `f2f80d3736d` Review follow-up. Drops a shared `@/api/errorCodes.ts` module and the `JobProvider.js` swap to it. The constant is now local to `UserDeletion.vue`, as `pages.ts` does with `USER_SLUG_DUPLICATE` on dev. This was a separate commit because a force-push was denied; it could be squashed into commit 2 while polishing.

## Decisions

- **Base `release_25.1`.** 25.1 (released 2025-12-12) has the bug, and the fix is a few lines.
- **Local constant.** The shared module only had one other caller, `JobProvider.js`, and that check moved to `composables/jobDetails.ts` on 26.2/dev, so the change would conflict when merged forward.
- **The UI still shows the component's sentence, not the server's `err_msg`.** The server message is worded for admins (per the issue's alternatives).

## Verification

- `jest src/components/User/UserDeletion.test.ts`: 7/7 pass. The 403004 test fails without the fix, and the baseline 403005 test passes without it.
- `vue-tsc --noEmit` is clean, and eslint and prettier are clean on the touched files.
- Client deps came from `yarn.lock` (25.1 has no pnpm lockfile). Playwright browsers can't install on this host (ubuntu 26.04), so there was no E2E run.

## Review

[subagents/normal_review_1.md](subagents/normal_review_1.md). Merge-forward guidance is recorded in [index.md](index.md).
