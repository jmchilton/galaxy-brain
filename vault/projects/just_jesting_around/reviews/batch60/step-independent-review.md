# Independent review: WorkflowInvocationStepHeader

Approve. Compared final worker commit `390ea5a487b` with base `bc3b5f773a059d2a19aa2be333d06ba53eaf246e`, read the header component, ToolLinkPopover's default non-interactive behavior, and the actual shared GPopover role/accessibility and unmount paths, applying current README/shared review priorities.

The original case and all six assertions remain: SPAN trigger, tooltip role, aria-describedby linking to the actual popover id, and absence of aria-expanded, aria-haspopup, and aria-controls. Two nextTicks, real mounting, testing-store action stubs, child stubs, original tool id/version, and step id are retained. Required trigger lookup is now scoped to the wrapper rather than the whole document.

Each case now owns its DOM attachment target, native typed component mount, and testing Pinia. Automatic unmount runs before on-test-finished Pinia disposal and target removal, so failed assertions also release the component tree and attached body node. Removing only the owned target replaces the original blanket body deletion. The three added workflow-step fields complete its declared type; none affect the header's exercised tool-popover branch.

Independent shuffled seed 600201 passes one case. No original check was weakened, no production or supporting test changed, and no shared abstraction or evidence-backed README gap is required.
