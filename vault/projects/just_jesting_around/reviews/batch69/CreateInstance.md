# CreateInstance readability iteration 69

Originator `a64efa5d3de8a45049ae482e234518bb683b0993`, pinned base `e63463facff284a96094cc1b78a109f66af1fc9b`.

All two original cases/two checks remain, preserving true/false loading flags, exact component loading... message, shallow child boundary and truthy/falsy LoadingSpan presence. Native inference removes the broad component-as-object cast. Cases are synchronous because neither performs asynchronous work; direct presence assertions replace an intermediate boolean with a component-shaped name. Automatic unmount owns each wrapper on success or failed assertion. No unnecessary Pinia/router fixture or local/shared mounting abstraction is added; the component uses only props and child/slot rendering.

Pristine/final Node22 shuffled690101 pass two cases. V8 comparison14files26 covered statement/function/branch-arm locations exact, zero loss/addition. Children remain shallow stubs, and this makes no rendered shared UI claim. File ESLint/Prettier and explicit absolute-config hooks pass; driver owns integrated full types.

Evidence: `/private/tmp/readability69-instance-{before,after}` JSON/logs and `/private/tmp/readability69-instance-hooks.log`. No production/support/helper changes. Existing inference and cleanup guidance suffices; no evidence-backed new guidance gap.
