# Confirmation dialog composable review — iteration 07

Reviewed `client/src/composables/confirmDialog.test.ts` against all client unit-testing guidance. The original single cancellation scenario remains and still waits for the confirmation to resolve `false` after caller unmount. Two additional assertions verify the actual injected AbortSignal is initially live and becomes aborted on unmount, making the lifecycle trigger visible.

The caller component exposes `useConfirmDialog()` directly from setup, so the test invokes `wrapper.vm.confirm` instead of seeding a mutable callback with an unrelated successful fallback. A typed method-only dialog double satisfies `Pick<ConfirmDialogInstance, "confirm">`; its promise can resolve only from the signal's abort event. `ensureDefined` requires that the real composable supplied a signal. The remaining cast is confined to registration because that production API requires a complete component instance even though it consumes only the exposed `confirm` method; the comment explains that boundary. Fresh Vue setup, automatic cleanup, and resetting the singleton component reference preserve isolation.

Reuse: existing Vue helpers, `ensureDefined`, and the real composable return type cover the setup. This one scenario does not justify extracting a reusable caller host or changing the production registration interface. Testing the real dialog's presentation would add a separate contract to a composable lifetime test.

Validation: the single case passes in `/private/tmp/jest_readability_batch07_forms_storage.json`; scoped ESLint 10 and Prettier pass. Missing guidance: no README addition proposed; the file now applies existing guidance without collecting obvious lifecycle advice.
