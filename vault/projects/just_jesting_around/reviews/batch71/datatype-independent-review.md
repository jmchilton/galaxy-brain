# Datatype independent normal review

Approved worker `97df8c3d086` against `923ac5312656dc6aafbf8f78f2701945cc2aa4b4`. Read the changed test, datatype store, client testing guidance and shared review focus.

The original one case/two checks, 500 response body, rejection text and empty store state remain unchanged. Module reset still precedes dynamically importing Pinia and the store because UploadUtils caches data at module scope. The test captures create/dispose/setActivePinia from that same freshly imported module, registers cleanup before the potentially failing store import, and explicitly binds the store to its owned Pinia. Disposal and active-Pinia reset are failure-safe. No detached module's cleanup function is used.

Independent pinned Node 22.20 single-worker shuffled seed 710201 passes one case (`/private/tmp/readability71-datatype-independent.log`). Author source-location comparison reports 19 files/157 covered locations identical. The real request boundary is retained; no shared UI renders. File gates are author-owned; integrated types are driver-owned. No actionable concern or useful new guidance gap.
