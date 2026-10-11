The fix keeps each list element paired with its own uploaded content while preserving collection order, progress IDs, and abort signals. No blockers found. I checked 115 local tests/probes, confirmed the pairing regression fails against the exact parent and passes with this change, and verified that the new end-to-end content test ran successfully in Playwright CI.

The client change is straightforward to roll back, but it does not repair collections already created with mislabeled contents.
