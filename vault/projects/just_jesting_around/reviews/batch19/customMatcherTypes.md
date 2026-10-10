# Custom matcher types

Shared test typing for the `toBeLocalized` and `toBeLocalizationOf` matchers, which `client/tests/vitest/helpers.js` registers with `expect.extend`.

Before: two declaration files fought each other.
- `client/tests/vitest/matchers.d.ts` had no import or export, so it was a script, and its `declare module "vitest"` was ambient rather than an augmentation. The matcher interfaces never merged into vitest's `Assertion`.
- `client/types/vitest-setup.d.ts` added the same matcher interfaces, plus `export const describe/it/expect/... : typeof import("vitest/dist/index.js")[...]` redeclarations left over from non-globals mode. With that file present, a module-form augmentation made `expect` resolve to `any`. Every test would lose its types without a single type error. It also failed scoped ESLint on its `import()` type annotations.
- Typed tests worked around this with `(expect(x) as any).toBeLocalizationOf(...)`.

After: `client/types/vitest-setup.d.ts` is one module (`import "vitest"`) that augments `Assertion` and `AsymmetricMatchersContaining` with the two matchers. It has a scoped ESLint disable, because the empty merging interfaces and `T = any` must match vitest's declaration. `tests/vitest/matchers.d.ts` is deleted (its deletion is staged).

Consumers (cast removed):
- `client/src/components/Common/ExportForm.test.ts` (originator)
- `client/src/entry/analysis/modules/ResetPassword.test.ts`
- `client/src/components/Register/RegisterForm.test.ts`, including the commented-out case whose TODO pointed at the old ExportForm note

No other `.ts` test used these matchers. `.js` tests aren't type-checked and need nothing.

Evidence: a temporary canary file run through full `vue-tsc --noEmit` produced exactly the expected errors. Assigning `expect` or `describe` to `number` failed, an unknown matcher failed, and `toBeLocalizationOf(3)` failed. The valid matcher calls, including the asymmetric `expect.toBeLocalizationOf("x")`, compiled. Without the canary, `vue-tsc` passes clean.
