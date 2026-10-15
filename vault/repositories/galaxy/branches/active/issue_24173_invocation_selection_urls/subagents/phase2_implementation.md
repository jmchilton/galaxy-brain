# Phase 2 implementation

Implemented mapped-job selection from the shared invocation URL state, including matching the job state filter, sorted pagination, modal opening, previous/next navigation, modal close, and same-mounted selection changes. Synchronous filter page resets prevent the parent from overwriting the selected job page after child initialization. Inactive step cards leave another card's selected job untouched.

Workflow and step output selection expands the matching named dataset or collection through GenericItem. Its optional controlled expansion retains independent dataset and collection controls and preserves uncontrolled dataset collection element behavior. Selected items load below the viewport and scroll when requested. Unknown names safely leave items collapsed.

Step Jobs, Outputs and Config tabs use shared named URL state. Config deep links initiate config loading without a preceding click. Dynamic outputs recreate GTabs in declared order; lifecycle guards ignore unregister-driven model events during collapse, disposal and tab recreation. Tests exercise actual GTabs registration and URL-bound tab state.

Added component coverage for mapped jobs, workflow outputs, step outputs, GenericItem controlled/uncontrolled expansion, Config deep links and dynamic tab lifecycle. Added a browser test for all three step aliases, mapped jobs past the first page, state filtering, modal navigation/close, graph selection, and preserving the mounted invocation root. The browser fixture supplies explicit nonoverlapping graph positions.

Validation at recovery: JobStepSelection, WorkflowInvocationStepSelection (initial output case), and WorkflowInvocationInputOutputTabs passed in /tmp/phase2-recovery-tests.log. The new dce test initially exposed its ineffective dynamic provider stub; it now exercises the real provider with its GET mocked. Focused validation of the corrected GenericItem suite and three real-tab regression cases is running in /tmp/phase2-recovery-regressions.log. Phase2 eslint is running in /tmp/phase2-recovery-eslint.log. Mapped browser validation is running in /tmp/phase2-e2e-recovery.log against the parent's warmed Galaxy/Vite servers. Final results remain to be recorded by the parent.

No commit created. Remaining work: normal review confirmation, mandatory test challenge / E2E polish / quality / scope / screenshot process and final branch handoff.
