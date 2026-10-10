# GAlert

Selected originator: `client/src/components/BaseComponents/GAlert.test.ts`. Baseline and final: **8 tests**.

This was a small cleanup. `mountAlert(props, options)` replaces five repeated `mount(GAlert, { global: localVue, ... })` literals. `isShown(wrapper)` and a `SELECTORS` constant replace eight `find(".alert").exists()` checks. `countdownValues(wrapper)` replaces the four inline `emitted("dismiss-count-down")?.map(...)` projections. `nextTick()` replaces `wrapper.vm.$nextTick()`. `enableAutoUnmount(afterEach)` cleans up wrappers; nothing unmounted them before. The fake-timer `beforeEach`/`afterEach` is unchanged.

All eight scenarios and every assertion are kept with identical expected values:

- self-dismiss, with its single `dismissed` and the `[false]` `input`/`update:show` payloads, still checked as whole argument arrays
- the `value` v-model precedence
- the 2 → 1 → 0 countdown, with visibility at each step and a single `dismissed`
- the four variant role rows with no `aria-live`
- the call-site role override

Reuse: `getLocalVue` only. The repeated patterns are specific to this component, so no shared helper. The sibling `GButton.test.ts` belongs to a later lane and is untouched.

Validation: 8 tests pass shuffled (seed `280101`, `NODE_OPTIONS=--no-webstorage`). Scoped ESLint and Prettier pass; full `vue-tsc --noEmit` passes.

Guidance: none.
