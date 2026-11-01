# Implementation debrief: issue_24532_user_deletion_refusal_25.1

**STATUS: READY.** Fixes #24532 on `release_25.1`, head `551bc3a8e7f`. Re-scoped once; the second scope evaluation says to keep the scope as implemented.

```
created .../differential-review/snapshots/20261101T154827Z-hardening-551bc3a8e7f8.json
  hardening @ 551bc3a8e7f8 vs origin/release_25.1 (merge-base 32317280ecb5)
  since 20261101T150337Z-implementation-e6590e91c9bb:
    commits: 6 same, 0 rebased, 0 changed, 5 new, 0 dropped
    hunks:   3 carried, 2 changed, 7 new, 3 dropped
```

## What the branch does

Fixes the Delete Account modal's failure path (`client/src/components/User/UserDeletion.vue`):
- **Config refusal:** `err_code` is matched against a local `CONFIG_DOES_NOT_ALLOW = 403004`, so a refusal under `allow_user_deletion: false` (the default) shows "User deletion must be configured on this instance…". Before, it compared with the HTTP status 403 and never assigned the message.
- **Modal stays open:** `ok` is `preventDefault()`ed. On 25.1 and 26.0, BModal closed and unmounted the modal on OK, so no deletion error was ever visible (found by Codex).
- **No double submit (re-scope):** a `deleting` state disables OK while the request is out, and is cleared on failure and on reset.
- **Request failures:** a `requestDeletion()` helper wraps the DELETE in a `try/catch`. A rejected request (e.g. network failure) shows the generic error and re-enables OK instead of leaving the button stuck (found by Codex in round 2). Logout stays outside the `catch`.

## Tests

- **Jest (`UserDeletion.test.ts`):** 9 tests. The "Baseline tests" commit (`0b0cd6bb422`) comes first. The tests cover:
  - the 403004 message
  - a different 403 still shows the generic message
  - the modal stays open (asserted via BModal's v-model `change`)
  - the button is disabled while the request is pending
  - a network failure shows the generic error and re-enables the button
  - the user is not logged out on any failure

  Each non-baseline test fails at its own assertion without its change.
- **Selenium (`test/integration_selenium/test_user_deletion_disabled.py`):** runs with `allow_user_deletion=False`. It checks that the refusal text appears inside the modal, the email is kept, OK becomes clickable again and the user stays logged in, and it captures a screenshot. A shared `request_account_deletion` helper and a `preferences.delete_account_error` navigation target are now used by this test and by the existing `test_delete_account`, and the old `sleep_for` was dropped. Both ran green twice locally.
- **Checks:** vue-tsc, eslint and prettier are clean. `make format` changed nothing, and mypy is clean on the changed Python files.

## Choices

- **Base `release_25.1`:** the bug has existed since 25.1 (#19658), and on 25.1 it is worse than on newer branches.
- **Merge-forward needs manual work:** see the Merge-forward section of `index.md`. Port `requestDeletion()`, drop `preventDefault`, and adapt the jest helpers to GModal.
- **Local constant instead of a shared error-code module:** the shared version was tried and reverted because it conflicts on 26.2/dev.
- **Not done (follow-ups):** showing the server's `err_msg` (it's worded for admins), hiding the card when deletion is disabled (needs a config-exposure decision on dev), and 26.1's in-flight spinner.

## Process record

- Normal reviews: [1](subagents/normal_review_1.md) and [2](subagents/normal_review_2.md).
- Re-scope: [implementation_rescope_debrief.md](implementation_rescope_debrief.md). The original scope is kept on the alt `_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).
- Round-2 hardening: [test challenges](test_challenges_debrief.md), [Codex](codex_review.md), [thermo-nuclear](thermo_nuclear_review.md), [baseline refactor](baseline_refactor.md), [scope](scope_evaluation.md), [screenshots](screenshot_debrief.md), [E2E polish](polish_e2e_tests_debrief.md).
- Round 1 is in `earlier_drafts/1/`.

## Polish-time notes

- **Squash plan:** force-push was denied here. [baseline_refactor.md](baseline_refactor.md) plans going from 9 to 5 commits, including folding `f2f80d3736d` into `d952c47a769` with a reworded message. The two Selenium commits can also fold together.
- **Local E2E setup:** the browser workaround for this ubuntu 26.04 host is in [screenshot_debrief.md](screenshot_debrief.md).
- **Issue comment:** drafted at [issue_comment_draft.md](issue_comment_draft.md). Not posted.
