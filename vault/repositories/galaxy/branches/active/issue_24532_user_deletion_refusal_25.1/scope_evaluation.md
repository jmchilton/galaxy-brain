Run via Claude Opus 5.5 at low effort.

# Scope evaluation (second, after re-scope): issue_24532_user_deletion_refusal_25.1

**Recommendation: keep the scope as implemented.** The branch fixes #24532 by matching `err_code` against a local `CONFIG_DOES_NOT_ALLOW` and assigning the message. It keeps BModal open so the error can be seen, which 25.1 needs: without it the modal closes before any error shows. It also carries the first evaluation's expansion, the in-flight `deleting` state, and the `requestDeletion()` `try/catch` that closes the stuck-button regression `deleting` introduced. That adds up to the whole failure path of the touched component, made to match 26.1's shape. I looked for one more modest expansion and found none worth taking. A sweep of the 25.1 client finds no other `err_code` compared with an HTTP status (the only six-digit check, `JobProvider.js`'s `403004`, is already correct). The remaining candidates each fail on a concrete cost, not a generic "stay narrow" reason. A shared error-code module was tried and reverted because it conflicts on 26.2/dev. The server's `err_msg` is worded for admins. Hiding the card needs a backend config-exposure decision that belongs on dev. Porting 26.1's LoadingSpan is cosmetic. Contracting back to the alt (`_alt_original_scope`) would bring back the double-submit gap, so that's not recommended either. The one open item is not a scope change: the untracked Selenium test `test_user_deletion_disabled.py` should run in polish or CI and be committed only once it passes.

## Possible Decompositions

The branch is about 131 changed lines (88 test, 43 component) in two files and nine commits. It's small enough to land as one PR. Splits that would work:

1. **Baseline, then fix.** PR 1: `0b0cd6bb422` (Baseline tests, the 403005 generic-message pin plus the helpers). PR 2: everything else. This follows the standing "Baseline tests" convention, and PR 1 passes on unmodified 25.1.
2. **Baseline, message fix, then modal behavior.** PR 1: baseline. PR 2: the `CONFIG_DOES_NOT_ALLOW` mapping plus `preventDefault()` (`d952c47a769`, `f2f80d3736d`, `4ddba1316d4`), the smallest unit that makes the message visible on 25.1. PR 3: `deleting`, `requestDeletion()`'s `try/catch` and their tests (`a1bc7532e16` through `dac0771a16a`). PR 3 depends on PR 2, because `preventDefault()` is what opens the double-submit gap.

## Scope A: as implemented (recommended)

Local `CONFIG_DOES_NOT_ALLOW` mapping with the missing assignment. `preventDefault()` keeps BModal open. A `deleting` ref disables OK while the request is in flight and is reset on failure and in `resetModal`. `requestDeletion()` wraps only the request in a `try/catch`, so a rejected fetch shows the generic message and re-enables OK. Jest tests cover each piece and fail without it.

| Pros | Cons |
| --- | --- |
| <ul><li>Fixes the reported bug and every follow-on defect the reviews found in this component's failure path: the modal closing, double submit, the stuck button on a network error</li><li>`handleSubmit` has 26.1's structure, and `index.md` records the merge-forward port</li><li>Client-only and small. Each test fails without its change (test challenges table)</li><li>`requestDeletion()`'s `try/catch` fixes a gap 26.1/dev also have, and the merge-forward carries it</li></ul> | <ul><li>About twice the size of the bare one-line fix, though every addition is needed on 25.1 or follows from one that is</li><li>`preventDefault()`/`BvModalEvent` is BModal-specific and gets dropped at merge-forward</li><li>No E2E run on this host</li></ul> |

## Scope B: contract to the alt original scope (`4ddba1316d4`)

The message fix plus `preventDefault()`, with no `deleting` and no `try/catch`.

| Pros | Cons |
| --- | --- |
| <ul><li>Smaller diff, fewer tests</li><li>Already pushed as `_alt_original_scope`</li></ul> | <ul><li>Brings back the double-submit gap that its own `preventDefault()` creates</li><li>Moves the 25.1 component away from 26.1's `deleting` shape, which makes merge-forward harder</li><li>The first scope evaluation and both later reviews rejected it</li></ul> |

## Scope C: contract to the message fix only (`f2f80d3736d`)

Only the `err_code` comparison and the assignment.

