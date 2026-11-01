Run via Claude Opus 5.5 at low effort.

# Scope evaluation: issue_24532_user_deletion_refusal_25.1

**Recommendation: modest expansion.** Keep the fix as implemented (match `err_code` against a local `CONFIG_DOES_NOT_ALLOW`, assign the message, and keep the BModal open on failure), and add an in-flight `deleting` state that disables **Delete Account Permanently** while the DELETE is outstanding and re-enables it on failure. The branch's own `event.preventDefault()` keeps the modal open, so a double click can now send two DELETEs, which it couldn't before. The 26.1 GModal version already handles this with the same `deleting` ref (`:ok-disabled="!nameState || deleting"`), so adding it here fixes a gap in the touched code and makes the 25.1 component look like 26.1's, which also makes the merge-forward conflict easier to resolve. Leave the rest as follow-ups. A shared error-code module was tried and reverted because it conflicts on 26.2/dev. The server's `err_msg` is worded for admins. Hiding the card needs `allow_user_deletion` exposed to non-admin config, which is a separate product decision better made on dev.

The branch is about 65 changed lines (51 test, 14 component), so there is no decomposition section.

## Scope A: as implemented

Four commits: a baseline 403005 test, the `err_code === 403004` fix with the missing message assignment, the local constant (after the shared module was dropped), and `preventDefault()` so BModal stays open long enough to show the error.

| Pros | Cons |
| --- | --- |
| <ul><li>Fixes the reported bug and the 25.1-only defect Codex found (the modal unmounted before any error was visible)</li><li>Small client-only backport with red/green tests</li><li>Merge-forward guidance already recorded in `index.md`</li></ul> | <ul><li>`preventDefault()` leaves OK enabled while the request is in flight, so a double click can send a duplicate DELETE (a new side effect, noted in `codex_review.md` and left as is)</li><li>The 25.1 component's shape differs further from 26.1's</li></ul> |

## Scope B: as implemented plus an in-flight `deleting` state (recommended)

Add `const deleting = ref(false)`. Set it before the DELETE and clear it on error (and in `resetModal`), and bind `:ok-disabled="!nameState || deleting"`. Extend one failure test to check that OK is disabled during the request and enabled again afterwards.

| Pros | Cons |
| --- | --- |
| <ul><li>Closes the double-submit gap that the branch's `preventDefault()` opened</li><li>Copies 26.1's existing logic, so reviewers see a known pattern and the merge-forward conflict is easier to resolve</li><li>Adds a few lines in code the branch already changes</li></ul> | <ul><li>Slightly larger backport</li><li>A duplicate DELETE on a refused delete is harmless, so the gain is mostly UX and robustness</li></ul> |

## Scope C: shared `CONFIG_DOES_NOT_ALLOW` constant in `@/api`, also used by `JobProvider.js`

This is the issue's nice-to-have: a `client/src/api/errorCodes.ts` with a second consumer.

| Pros | Cons |
| --- | --- |
| <ul><li>One place for Galaxy error codes on the client</li><li>The issue asks for it</li></ul> | <ul><li>Already tried in `d952c47a769` and reverted in `f2f80d3736d`: `JobProvider.js`'s check moved to `composables/jobDetails.ts` on 26.2/dev, so the swap conflicts on merge-forward</li><li>With only one consumer on 25.1 the shared module adds little; the `pages.ts` / `USER_SLUG_DUPLICATE` precedent is a local constant</li></ul> |

<details><summary>Details</summary>

The general version of this belongs on dev: a shared module (or constants generated from `lib/galaxy/exceptions/error_codes.json`) used by `composables/jobDetails.ts`, `api/pages.ts` and `UserDeletion.vue`. On a 25.1 backport it mostly adds merge-forward work. I agree with the review's call to drop it here.

</details>

## Scope D: show the server's `err_msg` in the generic fallback

Replace "An error occurred while deleting the user." with `errorMessageAsString(error, <generic>)` for codes other than 403004.

| Pros | Cons |
| --- | --- |
| <ul><li>Better diagnostics for unexpected failures (500s etc.)</li><li>One-line change in the touched branch</li></ul> | <ul><li>The only other 403 on this route (403005) can't come from the modal, and its message is phrased for the admin case</li><li>The fixed sentence matches sibling components</li><li>Both reviews judged it out of scope</li></ul> |

## Scope E: hide the Delete Account card when `allow_user_deletion` is false

Serialize `allow_user_deletion` in the non-admin `ConfigSerializer` (today only `AdminConfigSerializer` has it, at `lib/galaxy/managers/configuration.py:256`), and gate the card in `UserPreferences.vue:275` on it as well as on `enable_account_interface`.

| Pros | Cons |
| --- | --- |
| <ul><li>Fixes the root UX problem: on a stock Galaxy the card is shown and every self-deletion fails</li><li>Users don't hit a dead end at all</li></ul> | <ul><li>Needs a backend config-exposure change and a product decision about which config non-admins can see</li><li>The modal fix is still needed for older clients or cached config, so this adds to Scope A or B rather than replacing it</li><li>Changes visible UI on a release branch, and the server- and client-side changes widen the reviewer audience</li></ul> |

<details><summary>Details</summary>

This is the strongest candidate for a separate follow-up PR targeting dev (or 26.x). It is a feature-level change, not a fix in the touched code, and it would be easier to agree on as its own PR than bundled into a 25.1 backport. Mention it in the PR description as a possible follow-up.

</details>
