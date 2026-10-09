# app review — iteration 06

Selected originator: `client/src/app/app.test.js`.

Baseline and final: 5 cases. All original defaults remain checked: options/config/user objects; localization equality with `window._l`; root `/`; patchExisting=true; arbitrary attributes absent from a replacement app; allow_user_deletion=false, allow_local_account_creation=true, wiki URL, null FTP site; non-admin user. The initial check accidentally tested the config type a second time while checking user truthiness; it now tests the user object itself. Object checks retain explicit truthiness so `typeof null === "object"` cannot weaken the original non-null contract. A new identity assertion checks the registered singleton is the app just constructed. Source assertion statements increase from 15 to 21.

Names describe constructor behavior, including correcting the inverted claim that prior attributes are patched into a new app. The exported `setupTestGalaxy` had no imports or other consumers in source searches; its one-use construction is now inline in setup. Tests keep the app local while using the real setter/getter/constructor. Existing bootstrapped test data and `suppressDebugConsole` are reused.

The debug spy is scoped per case and restored. Global singleton and localization properties are stubbed before construction and restored afterwards; the previous session locale is also restored because the real constructor changes it. Setup is deliberately local: no concrete second consumer needs a new GalaxyApp factory, and several tests elsewhere replace the app module rather than construct this instance.

Validation: app and selectedItems suites pass together (16 cases), scoped ESLint and Prettier pass. No production changes, supporting suites, README addition, or marginal advice are needed. Root performs final combined validation and independent review.
