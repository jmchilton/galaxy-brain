Fix 🎯 #24532 - a refused account self-deletion closes the Delete Account modal instead of explaining the refusal.

![Account Deletion modal staying open with the configuration refusal message](screenshots/user_deletion_refused_by_configuration.png)

`allow_user_deletion` defaults to `false` while the Delete Account card is shown by default, so on a stock Galaxy every self-deletion attempt is refused. The user types their email, clicks a red "permanently delete" button, and the modal disappears. The account still exists, and nothing says why.

| What happens on `release_25.1` | Before | After |
| --- | --- | --- |
| Instance config refuses (403004) | ❌ modal closes, no explanation | ✅ modal stays open: "User deletion must be configured on this instance…" |
| Any other error response | ❌ modal closes, generic message unseen | ✅ modal stays open with the generic message |
| Request never reaches the server | ❌ modal closes, unhandled rejection | ✅ modal stays open with the generic message |
| Deletion succeeds | ✅ logs out | ✅ unchanged |

***The one-line `err_code` fix the issue proposes isn't enough on this branch: BModal closes on OK, which unmounts the modal before any error can render, so the message would still never be seen (the issue's generic error, reported on `dev`, never renders here).*** ***Keeping the modal open is what makes the rest of this diff necessary: OK has to be disabled during the request to prevent a second DELETE, and a failed request has to re-enable it.***

***This only explains the refusal; it doesn't hide the Delete Account card on instances that disallow deletion.*** That needs exposing `allow_user_deletion` to non-admins, a separate decision for `dev`. ***26.1 and `dev` still carry the wrong `err_code` check until this is merged forward, and that merge needs the manual port under Risk Details.***

<details><summary>How it works</summary>

All in `client/src/components/User/UserDeletion.vue`:

- `err_code` was compared with the HTTP status `403`, but Galaxy sends `403004`, and that branch never assigned its message. It now matches a local `CONFIG_DOES_NOT_ALLOW` constant and assigns it.
- `handleSubmit` calls `preventDefault()` on BModal's `ok` event. Success still logs out.
- A `deleting` ref adds to `:ok-disabled`. It clears on failure and in `resetModal`.
- `requestDeletion()` holds the request and the error-to-message mapping, and resolves to the message to show. Logout stays outside its `try/catch`, so only a failed request is reported as a failed deletion.

The constant is local because a shared error-code module conflicts on newer branches, where `JobProvider.js`'s check has moved.

</details>

## Risks

Risks are minimal - this client-only change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- Merge-forward isn't automatic. From 26.1 `UserDeletion.vue` conflicts with the GModal rewrite: keep its template, port `requestDeletion()` into its `handleSubmit`, drop `preventDefault()`, and adapt the test helpers to GModal.
- A 403 that Galaxy didn't produce (e.g. from a proxy) has its `err_code` set to the HTTP status by the client. It now shows the generic message instead of the configuration message.
- `test_delete_account` now uses a shared helper and loses its `UX_RENDER` sleep.

</details>

<details><summary>Risk Review Advice</summary>

Check that nothing can leave `deleting` set with the modal still open: each failure in `requestDeletion()` should end in the `if (error)` branch of `handleSubmit`. The success path deliberately leaves it set, because logout navigates away.

`expectModalStillOpen` reads BModal's emitted `change` event, the only signal that separates open from closed under jsdom. The Selenium test checks the same behavior in a real browser.

</details>

## Context

The bug goes back to 25.1, and 25.1 and 26.0 are where it's worst because the modal closes. Alternative kept on 🌿[`issue_24532_user_deletion_refusal_25.1_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_24532_user_deletion_refusal_25.1_alt_original_scope) - the message fix and `preventDefault()` only, with no `deleting` state, so a double click can send two requests. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the scope as implemented, after one earlier expansion.</summary>

The branch covers the whole failure path of the touched component, matching 26.1's shape. Contracting brings back a double-submit gap or leaves the fix invisible on 25.1. Rejected or deferred: a shared error-code module (conflicts on newer branches), showing the server's `err_msg` (worded for admins), hiding the card (backend decision for `dev`), 26.1's in-flight spinner (cosmetic). A sweep found no other `err_code` compared with an HTTP status. Can be split into baseline, message fix and modal behavior if preferred.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24532_user_deletion_refusal_25.1/scope_evaluation/). Run via Claude Opus 5.5 at low effort.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>No base refactor; history squashed to six commits with baseline tests first.</summary>

Extracting `requestDeletion()` ahead of the fix would either encode the bug or be a pass-through wrapper, so it lands with the fix.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24532_user_deletion_refusal_25.1/baseline_refactor/). Run via Claude Opus 5.5 at low effort.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>No test changes; each non-baseline test fails at its own assertion without its change.</summary>

Run against the base and intermediate component versions, tests fail on the wrong text, the modal closing or the button staying enabled, not on missing fixtures. Responses are mocked at the HTTP layer with the real backend body; the only other mock is `userLogoutClient`. The modal-open assertion was probed against jsdom alternatives and kept, with a real browser check recommended and since added.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24532_user_deletion_refusal_25.1/test_challenges_debrief/). Run via Claude Opus 5.5 at low effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>One P1 confirmed and fixed: a rejected request left the button stuck.</summary>

With `deleting` in place, a rejected fetch left the modal with no message and OK disabled. Reproduced in jest, fixed with the `try/catch`, and covered by a test.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24532_user_deletion_refusal_25.1/codex_review/). Run via gpt-6.1-sol.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural regression; one finding fixed by narrowing the <code>try/catch</code>.</summary>

The catch had wrapped logout too, so an exception after a successful deletion would have read as a failed one. `requestDeletion()` now holds only the request, which also restores 26.1's `handleSubmit` shape. Declined: a shared error-code module, avoiding BModal's `preventDefault()`, and removing the existing `nameState` guard.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24532_user_deletion_refusal_25.1/thermo_nuclear_review/). Run via Claude Opus 5.5 at low effort.

</details>

### ✅ [John's Agentic Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All 6 general items pass.</summary>

- [x] What does the user see when it fails? Config refusal (403004) shows "User deletion must be configured on this instance..." in the modal; any other error or failed request shows "An error occurred while deleting the user."; modal stays open, user stays logged in.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes, tests drive the mounted modal via mocked 403/network responses and assert visible alert text, button state, logout and modal-open behavior.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes, `db1fdf9e9ce` is the first commit and only touches `UserDeletion.test.ts`.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24532_user_deletion_refusal_25.1/pr_checklist/). Run via claude-sonnet at medium effort.

</details>

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- Jest (`client/src/components/User/UserDeletion.test.ts`): the configuration refusal, another 403, the pending state and a request that never reaches the server. The baseline test comes first.
- Selenium (`test/integration_selenium/test_user_deletion_disabled.py`, `allow_user_deletion=False`): the refusal appears inside the open modal, the email is kept, OK is clickable again and the user stays logged in.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
