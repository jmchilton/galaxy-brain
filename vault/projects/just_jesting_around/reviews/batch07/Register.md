# Registration entry module review — iteration 07

Reviewed `client/src/entry/analysis/modules/Register.test.ts` against all client unit-testing guidance. Its one prop-forwarding case retains every original expected value: session CSRF token, OIDC enabled/preferred flags, mailing list address, server mail flag, registration warning, and terms URL. One `toMatchObject` assertion expresses that seven-field contract against a required `RegisterForm` child. This preserves the original partial prop checks while avoiding a sequence of unrelated scalar statements.

Configuration is arranged inline with the six configuration values actually asserted; the session token remains a scoped application-module double. The single-use mounting function, extra testing Pinia, router mock/redirect query, and unasserted welcome/local-account configuration were removed. The rebased Register component reads session/config state and forwards these props; it does not read a redirect query. Shallow mounting still isolates this forwarding contract from the registration form's own behavior. Vue setup is fresh, wrappers unmount automatically, and mock configuration resets after the case.

Reuse: existing config setters/resetters and `getLocalVue()` suffice. No shared mount helper is justified for a single small arrangement. Existing configuration factories contain broader state and would hide the exact forwarding inputs rather than improve this test.

Validation: the one case passes in `/private/tmp/jest_readability_batch07_forms_storage.json`; scoped ESLint 10 and Prettier pass. Missing guidance: no README or marginal-advice addition proposed; existing guidance already favors visible scenario inputs and inline single-use setup.
