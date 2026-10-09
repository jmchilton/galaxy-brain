# API client construction

Selected originator: `client/packages/api-client/src/client.test.ts`.

Reviewed the project instructions, client guidance, package configuration, client implementation, and iteration-4 transport integration suite. This test intentionally isolates the `openapi-fetch` constructor; integration tests continue exercising the real transport. No helper is shared across those different boundaries.

All four cases and nine assertion statements remain: default origin, custom origin, removal of the trailing slash, and returned client plus its five HTTP methods. Exact constructor options retain `headers: {}` and the original expected base URLs. Scenario inputs are inline; unused client variables and narrated comments are removed. The constructor return fixture uses `vi.hoisted` to make its mocked-module initialization explicit.

The default-origin case uses a scoped `window` global stub and unconditional `vi.unstubAllGlobals` teardown. This removes deletion/assignment of jsdom's location and both `any` casts. The minimal browser stub contains only the origin read by this function. It is restored even when an assertion fails.

No production edits, package configuration changes, or new README guidance are needed. Browser-environment details are a local implementation concern, not a broadly useful new readability principle.

Validation: selected suite passes all four cases under the package's own Vitest config. All nine package cases across construction and real-transport integration pass together. Explicit `eslint --no-ignore` and formatting pass for this file, which the ordinary client lint command otherwise skips. The whole package type check passes with the recorded `--moduleResolution Bundler --skipLibCheck` override for its existing legacy configuration. Evidence: `/private/tmp/batch05_api_client_final.log`, `/private/tmp/batch05_api_package_final.log`, `/private/tmp/batch05_events_lint_final.log`.
