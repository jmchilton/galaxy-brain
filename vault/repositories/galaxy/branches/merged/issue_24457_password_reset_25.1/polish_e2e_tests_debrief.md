# E2E test polish

Reviewed and retained the two complete Selenium password-change flows, which already use shared navigation helpers, stable DOM hooks, state-based waits, and four screenshots; no further code changes were justified.

Read `GX_PROCESS_POLISH_E2E_TESTS.md` and the E2E writing and Smart Components notes. Reviewed the final tests, navigation targets, reusable password helpers, existing login helpers, and snapshot implementation against release 25.1.

- All CSS/XPath selectors are centralized in `client/src/utils/navigation/navigation.yml`. The new form and input `data-description` attributes provide stable targets without depending on layout or Bootstrap styling. Existing login controls use the navigation component tree.
- Repeated password input/save operations are shared through `change_password`; emailed-link save delegates through `reset_password_from_link`. The reset request uses `request_password_reset`, and the common session assertions are factored into the test class. Registration, logout, ordinary login, and API identity checks reuse existing helpers.
- The expired login deliberately submits the navigation component directly before waiting for and accepting the native expiration alert. The normal `submit_login` helper waits for logged-in state, which this intermediate expired-account step cannot produce. The lower-level `fill_login_and_submit` also takes a post-submit debug snapshot; that browser/DOM work can overlap the native alert. Keeping the short direct submit sequence avoids introducing that interaction and a special-case helper for one caller.
- No new sleeps are present. Waits cover form visibility, the real native alert, disappearance of the completed form, and authenticated masthead state. The token-flow current-password absence assertion follows visible password fields.
- The new component coverage captures `password_reset_form`, `password_reset_saved`, `password_expired_form`, and `password_expired_saved`. Capture calls and existing artifacts are present; the coordinating agent will separately regenerate/inspect the final screenshots.
- No client refactor is needed to improve these tests. The target is the oldest supported release, `release_25.1`, and the fix already adds only the necessary stable DOM hooks.

Forward-merge note: a separate 26.2 FAQ branch has a `request_password_reset` helper for the newer dedicated reset page. When merging forward, reconcile that helper with the actual newer UI and retain the password-save/session assertions. Do not add speculative cross-version conditionals to this 25.1 implementation.

The polish step made no source or test changes, so existing successful baseline, red-regression, fixed-client Selenium, and Jest evidence remains applicable. No additional test run was required for this inspection-only step. The baseline-first commit remains intact.
