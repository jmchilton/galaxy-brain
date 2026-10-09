Reviewed `client/src/components/DatasetInformation/DatasetError.test.ts` (originator), 3 → 3 cases.

Corrected the mount helper's spelling and replaced three positional values with named `hasDuplicateInputs`, `hasEmptyInputs`, and `userEmail` options. The registered user is configured in explicit fresh Pinia before mounting; existing `withPlugins` installs that instance and auto-unmount handles cleanup. Names now identify diagnostics, absent common problems/email field, and report submission.

Preserved exact tool ID, tool/job stderr, both ordered regex messages and their complete response fields, both common-problem flag pairs, the nonempty email input, all absent-field assertions, visible form and submit button before the click, and hidden form after successful report response. Two prior `find(...).toBeDefined()` assertions could pass for missing elements; `exists() === true` now verifies the original intended positive presence. Real mounting remains necessary for diagnostic children and form submission.

Reuse: existing registered-user, plugin, and MSW helpers suffice. Job regex messages are two short local arrangements; neighboring DatasetDetails has a different partial polling contract, so no shared job fixture is justified. The dataset handler retains `response.untyped` for its intentionally sparse endpoint response.

Validation: six affected suites pass in shuffled order (seed `130043`): 53 cases, zero skips/failures. Selected baseline: 27 cases across the five originators; the selector supporting baseline adds eight. Tag regex parameterization accounts for the 18 additional individually reported cases. Evidence: `/private/tmp/jest_readability_batch13_components_final.json`; supporting baseline `/private/tmp/jest_readability_batch13_selector_baseline.json`. Scoped ESLint passes with zero warnings and Prettier passes for all six files. Root performs full client typechecking and the authoritative whole-batch verification.

Guidance: existing readable scenarios, factory reuse, component integration, async settling, and cleanup guidance already covers these changes. No README addition or marginal advice proposed.
