# FormInput

Selected originator: `client/src/components/Form/Elements/FormInput.test.js`. Baseline and final: **2 tests**.

This was a small cleanup. A per-test `mountFormInput()` replaces the shared `beforeEach` wrapper, and `enableAutoUnmount(afterEach)` cleans up; nothing unmounted wrappers before. Each case reads as arrange, act, assert. The names now state the behaviour instead of "check ...".

Preserved, with identical expected values: `initial_value` shown in the `<input>`, `new_value` after `setValue`, and `new_value` as the first `input` emission. For the textarea, the case still switches with `setProps({ area: true })` after mounting, then asserts the same three things. It also now checks that the `<input>` is gone after the switch, which is new.

Not strengthened: replacing `emittedArg` with an exact `emitted("input")` list fails. FormInput declares no `emits`, so VTU also records the native `input` event bubbling from the root `<input>` as a second emission. `emittedArg` (first emission) stays, as before.

Reuse: `getLocalVue` and `emittedArg`. The sibling `Form/Elements` tests each have their own one-off mounts, with no shared helper to adopt.

Validation: 2 tests pass shuffled (seed `290101`, `NODE_OPTIONS=--no-webstorage`). Scoped ESLint and Prettier pass; full client `vue-tsc --noEmit` passes.

Guidance: none.
