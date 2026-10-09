Reviewed `client/src/components/Form/Elements/FormNumber.test.js`, 9 → 26 cases.

Replaced mutable range setup, internal loops, and asynchronous wrappers around synchronous mounting/selection with named `it.each` rows. A small local mount helper shallow-mounts unrelated presentation children while rendering real rows, columns, inputs and alerts. Automatic unmount includes the precision cases, which previously leaked their wrappers. The original precision helper was async but never awaited by its loop; the new synchronous assertions check both rendered `step` attributes, replacing direct `wrapper.vm.step` access and ensuring the owning case observes assertion failures.

Preservation: float/integer value `1`; every original bounds combination with value `50` (no bounds, min 1, min 1/max 100, min 0/max 100, min 0/max -100); all six out-of-range inputs `1`, `0`, `-1`, `Number.MIN_VALUE`, `110`, `Number.MAX_VALUE` with min 10/max 100 and both alert existence/message checks; the bounded integer decimal-warning case; unbounded empty integer/float decimal-key prevention, unbounded minus allowance, bounded min 0/max 100 minus prevention; and all eight precision inputs `undefined`, empty string, `0`, `0.5`, `0.55`, `0.555`, `0.5555`, `25e-100` with their original expected numeric step values represented as DOM strings. More reported cases expose existing combinations independently; no original input or transition was discarded.

Reuse: fresh shared `getLocalVue` configuration; generic shared form wrappers would obscure these component-specific real input and alert boundaries. No supporting consumer edit needed.

Guidance: the existing await-operation and test-through-template guidance already captures the precision correction. No new README rule or marginal advice proposed.

Validation: all four owned suites pass 93/93 cases, zero failures or skips, shuffled with seed `160071` and `NODE_OPTIONS=--no-webstorage`; evidence is `/private/tmp/batch16_forms_tests.json`. Scoped ESLint passes with zero warnings and Prettier passes; the driver coordinates full client typechecking and final batch checks.
