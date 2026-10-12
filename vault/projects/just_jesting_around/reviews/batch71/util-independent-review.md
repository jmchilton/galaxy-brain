# Util independent normal review

Approved worker `ac3a5d76117ab82ba10928507dd49f7f30fdc54c` against `923ac5312656dc6aafbf8f78f2701945cc2aa4b4`. Read the changed test, production loader, canonical toast mock, client testing guidance and shared review focus.

The original one case/two checks remain: a mounted loader rejects with the identical TypeError, then loading stops and the exact error/title pair is observed. The canonical mock exposes the same object through Toast/useToast; no disconnected spy can satisfy the assertion. Native mount and flush timing remain. Auto-unmount runs before clearing toast calls, with beforeEach isolation as well. This exercises the composable's error behavior through its real mounted lifecycle, not an expectation assembled from its own implementation.

Independent pinned Node 22.20 single-worker shuffled seed 710201 passes one case (`/private/tmp/readability71-util-independent.log`). Author location comparison reports 31 files/84 covered locations identical; no shared UI template rendering claim. File gates are author-owned; integrated types are driver-owned. No actionable concern or additional helper/documentation proposal.
