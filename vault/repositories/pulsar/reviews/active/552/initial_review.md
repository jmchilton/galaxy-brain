Profile: default
Model: GPT-6 (Codex)
Effort: medium
Reviewed commit: 4fe464c48b7fb2b665c266def1dacec0c4f7a8db

## P2 1 — Preserve notification and recovery when publishing the outcome fails

**Location:** `pulsar/managers/stateful.py:431–435`

The newly moved persistence operations run outside the exception handler for `postprocess()`. If creating `postprocessed` raises `OSError` (for example, the staging filesystem has exhausted its inode quota), execution skips the terminal callback but still enters the `finally` that removes the postprocessing index. The job therefore remains `postprocessing` for polling clients, sends no terminal message to message-queue clients, and is no longer recovered after restart. Before this change, the same marker-write failure originated inside `postprocess()` and was caught by the surrounding handler, which still sent the `failed` callback. The new `store_metadata(postprocessing_failed, True)` can now fail in the same way.

Handle errors publishing the persisted outcome explicitly: ensure the failure callback is attempted, and retain the recovery entry when terminal state could not be persisted. Add a regression that makes the postprocessed-marker write fail and checks both notification and recoverability.

Validation: inspected the previous and current exception boundaries and index cleanup paths; runtime fault injection remains to be performed by the verification pass.
