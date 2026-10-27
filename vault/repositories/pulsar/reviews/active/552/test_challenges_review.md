Profile: generic_test_challenger
Model: GPT-6 (Codex)
Effort: medium
Reviewed commit: 4fe464c48b7fb2b665c266def1dacec0c4f7a8db

P2 1 — Test polling during failure publication, before waiting for the callback (`test/stateful_test.py:138–147`). The new polling regression calls `_wait_for_callback` before asserting FAILED, so it cannot detect an early `postprocessed` write that briefly exposes COMPLETE. This PR explicitly moves completion publication until after the failed outcome is persisted; restoring the old write in `post.py` would evade the new final-state assertions. Add an Event-controlled test that pauses just before failure metadata is stored, verifies client polling still returns POSTPROCESSING, then releases the worker and verifies FAILED plus one FAILED callback. Ensure worker release occurs in a finally block so a failed assertion cannot strand a background thread.
