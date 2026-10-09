# Iteration11: FormElement

Originator: `client/src/components/Form/FormElement.test.js`.

Replaced the mutable beforeEach wrapper with a short mountElement(props) factory using fresh getLocalVue globals and enableAutoUnmount. Split disabled-field visibility from collapse/restore interactions; renamed generic test labels to the behaviors exercised. Full mounting remains necessary for the real FormNumberList → FormNumber counts and FormText/FormHidden selection checks.

Preserved help/error/title text, clearing the error, disabled 0→1 field counts, collapse/default input payloads and input ID, both custom button label presence/absence transitions, title-only field replacement, workflow data columns, multiple-integer 2→1 number counts, required/optional/empty-required indicators, sanitizer argument/profile and rendered bold HTML. The collapse sequence remains together because the second emission depends on the first.

Reuse: getLocalVue, emittedArg and enableAutoUnmount are existing helpers. The mount factory is local because the props describe this component and no other consumer needs this arrangement. Existing readable-scenarios guidance already captures splitting independent behavior while preserving transitions; no README or marginal advice proposed.

Validation: baseline 9 passed cases; final 10 passed cases in shuffled order (seed110047). The six-originator run increased from50 to74 passed cases with no skips/failures. Reports: `/private/tmp/jest_readability_batch11_components_baseline.json` and `/private/tmp/jest_readability_batch11_components_final.json`. Scoped ESLint and Prettier run on all six owned files; root driver supplies final aggregate typecheck evidence.

Supporting source files: none. Shared factories/helpers changed: none. README/inventory/Git changes: none by this reviewer.
