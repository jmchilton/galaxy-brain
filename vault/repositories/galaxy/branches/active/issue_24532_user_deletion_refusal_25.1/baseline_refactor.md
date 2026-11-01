Run via Claude Opus 5.5 at low effort.

No refactoring of the base branch was performed. The `requestDeletion()` extraction does not belong before the fix. A polish-time squash plan that takes the branch from 9 commits to 5 is below. History was not rewritten, because force-pushing is not permitted.

## Evaluation

Net diff against `origin/release_25.1`: `client/src/components/User/UserDeletion.vue` and its test only. Candidates:

- **`requestDeletion()` extraction (`6f9ffb022eb`).** A version that keeps base behavior can't have the final signature. In base, the `err_code === 403` branch is a no-op: it neither sets an error nor logs out. So a base-preserving helper would have to return three states (success, message, silent failure) or pass the raw `error` through. The first encodes the bug, and the second is a pass-through wrapper around `GalaxyApi().DELETE`. In both cases the fix commit would then rewrite the helper's signature and body. The helper is also only worth having because of the `catch` → generic message and the `err_code` → message mapping, and both are behavior changes made by the fix commits (`d952c47a769`, `e7210c056cf`). Landing it first would add a commit with no standalone value and make the fix diff bigger, not smaller.
- **`CONFIG_DOES_NOT_ALLOW` / message constants.** Naming the constant ahead of the fix would mean naming the wrong value (`403`). The message constants are introduced by the `try/catch` change, where the generic message gets its second use. Neither is worth a separate pre-fix commit.
- **`handleSubmit(event: BvModalEvent)` + `preventDefault()`, the `deleting` ref, `:ok-disabled`.** These are all behavior changes.

The branch already leads with a "Baseline tests" commit (`0b0cd6bb422`), which can be split into its own PR.

## Proposed polish-time commit structure (not applied; no history rewrite permitted)

Each group squashes adjacent commits, so every resulting tree matches an existing commit's tree, and the final tree equals `dac0771a16a`.

1. `0b0cd6bb422` **Baseline tests: UserDeletion shows a generic error on a non-config 403.** Unchanged.
2. `d952c47a769` + `f2f80d3736d` → **Explain a self-deletion refused by the instance configuration.** Uses the local `CONFIG_DOES_NOT_ALLOW = 403004` constant. The shared `errorCodes.ts` and `JobProvider.js` net to zero. Reword the message to drop "shared with JobProvider's console-output check". Keep `Fixes #24532`.
3. `4ddba1316d4` **Keep the Delete Account modal open when deletion fails.** Unchanged. This is the tip of `_alt_original_scope`.
4. `a1bc7532e16` + `e6590e91c9b` → **Disable account deletion while the request is pending.** Fold the review follow-up (`resetModal` clears `deleting`, the tightened pending test) into the commit that introduced it.
5. `e7210c056cf` + `6f9ffb022eb` + `dac0771a16a` → **Show the generic error when the deletion request fails to send.** This lands the `catch` directly in the `requestDeletion()` shape. The intermediate `try/catch` that wrapped `userLogoutClient()`, and the logout-throws test that was added and then dropped, both disappear (the test nets to zero). The message should say that `requestDeletion()` owns the transport and error mapping, and that `handleSubmit` keeps `release_26.1`'s `if (error) / else logout` shape for merge-forward.

Alternative: if a reviewer prefers a smaller fix series, fold 5 into 4, since both are about the pending/failed-request state. I'd keep them apart. Step 4 is the re-scope expansion (double submit), and step 5 is a separate failure mode (rejected request).