| Pros | Cons |
| --- | --- |
| <ul><li>Smallest possible diff and closest to the issue's proposed approach</li></ul> | <ul><li>On 25.1 the fix can't be seen: BModal closes on OK before the error renders (test challenges: "fail: modal closes")</li><li>So it doesn't actually fix #24532 on the target branch</li></ul> |

## Scope D: shared client error-code module (`@/api/errorCodes.ts`), also used by `JobProvider.js`

The issue's nice-to-have.

| Pros | Cons |
| --- | --- |
| <ul><li>One home for error codes, the general piece the process prefers</li><li>`JobProvider.js` is a second real consumer on 25.1</li></ul> | <ul><li>Tried in `d952c47a769` and reverted. `JobProvider.js`'s check moved to `composables/jobDetails.ts` on 26.2/dev, so the swap conflicts on merge-forward</li><li>The general version (consumers `jobDetails.ts`, `pages.ts`'s `USER_SLUG_DUPLICATE`, or codes generated from `error_codes.json`) only makes sense on dev</li></ul> |

## Scope E: show the server's `err_msg` in the generic fallback

Use `errorMessageAsString(error, GENERIC_ERROR_MESSAGE)` for codes other than 403004.

| Pros | Cons |
| --- | --- |
| <ul><li>Better diagnostics for unexpected failures</li><li>A one-line change inside `requestDeletion()`</li></ul> | <ul><li>The only other server refusal on this route is 403005, which the modal can't trigger, and its message, like 403004's, is worded for admins</li><li>Sibling components use the fixed sentence</li><li>The issue's alternatives section and both normal reviews ruled it out</li></ul> |

## Scope F: hide the Delete Account card when `allow_user_deletion` is false

Add `allow_user_deletion` to the non-admin `ConfigSerializer` (only `AdminConfigSerializer` has it today, `lib/galaxy/managers/configuration.py:256`) and gate the card in `UserPreferences.vue`.

| Pros | Cons |
| --- | --- |
| <ul><li>Fixes the root UX problem: on a stock Galaxy every self-deletion fails</li></ul> | <ul><li>A backend change, plus a product decision about which config non-admins can see</li><li>Adds to Scope A rather than replacing it, since the modal still has to handle a refusal</li><li>Visible UI change on a release branch, and a wider reviewer audience</li></ul> |

<details><summary>Details</summary>

This is still the strongest follow-up candidate, as a separate PR against dev. Mention it in the PR description.

</details>

## Scope G: port 26.1's in-flight feedback (`LoadingSpan`/info `GAlert` while `deleting`)

| Pros | Cons |
| --- | --- |
| <ul><li>Closer visual parity with 26.1</li><li>Users get feedback during a slow delete</li></ul> | <ul><li>Cosmetic. Deletion is normally quick, and the disabled button already blocks double submits</li><li>Adds template lines that conflict with 26.1's GModal template at merge-forward</li></ul> |

## Scope H: sibling-bug sweep for `err_code` compared with an HTTP status, or async BModal `@ok` handlers that close before showing an error

| Pros | Cons |
| --- | --- |
| <ul><li>The process prefers fixing related bugs in the same pass</li></ul> | <ul><li>Nothing to fix. On 25.1, `UserDeletion.vue` was the only `err_code ===`/`==` check against a three-digit status. The async-`@ok` grep found `WorkflowRename.vue` and `ServiceCredentialsGroupsList.vue`, which report through toasts or parent state rather than an in-modal alert, so they don't hide an error in the same way</li></ul> |

<details><summary>Details</summary>

Commands, run on the worktree (25.1): `grep -rnE "err_code\s*(===|==|!==)\s*[0-9]{3}\b" client/src` (no non-test hits after the fix), and the same `git grep` on `origin/release_26.0` and `origin/dev`, which hits only `UserDeletion.vue`. The merge-forward already fixes those.

</details>

## Scope I: commit the Selenium E2E test (`test_user_deletion_disabled.py`)

| Pros | Cons |
| --- | --- |
| <ul><li>Checks directly that the modal stays open with the message, which jsdom can only show through BModal's `change` event</li></ul> | <ul><li>Can't run on this host, and the test challenge said not to commit it until it passes</li><li>Starts a dedicated Galaxy server to check one alert</li><li>A test-coverage choice, not a scope change. Handle it in polish or CI</li></ul> |
