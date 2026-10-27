### P2 1: Preserve notification and recovery when publishing the outcome fails (implementation verified)

The moved persistence operations in `StatefulManagerProxy.__handle_postprocessing()` run outside the exception handler for staging. If writing `postprocessing_failed` or `postprocessed` raises (for example, the staging filesystem runs out of inodes), the terminal callback is skipped, but the `finally` block still removes the postprocessing index. Polling remains at `postprocessing`, message clients receive no terminal notification, and restart cannot recover the job. Before this change, the completion-marker write was inside `postprocess()` and its failure still led to a failed callback.

The review branch catches publication errors, attempts one failed callback, and retains the recovery index until an outcome can be persisted. Both injected write failures passed focused regressions checking notification, pending polling, retained recovery state, and successful recovery by a fresh proxy after storage becomes writable. The completion-marker regression failed with the original implementation before the fix. The fix changes 55 lines including tests.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via GPT-6 (Codex) at medium effort. Verified via GPT-6 (Codex) at medium effort.

</details>

### P2 2: Test polling before the failed outcome is published (implementation verified)

The PR's polling regression waits for the terminal callback before checking failure, so it cannot detect an early `postprocessed` write that briefly exposes `complete`. This misses the central ordering invariant: the failure outcome must be stored before completion becomes visible.

The review branch adds an Event-controlled regression that pauses before storing the failure outcome, checks that polling still returns `postprocessing` with no completion marker or callback, then releases the worker in `finally` and checks one failed callback and failed polling. The test passes with the PR's ordering and fails with `complete` instead of `postprocessing` when the old early marker write is temporarily restored. The mutation was reverted. This fix adds 30 test lines.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via GPT-6 (Codex) at medium effort. Verified via GPT-6 (Codex) at medium effort.

</details>
