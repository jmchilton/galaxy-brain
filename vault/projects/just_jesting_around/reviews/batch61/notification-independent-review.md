# Independent review: NotificationForm

Approve. Compared final worker commit `4a8bea84daf234622a5d4a8ecb881f8142bc3725` with base `9b952a0b874de984c631e217445e3298042500eb`, read NotificationForm's required-field/submit rendering, and applied current README/shared review priorities.

The original single empty-form scenario and all three checks remain unchanged: submit-button presence, aria-disabled=true, and the required-fields explanation. Existing props, full mounting, flushPromises, selector helper, and server-mock arrangement are retained. This continues to be an initial disabled-state smoke contract; it does not claim notification submission or successful recipient loading coverage.

Native mounting removes the component object cast, and withPlugins supplies the explicitly created testing Pinia to the component tree. The intended FontAwesomeIcon stub now lives under native global.stubs alongside the shared stubs. Automatic unmount runs before on-test-finished Pinia disposal, including after assertion failures. These edits align the arrangement with existing native-mount guidance without adding production behavior or a fixture layer.

Independent shuffled seed 610201 passes one case. No original assertion was weakened, and no blocking finding, supporting edit, new shared abstraction, or evidence-backed README gap was identified.
