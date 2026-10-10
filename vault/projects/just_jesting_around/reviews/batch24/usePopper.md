# usePopper

Selected originator: `client/src/components/Popper/usePopper.test.js`. Baseline and final: **3 tests**.

**Vacuous assertion replaced.** The trigger-`none` case destructured `const { visible } = wrapper.vm`. The component proxy unwraps the ref, so `visible` was a plain `false` copied before the click, and the post-click `expect(visible).toBe(false)` could never fail. Mounting the original with `trigger: "click"` still passed all three tests. The case now re-reads `wrapper.vm.visible` before and after the click. With `"click"` substituted it fails (the toggle opens the popper), so it now checks that `none` ignores clicks.

`mountUsePopper(trigger)` creates its own reference and popper elements (attached to the document, as before) and returns them with the wrapper. That replaces the `let` elements assigned in `beforeEach` and captured by a closure. Setup returns `usePopper(...)` directly. The creation-options assertion is unchanged, written more compactly. The unmount case reads the instance through `vi.mocked(createPopper)`. Test names describe behavior instead of "should …". Cleanup (`document.body` reset, `vi.clearAllMocks`) is unchanged.

Preserved: exact `createPopper` arguments (both elements, placement, offset modifier, absolute strategy); `destroy` on unmount; hidden before and after a click with trigger `none`.

Reuse: none. `Popper.test.js` repeats the two-line `@popperjs/core` mock, which is too small to share.

Validation: 3 tests pass shuffled (seed `240101`); scoped ESLint and Prettier pass; full `vue-tsc --noEmit` passes.

Guidance: none. No other client suite destructures `wrapper.vm`, so the snapshot trap lacks the recurrence a README line needs.
