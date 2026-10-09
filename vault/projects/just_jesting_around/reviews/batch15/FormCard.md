Reviewed `client/src/components/Form/FormCard.test.js`, 1 → 1 case.

The only scenario now contains its own mount and assertions, replacing shared wrapper state and one-use `beforeEach` setup. Fresh local plugins and automatic unmounting keep it isolated. Shallow mount is sufficient because the scenario reads parent-owned title, description, and legacy icon markup; no child integration was asserted originally.

Preservation: the exact original inputs `title`, `description`, and `icon-class`, title/description text equality, and icon class containment all remain. Removed the unnecessary async marker without changing execution.

Reuse: existing local Vue and cleanup helpers suffice. This small arrangement has no repeated domain data and no useful consumer for a new shared abstraction.

Guidance: existing scenario-local setup and shallow mount guidance covers the change. No README addition or marginal advice proposed.

Validation: all six assigned suites pass in shuffled order (seed `150033`): 28 cases, zero skips/failures, with `NODE_OPTIONS=--no-webstorage`. Evidence: `/private/tmp/batch15_components_tests.json`. Scoped ESLint passes with zero warnings and Prettier passes. The driver coordinates full client typechecking and the authoritative whole-batch run.
