Keep the implemented narrow scope: reject unknown invocation completion-action names using the application's existing registry before any history or invocation is created. Registering and injecting that existing singleton is necessary support for this independent `release_26.2` guard; no broader invocation preflight refactor is needed.

## As implemented

Use the authoritative runtime registry to validate every submitted action name. Preserve known/custom action configuration and completion execution, with an API regression proving rejection precedes persistence.

| Pros | Cons |
| --- | --- |
| Independent fix; accepts discovered/custom hooks; prevents invalid-request side effects; uses existing DI. | Adds one service dependency; action configuration remains validated by existing hook behavior. |

## Smaller: hardcode the built-in names

Check only the names listed in the current API schema description and avoid registry injection.

| Pros | Cons |
| --- | --- |
| Fewer DI lines. | Rejects custom/discovered hooks and creates a second source of truth that drifts from execution. |

## Larger: validate complete hook configuration at submission

Move or introduce per-hook payload/URI validation before workflow creation, potentially with a generalized preflight API.

| Pros | Cons |
| --- | --- |
| Could detect additional invalid hook configurations earlier. | Changes existing accepted configuration semantics; requires new extension contracts and broader review; exceeds the agreed independent guard. |

No scope change is recommended. Existing positive hook/API tests and the focused wiring review are sufficient complements to this scope.
