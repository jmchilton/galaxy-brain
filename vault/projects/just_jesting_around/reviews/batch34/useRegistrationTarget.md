# useRegistrationTarget

Selected originator: `client/src/composables/useRegistrationTarget.test.ts`. Baseline **4 tests** → final **5**. "offers nothing where no one can register" held two configurations, and each now has its own case.

Not vacuous under the old helper. The composable reads only `config.value?.…` in a `computed`, which the old `{ value }` shape satisfied. It is called directly, with no component, as the README allows for composables that only compute. The suite was already close to the README, so the change is small.

What changed:
- The two empty outcomes are now named cases:
  - "local accounts are off and no OIDC provider registers" (`oidc: { plain: {} }`)
  - "the configuration sets neither local accounts nor OIDC" (`{}`, the missing-`oidc` path)
- `LOCAL_REGISTRATION_FORM` names the `{ external: false, url: "/register/start" }` result that two cases share. That result is what local accounts and several providers have in common.

Preserved: all five configurations and their exact expected targets, unchanged. These are the local form with local accounts on, `undefined` for both empty configurations, Okta's endpoint as external for a single provider, and the local form for Okta plus Keycloak.

Reuse: `setupMockConfig` (fixed in this batch). Its whole-config replacement matters here. `@/composables/__mocks__/config`'s `setMockConfig` merges into defaults that include `allow_local_account_creation: true`, so the `{}` case would resolve to the local form under it. No new helper.

Validation: 5 tests pass shuffled (seed `340101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and `vue-tsc --noEmit` pass.

Guidance: see the batch report on `setupMockConfig` and `setMockConfig` semantics.
