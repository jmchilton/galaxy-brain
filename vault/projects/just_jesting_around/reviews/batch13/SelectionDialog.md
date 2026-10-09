Reviewed `client/src/components/SelectionDialog/SelectionDialog.test.js` (originator), 8 → 8 cases.

A short local mount helper gives each scenario its own wrapper and fresh plugins; auto-unmount cleans the real modal/table subtree. Removed an unused callback prop that the component does not accept. The cancel click is awaited and names describe rendered search, loading-to-options transition, and public emissions. Existence booleans now use exact boolean assertions; cancellation is checked as one emission.

Preserved initial spinner presence/table absence and both post-options states, search header, cancellation absence/presence, partial/all selected select-all checked and indeterminate flags, mixed folder row flags, checkbox-change emission and ID 1, and exactly one selectable-row click emission. All original item IDs, labels, leaf flags, and selection states remain explicit. The search header renders synchronously; its unused `nextTick` was removed without changing the assertion.

Real mounting remains necessary for SelectionDialog/GTable checkbox and row interaction. Other selection dialogs have specialized dataset providers; sharing this minimal modal arrangement would add indirection without meaningful domain reuse.

Validation: six affected suites pass in shuffled order (seed `130043`): 53 cases, zero skips/failures. Selected baseline: 27 cases across the five originators; the selector supporting baseline adds eight. Tag regex parameterization accounts for the 18 additional individually reported cases. Evidence: `/private/tmp/jest_readability_batch13_components_final.json`; supporting baseline `/private/tmp/jest_readability_batch13_selector_baseline.json`. Scoped ESLint passes with zero warnings and Prettier passes for all six files. Root performs full client typechecking and the authoritative whole-batch verification.

Guidance: existing readable scenarios, factory reuse, component integration, async settling, and cleanup guidance already covers these changes. No README addition or marginal advice proposed.
