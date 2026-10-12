# ConfirmDialog — independent normal review

Approved. Reviewed committed change ebe1f523b6bd762b3dc02ee3ffa6c5dc187d0134 against batch base 5eeeb57ef4d887b72b64c71377eb72e3dc5def08, current client testing README, REVIEW_FOCUS, and the actual component and confirmation service.

All six scenarios and eight original assertions are retained: OK true, Cancel false, close null, message/title/button text, replacing a pending confirmation resolves false, and abort resolves false. Required DOM targets use `get`. The real dialog/button subtree remains mounted and interacted with; singleton reference registration uses the inferred exposed component type without casts.

Mounting per scenario removes shared mutable wrappers. The suite registers automatic unmounting last, so the component unmounts before the singleton reference is cleared and its owned attachment nodes are removed. The dedicated targets avoid erasing unrelated document content. The custom-options scenario now resolves and awaits its own pending confirmation after its original checks. No production code or unrelated helper changes.

Independent shuffled run with seed 570201 passed six cases: `/private/tmp/readability57-confirm-independent.log`. The worker is clean. The author's coverage evidence includes actual UI package sources behind the node_modules link, retaining all 428 covered locations; default coverage retains all 76. No assertion weakening, lifecycle ordering concern, or actionable guidance gap found. Existing public service interactions and outcomes are appropriate unit contracts; no E2E or production restructuring is needed for this readability change.
