**Acted on (coordinator):** Finding 1 and the alternative in finding 3. Commit `f2f80d3736d` drops the `JobProvider.js` swap and the shared `client/src/api/errorCodes.ts`. It keeps `CONFIG_DOES_NOT_ALLOW` local to `UserDeletion.vue`, following the `pages.ts` / `USER_SLUG_DUPLICATE` precedent. Finding 2 is recorded as merge-forward guidance in the branch `index.md`.

Not acted on:
- Finding 2 (code change): a 25.1 test can't target 26.1's GModal. This is guidance for whoever merges forward.
- Finding 4: showing the server's `err_msg` is out of scope. Its wording is aimed at admins (see the issue's alternatives).
- Finding 5: the 403005 test title already says "another 403", which is accurate.

<details><summary>Full review</summary>

Run via Claude Opus 5.5 at low effort.

# Normal review 1: issue_24532_user_deletion_refusal_25.1

**Top-line:** The fix is correct and small. On 25.1, 403004 is the only refusal code a self-deletion from this modal can get, and the new tests pass (7/7 under jest). The one real concern is merge-forward friction. The `JobProvider.js` edit isn't needed for the fix, and it conflicts on release_26.2 and dev, where the console-output code was removed. Separately, the UserDeletion test hunks auto-merge into 26.1+'s vitest/GModal test file without conflict but will not work there. No security issues.

## Verification

- `git diff origin/release_25.1...HEAD`: 2 commits. A baseline commit adds the 403005 test plus the `mockDelete403`/`submitDeletion` helpers. The fix commit adds `client/src/api/errorCodes.ts`, the corrected check plus the missing `deleteError.value =` assignment in `UserDeletion.vue`, the 403004 test, and the `JobProvider.js` constant swap.
- Ran `npx jest --config tests/jest/jest.config.js src/components/User/UserDeletion.test.ts`: 7 passed. npm warned that it ignores `use-node-version`, so the run may have used the default node instead of the pinned one. It passed either way.
- Reading the code confirms the 403004 test fails on the old code (`=== 403` is false, so the modal shows the generic text) and the baseline 403005 test passes before the fix.

### Is 403004 the only refusal err_code? (yes, on 25.1)

- `UserManager.delete` (`lib/galaxy/managers/users.py:156`) raises `ConfigDoesNotAllowException` (403004) when `allow_user_deletion` is false.
- `UsersAPI.delete` (`lib/galaxy/webapps/galaxy/api/users.py:688`) raises `InsufficientPermissionsException` (403005) only when a non-admin deletes another user. The modal always sends `currentUser.id`, so this can't happen from the modal.
- 25.1 has **no** `ensure_account_modification_allowed` on the delete route (the issue describes dev). So the issue's second 403004 source doesn't exist here, and that doesn't change the fix.
- 25.1 also has no `errorResponseMiddleware` setting `err_code` to the HTTP status (no `err_code` handling under `client/src/api/client/`). So on 25.1 the old `=== 403` branch was effectively dead code. On top of that, it never assigned the message. The commit message says this accurately.

## Findings (by severity)

### 1. Medium: the `JobProvider.js` change adds a merge-forward conflict on release_26.2 and dev, for no benefit to the fix

`git merge-tree origin/dev HEAD` (and the same against origin/release_26.2) conflicts in `client/src/components/providers/JobProvider.js`. Commit 30cf87703d3 ("Remove the job details and console output providers") deleted `jobConsoleOutput` there and moved the 403004 check to `client/src/composables/jobDetails.ts:83`, which still uses a literal `403004`. The swap is cosmetic on 25.1. It widens the backport's footprint, and whoever merges forward has to resolve the conflict by taking theirs.

**Recommendation:** Drop the `JobProvider.js` hunk from this branch. That leaves `errorCodes.ts` with one consumer on 25.1, which is fine for a named constant. If sharing is wanted, do it on dev by pointing `composables/jobDetails.ts` at the constant, as a follow-up or during the merge-forward. If you keep the hunk, write "resolve JobProvider.js conflict by taking 26.2/dev" in the handoff notes.

### 2. Medium: the test hunks merge silently into 26.1+, where they won't work

On release_26.1+, `UserDeletion.test.ts` is vitest-based and the component uses `GModal`/`GAlert`. The existing 26.1 success test says "jsdom doesn't support `<dialog>.close()`, so emit 'ok' directly on GModal". `git merge-tree origin/release_26.1 HEAD` auto-merges the test file **without a conflict**. The new tests then depend on `.btn-danger` click → `@ok`, which 26.1 doesn't support, and likely on `.alert-danger` from GAlert. Expect them to fail in CI after the merge-forward rather than pass vacuously, since `wrapper.find(...).text()` throws on a missing element. The `UserDeletion.vue` hunk does conflict on 26.1+ (the 26.1 version already assigns the message, only the `=== 403` line differs), so the merger will see that one.

**Recommendation:** The `submitDeletion()` helper is the right seam: on 26.1+ only its body changes, to `wrapper.findComponent(GModal).vm.$emit("ok")`. Note in the handoff that the merge-forward must update `submitDeletion` (and check the alert selector against GAlert). Better still, prepare a forward-port patch of the test for 26.1, since the issue already has a working vitest reproduction for that layout.

### 3. Low: `client/src/api/errorCodes.ts` is a reasonable home, and nothing collides with it forward

- No `errorCodes.ts` or similar module exists on release_26.0/26.1/26.2/dev, so a new file can't conflict. release_26.2/dev define `USER_SLUG_DUPLICATE = 400006` as a module-private const in `client/src/api/pages.ts`, the same idea kept local. Sources on dev that compare `err_code` with a literal 403004: `composables/jobDetails.ts`, plus `CuratedWorkflowList.test.ts` and `jobConsoleOutput.test.ts`.
- The alternatives are a local const in `UserDeletion.vue` (the pages.ts precedent, zero new surface) or generating the codes from `lib/galaxy/exceptions/error_codes.json`, which is overkill for a backport.

**Recommendation:** If finding 1 is acted on, consider following the `pages.ts` precedent: a module-local `const CONFIG_DOES_NOT_ALLOW = 403004` in `UserDeletion.vue`. That is the least new surface for a 25.1 bug fix. If the shared module stays, leave a note for dev-side cleanup to move `USER_SLUG_DUPLICATE` and `jobDetails.ts`'s literal into it, or the module just adds one more place codes live. Either choice is defensible. This is not a blocker.

### 4. Low: the generic fallback drops the server's `err_msg`

For anything other than 403004, the modal still shows "An error occurred while deleting the user." and discards `err_msg`. That matches sibling components and is out of scope for a 25.1 fix.

**Recommendation:** No change on this branch. Possible dev follow-up: use `errorMessageAsString(error)` for the fallback.

### 5. Nit: test quality

The tests are good. They check the exact rendered text and that `userLogoutClient` is not called, use realistic server bodies, and the baseline/fix split matches the Baseline-tests rule. The one comment, "Body Galaxy sends when allow_user_deletion is false", earns its place. The 403005 test covers a case the UI can't produce. It is still worth keeping as the "other errors show generic text, no logout" pin, though it could be retitled more generically (e.g. "another error code"). An API/integration test wouldn't add anything, since the server side already has coverage. No change needed.

## Not flagged

- No obvious comments, no buried imports, nothing weakened in the tests, and no never-working input kept alive. The dead `=== 403` path is removed, not kept.

</details>
