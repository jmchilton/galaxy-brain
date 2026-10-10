# InstanceForm

Selected originator: `client/src/components/ConfigTemplates/InstanceForm.test.ts`. Baseline **2 tests** → final **3 tests**.

Both tests repeated the same five-prop `shallowMount(InstanceForm as object, ...)` literal. It is now `mountInstanceForm(inputs)`, since `inputs` is the only prop that differs. The whole-component `as object` cast is gone. The one place the original data was outside the prop type, `inputs: null`, gets a single commented cast in the helper. `findComponent({ name: "LoadingSpan" })` becomes `findComponent(LoadingSpan)`. The submit selector and loading message are constants. `toBeTruthy`/`toBeFalsy` on booleans become `toBe(true)`/`toBe(false)`, the unused `async` is dropped, and `enableAutoUnmount(afterEach)` cleans up wrappers.

The loading case is now an `it.each` over `undefined` and `null`. Callers pass `undefined` (the `useConfigurationTesting` computeds are `FormEntry[] | undefined`), and the original `null` row is kept. The loading case now also checks that LoadingSpan receives the `loadingMessage` prop, which the original never asserted, though its name says it renders a loading message.

Preserved: LoadingSpan present and `#submit` absent for the null input; LoadingSpan absent, `#submit` present and its text equal to `"Submit the form!"` for the empty input list. Test data is unchanged: title, busy flag, loading message, submit title, and the empty `FormEntry[]`.

Reuse: `getLocalVue(true)` kept. The ConfigTemplates `test_fixtures.ts` templates feed template-driven forms, not this inputs-driven one. No other test mounts InstanceForm.

Validation: 3 tests pass shuffled (seed `290101`, `NODE_OPTIONS=--no-webstorage`). Scoped ESLint and Prettier pass; full client `vue-tsc --noEmit` passes without the component cast.

Guidance: none.
