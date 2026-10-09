# Login

Reviewed `client/src/entry/analysis/modules/Login.test.ts`: **2 → 2 cases**.

The test names now describe forwarding login configuration, redirect, and CSRF data, or password reset query values. A typed `LocationQuery` replaces the broad route-query `object` type. Existing config mocks reset before scenario setup, each mount uses fresh local plugins, and automatic unmount disposes the component. The route composable mock and shallow child boundary remain.

Retained contracts: the login child retains `id="login-index"` and the same eight forwarded values: account creation, OIDC, redirect, registration warning, CSRF token, welcome display, terms URL, and welcome URL. The reset child retains `id="change-password"` and the same four forwarded values: token, expired user, message text, and message variant. Assertions target the typed child component props, so boolean props are checked as booleans instead of their stub-attribute serialization; both original child IDs are explicitly asserted.

Reuse: retains `getLocalVue`, `setMockConfig`, and testing Pinia, and adopts the existing `resetMockConfig`. A shared Login mount or route-query helper lacks another concrete consumer and would obscure this small fixture. No supporting suite changes.

Guidance decision: the existing scenario naming, input visibility, module mocks, and shallow component guidance is sufficient. Stub serialization details do not justify another generic best-practice paragraph.

Validation: shuffled affected component group **13/13**, seed **90117**; this suite **2/2**. All group files pass zero-warning ESLint and Prettier. Evidence: `/private/tmp/jest_readability_batch09_components_final.json`, `/private/tmp/jest_readability_batch09_components_lint.log`, `/private/tmp/jest_readability_batch09_components_prettier.log`. Root owns the final full-client typecheck and independent review.
