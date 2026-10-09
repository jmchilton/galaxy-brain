Reviewed `client/src/components/Toolshed/SearchList/Repositories.test.js`, 1 → 2 cases.

Loading-to-results and empty-results behavior now have separate named scenarios. The service spy resets before each case and supplies the empty response through the external service boundary, replacing internal repository and magic-number pageState mutations. `flushPromises` settles service work, fresh local plugins isolate each mount, and wrappers auto-unmount. The results scenario also verifies exactly one request with the original search inputs and explicit pagination defaults.

Preservation: exact query `toolname`, scrolled false, toolshed URL `toolshedUrl`, both repository objects (name, owner, last_updated, times_downloaded), original loading text, exactly two ordered links `name_0` and `name_1`, and exact empty-results message remain. The empty scenario exercises the same completed/nonloading empty state using an actual resolved empty response; it additionally confirms zero links. Real GTable and GLink children stay mounted because rendered links are the original output contract.

Reuse: existing local Vue and async helpers suffice. The neighboring Details test uses a different service method and response shape; no useful common test-data or mount abstraction emerged. The two repository objects stay visible in this suite and no supporting consumers require a shared factory.

Guidance: existing external boundary mocking and independent scenario guidance covers this improvement. No README addition or marginal advice proposed.

Validation: all six assigned suites pass in shuffled order (seed `150033`): 28 cases, zero skips/failures, with `NODE_OPTIONS=--no-webstorage`. Evidence: `/private/tmp/batch15_components_tests.json`. Scoped ESLint passes with zero warnings and Prettier passes. The driver coordinates full client typechecking and the authoritative whole-batch run.
