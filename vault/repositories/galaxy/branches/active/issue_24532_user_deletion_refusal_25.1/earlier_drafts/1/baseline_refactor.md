Run via Claude Opus 5.5 at low effort.

No refactoring of the base branch was performed.

## Evaluation

Net diff against `origin/release_25.1` touches only `client/src/components/User/UserDeletion.vue` (+ its test):

- `CONFIG_DOES_NOT_ALLOW = 403004` local constant and the `err_code` comparison/assignment fix — this is the bug fix itself. Introducing the constant first with base behavior would mean naming the wrong value (403), which isn't a meaningful refactor.
- `handleSubmit(event: BvModalEvent)` + `event.preventDefault()` — a behavior change (modal stays open on failure), not a refactor.

Nothing remains that could land as a behavior-preserving commit ahead of the fix. The branch already leads with a "Baseline tests" commit (`0b0cd6bb422`).

## Polish-time note (not done; no history rewrite permitted)

`d952c47a769` adds a shared `client/src/api/errorCodes.ts` and a `JobProvider.js` change that `f2f80d3736d` then reverts. At polish time, squash `f2f80d3736d` into `d952c47a769` so the history reads:

1. `0b0cd6bb422` Baseline tests: UserDeletion shows a generic error on a non-config 403
2. Explain a self-deletion refused by the instance configuration (local constant only; drop the errorCodes/JobProvider mention from the message)
3. `4ddba1316d4` Keep the Delete Account modal open when deletion fails

This is history cleanup, not a refactor-first restructuring.
