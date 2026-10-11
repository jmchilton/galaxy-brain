# FormNumberList

Selected originator: `client/src/components/Form/Elements/FormNumberList.test.ts`. Baseline **5 tests** → final **5 tests**.

The suite was already small and focused. `mountList(value: unknown)` is now `mountFormNumberList(value: number[] | null)`. It mounts with Vue Test Utils v2 options (`props`, `global: localVue`) instead of the adapter-translated `propsData`/`localVue`, and the `as object` cast is gone because the typed value type-checks. The three selectors live in `SELECTORS`. `inputValues(wrapper)` returns every input's value, and `lastEmittedValue(wrapper)` names the repeated `emitted("input")!.at(-1)`. `enableAutoUnmount(afterEach)` was added, and arrange/act/assert are separated.

Every original assertion survives. Two inputs `"1"`/`"2"` are now one exact `inputValues` check, so a third input would fail it too. Null keeps one FormNumber and the disabled remove button, and adds an empty input value (new). Add + set emits `[[1, 3]]`. Remove emits `[[2]]` and leaves one FormNumber. It also checks the remaining input is `"2"` (new), which fails if the wrong row is removed. Clearing emits `[null]`. The empty-field case's name now says the field can't be removed, as its assertion checks.

Reuse: `getLocalVue`, as before. No helper fits beyond the file.

Validation: 5 tests pass shuffled (seed `450101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and full client vue-tsc pass. Per-file coverage is identical at base and tip.

Guidance: none.
