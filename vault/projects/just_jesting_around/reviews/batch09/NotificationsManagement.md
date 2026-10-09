# NotificationsManagement

Reviewed `client/src/components/admin/Notifications/NotificationsManagement.test.ts`: **2 → 2 cases**.

The enabled and disabled notification scenarios are named `it.each` rows. A boolean mount argument replaces an unconstrained `any` configuration object. The sparse configuration response uses the documented `response.untyped(HttpResponse.json(...))` path while retaining the real MSW request, configuration composable, store load, shallow mount, and `stubActions: false`. Fresh local plugins and automatic unmount isolate each scenario.

Retained contracts: both `#send-notification-button` and `#create-broadcast-button` exist when notification support is enabled, and both are absent when disabled. The two independently executed rows have the same configuration flag values and assertions as the original tests.

Reuse: retains `getLocalVue` and `useServerMock`; no new helper beyond the existing local mount helper and no supporting migration. The generic store-test `setupTestPinia` uses real Pinia and would not preserve this component's explicit testing-Pinia action configuration. A new mount abstraction for this short setup would add indirection.

Guidance decision: existing named-combination and sparse OpenAPI response guidance applies directly. No missing best practice or worthwhile deferred abstraction was found.

Validation: shuffled affected component group **13/13**, seed **90117**; this suite **2/2**. All group files pass zero-warning ESLint and Prettier. Evidence: `/private/tmp/jest_readability_batch09_components_final.json`, `/private/tmp/jest_readability_batch09_components_lint.log`, `/private/tmp/jest_readability_batch09_components_prettier.log`. Root owns the final full-client typecheck and independent review.
