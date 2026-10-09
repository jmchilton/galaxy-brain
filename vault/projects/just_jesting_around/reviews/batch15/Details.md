Reviewed `client/src/components/Toolshed/InstalledList/Details.test.js`, 1 → 1 case.

The single loading-to-details scenario keeps setup and outcome together, creates fresh local plugins, and automatically unmounts. `flushPromises()` settles the service promise instead of treating a Vue rendering tick as the API wait. A named hoisted service spy moves argument assertions out of the mock implementation and into the scenario, also verifying exactly one call.

Preservation: the original `tool_shed_url`, `name`, and `owner` inputs and service arguments remain unchanged. Exactly one loading child initially renders with the original loading message and no repository-details child; after loading, no loading child or alert renders and exactly one repository-details child appears. Shallow mount still isolates the parent and retains the original empty service response.

Reuse: `getLocalVue`, `enableAutoUnmount`, and `flushPromises` already supply the required infrastructure. Tool Shed service mocks in other suites exercise different methods and responses; sharing a service mock would add scenario switches without reducing meaningful setup. No new shared helper or supporting consumer is warranted.

Guidance: existing scenario naming, async settling, and external service mocking guidance applies. No README addition or marginal advice proposed.

Validation: all six assigned suites pass in shuffled order (seed `150033`): 28 cases, zero skips/failures, with `NODE_OPTIONS=--no-webstorage`. Evidence: `/private/tmp/batch15_components_tests.json`. Scoped ESLint passes with zero warnings and Prettier passes. The driver coordinates full client typechecking and the authoritative whole-batch run.
