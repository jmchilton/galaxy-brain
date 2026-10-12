# WorkflowInvocationStepHeader — batch 60 author review

Originator: `client/src/components/WorkflowInvocationState/WorkflowInvocationStepHeader.test.ts`.
Worker commit: `390ea5a487b88b487a95492cbf4654a33220cde4`.

The single original scenario and all six accessibility assertions remain unchanged: the trigger is a SPAN, the actual relocated popover has tooltip role, aria-describedby matches its ID, and the non-widget trigger has no aria-expanded, aria-haspopup, or aria-controls. Both nextTick waits are retained for GPopover's deferred relocation/listener setup. Trigger lookup now requires the component-owned element; popover lookup still checks the real body-relocated implementation.

The scenario owns a dedicated DOM attachment target and removes only that target on completion. VTU auto-unmount runs before target removal and explicit testing-Pinia disposal, including after an assertion failure. This replaces successful-path-only unmount and whole-body deletion. GPopover itself removes its relocated element and listeners on unmount. Native inferred mount replaces the object cast; the inline tool-step fixture includes required unused annotation/input_steps/when fields so its shape satisfies the existing API type without a shared fixture abstraction for one consumer.

Validation: one shuffled case passes with seed 600101; pristine/final default V8 coverage is exact at 182 files/426 covered statement/function/branch-arm locations. A separate comparison explicitly includes the actual shared GPopover source excluded by dependency symlinks: one file/199 covered locations also match, zero added or lost. The pristine actual-UI run uses the unchanged step-header test in the sibling help worker, avoiding any temporary restoration of the final step file. Full client vue-tsc, file ESLint/Prettier, and explicit absolute-config pre-commit gates pass. Evidence is `/private/tmp/readability60-step-*`.

No production, shared helper, supporting test, dependency, README, or marginal-advice edit. Existing lifecycle guidance is sufficient; no new evidenced guidance gap proposed.
