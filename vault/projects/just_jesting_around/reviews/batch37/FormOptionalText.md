# FormOptionalText

Selected originator: `client/src/components/Form/Elements/FormOptionalText.test.js`. Baseline **2 tests** → final **3 tests**.

The first case mixed a render check with an emission walk. It is now two cases: "switches on and shows an existing value", and "emits null when switched off and an empty string when switched back on". The walk is kept in order on one wrapper. A fresh mount can't reproduce its second step, because `currentStatus` stays true while the parent's `value` is non-null. So the switch-on emission at index 1 depends on the switch-off that came before it. The ambiguous `wrapper.find("input")` became `input[type='checkbox']`, held in `SELECTORS` next to the text input. The needless `async`/`await` around `mount` and the one-letter variables are gone. `toEqual(null)` and `toEqual(true)` became `toBeNull()` and `toBe(true)`.

Preserved:
- With a value, the switch is checked and the text input holds the value.
- Switch off emits `null` (emission 0), then switch on emits `""` (emission 1).
- With a `null` value the switch starts unchecked, and it is checked after `setProps({ value: "" })`.

Added: in the null case, the text input is absent while the switch is off and present once it is on, which covers the `v-if` on FormText.

Reuse: `emittedArg` and `getLocalVue` from `@tests/vitest/helpers`. No new helper.

Validation: 3 tests pass, shuffled (seed `370101`). ESLint, Prettier and full client `vue-tsc --noEmit` pass.

Guidance: none.
