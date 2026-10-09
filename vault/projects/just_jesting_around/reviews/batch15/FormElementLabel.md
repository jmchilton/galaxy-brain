Reviewed `client/src/components/Form/FormElementLabel.test.js`, 6 → 6 cases.

Names now describe the actual asterisk behavior; the old check-icon name did not match its assertions or the component. The local `mountLabel` helper uses the actual component name, fresh shared local plugins, and automatic unmounting. Removed unused icon stub and redundant localization override; the shared localization plugin renders the original help text.

Preservation: title `Form Label`, help `Helpful info`, required/condition true with `Check Label` and exact `*`, required true/condition false with `Asterisk Label` and danger `*`/`required`, `No Symbol` with required false, and the exact default-slot markup and `Hello Slot` all remain. The original absent icon check remains. The ineffective absent `span.text-danger` check becomes checks for the actual asterisk and danger `small` selectors, and rendered `No Symbol` confirms the scenario mounted.

Reuse: the existing shared local Vue configuration handles localization. Inputs and tiny slot fixture stay local; FormCard's markup and props are distinct and do not justify a shared form mount abstraction.

Guidance: this is an application of existing readable scenario and behavior guidance, with no new general rule worth saving. No README addition or marginal advice proposed.

Validation: all six assigned suites pass in shuffled order (seed `150033`): 28 cases, zero skips/failures, with `NODE_OPTIONS=--no-webstorage`. Evidence: `/private/tmp/batch15_components_tests.json`. Scoped ESLint passes with zero warnings and Prettier passes. The driver coordinates full client typechecking and the authoritative whole-batch run.
