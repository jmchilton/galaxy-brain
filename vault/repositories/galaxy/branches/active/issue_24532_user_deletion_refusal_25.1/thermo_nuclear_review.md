Run via Claude Opus 5.5 at low effort.

# Thermo-nuclear code quality review: issue_24532_user_deletion_refusal_25.1

Scope: `git diff origin/release_25.1...HEAD` at `e7210c056cf` (7 commits, `UserDeletion.vue` +47/-18 and `UserDeletion.test.ts` +88). Both files stay small: about 105 and 190 lines. The review weighed merge-forward to 26.1+, where the GModal rewrite conflicts with this file, against any restructuring.

**Top-line:** No structural regression. The diff is small, and it fixes a dead-expression bug (the 403 message was a bare string statement) instead of adding a feature. There was one real structural problem, fixed below. The `try/catch` wrapped the whole success path, so `userLogoutClient()` ran inside the catch. When logout threw after a **successful** deletion, the user saw "An error occurred while deleting the user." and the delete button came back on. Narrowing the catch also brought `handleSubmit` back to 26.1's shape, which helps merge-forward.

## Findings

### 1. Addressed: the `try/catch` scope covered the success path, so errors were misattributed

At `e7210c056cf`, `handleSubmit` had a `try` that wrapped the request, the error-to-message mapping and `userLogoutClient()`, followed by an early `return` and a trailing `deleting.value = false`. Three exits (return, fall-through, catch) shared one mutable flag. A synchronous throw from `userLogoutClient()` (`getGalaxyInstance()`/`Galaxy.config` in `utils/logout.js`) landed in the network-failure `catch`. After the account was already deleted, the user saw a deletion-failure message and an enabled button inviting a second DELETE.

Fix: a `requestDeletion(): Promise<string | undefined>` helper owns the transport and error mapping. It is the only code inside the `try`, and it resolves to the message to show or to `undefined` on success. `handleSubmit` goes back to orchestration only, with a single `if (error) { deleteError = error; deleting = false } else { userLogoutClient() }`. That is line for line the structure of `origin/release_26.1`'s `handleSubmit`, so the merge-forward port becomes "swap the raw DELETE for `requestDeletion()`" instead of rewriting the control flow. The early `return` and the separate fall-through reset are gone.

New test, "does not report a deletion failure when logging out after a successful deletion throws". It fails at `e7210c056cf` (the `.alert-danger` is shown) and passes after the fix. 10/10 jest tests pass, and eslint/prettier are clean.

### 2. Declined: hard-coded `403004` instead of a shared error-code module

A canonical client-side `error_codes` module would be the right home. The client has none (grep finds no other `err_code` constant), and the re-scope debrief records that one was tried and then reverted because it conflicts on 26.2/dev. A named module-level constant that cites the backend name (`CONFIG_DOES_NOT_ALLOW`) is the right call for a backport. A shared module belongs on dev.

### 3. Declined: `event.preventDefault()` plus `BvModalEvent` is BModal-specific

It disappears on 26.1 (`:close-on-ok="false"`), and `index.md` already says to drop it at merge-forward. No better 25.1 alternative exists: the `busy` prop would also lock Cancel.

### 4. Declined: the `if (nameState.value)` guard is redundant with `:ok-disabled`

It is pre-existing, it's in 26.1 too, and a guard clause rewrite would only add merge-forward conflict.

### 5. Declined: the tests repeat the user-visible strings rather than importing the constants

Pinning the literal user-facing text is the point of these tests. Importing the constants from the SFC would make them tautological.

### 6. Noted, not changed: `expectModalStillOpen` asserts on BModal's emitted `change`

This depends on BModal internals, but the helper's doc comment explains it, normal review 2 verified it against `modal.js`, and the 26.1 merge-forward note already covers replacing it.

## Commits

- `Report a deletion as failed only when the request fails` `6f9ffb022eb`: narrows the `try/catch` to the request via `requestDeletion()`, restores 26.1's `handleSubmit` shape, and adds the logout-throws test.

## Merge-forward note update

`index.md`'s instruction to "port the `try/catch` around the DELETE that resets `deleting`" now means: port `requestDeletion()` and call it from 26.1's `handleSubmit` in place of the raw `GalaxyApi().DELETE`. 26.1's `if (error) {...} else { userLogoutClient() }` branch then stays as is, apart from the message assignment.

## Coordinator follow-up

Kept the `requestDeletion()` split from `6f9ffb022eb`. Dropped its "logout throws" test in `dac0771a16a`. `userLogoutClient` is synchronous (it clears session storage and sets `location.href`) and doesn't throw in practice, so the test pinned an unlikely path that the structure already rules out. Updated the `index.md` merge-forward note to say "port `requestDeletion()`".
