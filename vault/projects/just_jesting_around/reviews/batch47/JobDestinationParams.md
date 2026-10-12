# JobDestinationParams readability review — batch 47

Implemented complete row comparisons, explicit user scenarios, existing fixture typing, and native Vue Test Utils v2 plugin setup. No shared helper or production files changed. The driver completed independent review and canonical-checkout validation; coverage is retained across 187 source files.

- Originator: `client/src/components/JobDestinationParams/JobDestinationParams.test.ts`
- Worker checkout: `/private/tmp/galaxy-readability47-worker`, starting at `e1570742723b0ea164652d6d40f417a53bf4de27`
- Commit: `29e9619786df8f2e19c28f9a1cdb46a6462aca71`
- Cases: 1 before; 3 after; no skipped cases.
- Eligibility: ledger entry had no `iterated`, `storified`, `storybook_play`, or `real_api_calls` field at selection.
- Supporting test files: none.

## Findings and changes

The original row loop stopped at `responseKeys.length - 1`, leaving the final `require_container` row unchecked. Boolean expressions hid the compared values in failure output, and independent key-membership checks permitted repeated keys to satisfy the test while another key was missing.

The admin case now compares the complete matrix of rendered cell text with every fixture entry, using `value ?? ""` for the expected display of null. Exact matrix equality verifies titles, values, row count, order, and two cells per row, including the final `require_container`/`true` row and the `docker_set_user`/blank row. A positive fixture length check remains inside the test rather than running during suite collection.

The local mount helper now accepts the visible user scenario. It seeds `useUserStore(pinia)` before mounting, uses `withPlugins(localVue, pinia)` in `global`, and mounts the actual component without `as object`. Two focused cases check that a registered non-admin and a visitor with no loaded user see neither the parameters table nor its heading. The null-user case preserves the conditional-render path previously exercised implicitly while the original test changed the user after mounting.

The existing imported JSON fixture is checked with `satisfies JobDestinationParams` from `@/api/jobs`, preserving its precise imported shape instead of asserting a hand-written dictionary type. `enableAutoUnmount(afterEach)` unmounts all three wrappers, including when an assertion fails.

## Assertion mapping

| Original check | Replacement and effect |
| --- | --- |
| `responseKeys.length > 0` at describe time | `expect(expectedParameters.length).toBeGreaterThan(0)` inside the admin case; preserves the non-empty-fixture guard with useful diagnostics. |
| Parameters table exists | `wrapper.get("#destination_parameters")` fails immediately if the required table is absent. |
| Number of rows equals number of response keys | Full rendered-matrix equality requires exactly one row for every expected fixture entry. |
| Each checked row's title is a response key | Full matrix equality checks every expected title once, with its paired value; also rejects duplicate/missing titles and checks the formerly skipped final title. |
| Non-empty rendered values equal their fixture values | Full matrix equality compares actual text directly with each non-null fixture value, including strings such as `"false"` and `"true"`. |
| Empty rendered values correspond to fixture null | The fixture's `docker_set_user: null` must render exactly `""`; every other current fixture value must render its exact non-empty string. |
| Final row had no key/value assertion | Exact final expected pair is `['require_container', 'true']`. |
| Initial null user implicitly rendered the hidden branch | A named null-user case asserts the table and heading are absent. Added a separate registered non-admin case for the explicit false-admin condition. |

## Existing abstractions reused

- `getFakeRegisteredUser` for both registered-user scenarios.
- `getLocalVue` and `withPlugins` for existing global defaults and replacement of the default Pinia with the per-test instance.
- `useServerMock` and the existing destination-parameter JSON fixture for the actual API-backed store path.
- The existing API `JobDestinationParams` type and `RegisteredUser` type.

The matrix comparison is small and specific to this test. No concrete second consumer needs a new shared table-assertion abstraction, so none was introduced. No supporting tests were edited.

## Validation

- Shuffled targeted Vitest run with seed `470101`: 1 file passed, 3 cases passed, exit 0, no unhandled errors.
- Coverage JSON: `/private/tmp/readability47-job-final-coverage/coverage-final.json`. Parent baseline: `/private/tmp/readability47-baseline-coverage/coverage-final.json`.
- Component statement/function/branch hits remain 8/3/3. A path-normalized comparison across `client/src/` found no previously covered statement, function, or branch becoming uncovered. Parent will repeat coverage in the canonical lane checkout to avoid incidental workspace-package import timing differences.
- Targeted ESLint and Prettier check passed.
- All applicable pre-commit checks passed using the explicit config `/Users/jxc755/projects/repositories/galaxy/.pre-commit-config.yaml.sample`. The disposable worktree's installed hook contains a checkout-relative path that is wrong under `/private/tmp`; after the explicit checks passed, the commit used `-c core.hooksPath=/dev/null` as authorized by the driver.
- Used pinned Node `22.20.0` and `VITE_CONFIG_NATIVE_IGNORE_WARNING=true`. Omitted `NODE_OPTIONS=--no-webstorage` because this pinned runtime rejects it. Test execution required permission to write the symlinked dependency directory's Vite cache.
- Driver owns full type checking, independent review, combined validation, push, and ledger changes.

## Guidance and follow-ups

The README's local Vue examples and mount-wrapper factory still use VTU v1 options (`localVue`, `propsData`, top-level `pinia`), while `getLocalVue()` already returns a VTU v2 `global` object. Its helper implementation also documents `withPlugins`, but the README does not demonstrate it. This originator's top-level `pinia` and `as object` illustrate the resulting mismatch. Consider replacing those existing examples with `props` and `global: withPlugins(localVue, pinia)`; this is a correction to current examples, not a request for new general testing guidance.

No production behavior issue was identified. The known polling-unmount marginal advice has no new polling example here, so this review does not provide evidence to promote it. No other README guidance or marginal advice is proposed.
