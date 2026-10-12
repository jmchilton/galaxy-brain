# ResetPassword — readability batch 49

Originator: `lib/tool_shed/webapp/frontend/src/components/pages/ResetPassword.test.ts`.
Base: `e1f3ed5dce2da8ccd93324fd6b536db3269a8810`.
Worker commit: `ebc789af4c062fc5fede96c4e7c39a352959d26e`.

The two original scenarios and all three original assertions remain: the exact password/confirmation/token request body, the success-page navigation, and the expired-link alert text. Required inputs, form and alert now use `get`; missing controls fail immediately. The success scenario names both submission and navigation. API and router mocks share one hoisted definition and reset both calls and implementations before each test; each scenario explicitly supplies its own API outcome. Automatic unmount runs even after assertion failure. Inputs, response outcomes, and assertions remain inline; the two short arrangements do not justify a new local helper.

The Tool Shed has its own Vitest 3.2.7 configuration, Quasar global setup, semicolon-free formatting, and node_modules; no Galaxy client mount helpers or client dependency tree were substituted. Full mount preserves real form/input/button and ErrorBanner behavior. Existing isolated route-token and navigation mocks remain unchanged in meaning.

## Validation and coverage

- Own Tool Shed Vitest baseline: 2/2 cases passed.
- Baseline coverage: 2/2 cases passed, using the own Tool Shed runner and setup.
- Final coverage and shuffled order: 2/2 cases passed, seed 490101, maxWorkers=1, pinned Node 22.20.0.
- Exact normalized statement/function/branch source locations: 90 source files in both reports; no previously covered locations lost. ResetPassword.vue retains 53 covered statements, three covered functions and ten covered branch arms.
- Own Tool Shed ESLint and Prettier checks passed; Tool Shed `pnpm typecheck` passed. Final removal of an optional router helper changed no type-bearing behavior and own lint/format were rerun.
- Explicit canonical pre-commit checks passed; client-specific ESLint correctly skips this Tool Shed file, so its own ESLint was run separately. Git diff check passed.
- Existing unresolved `router-link` warnings appear in baseline and final; no test failures or unhandled errors.

Tool Shed lacks its matching coverage package; the client package's version 4.1.11 is incompatible with Vitest 3.2.7. Installed `@vitest/coverage-v8@3.2.7` and matching Vitest solely into `/private/tmp/readability49-toolshed-coverage`. A temporary coverage-only config imports the unchanged Tool Shed config and adds a provider alias; the runner remains Tool Shed's installed Vitest. No repository package or lockfile changed. Initial custom-provider resolution attempts failed and are not counted as validation.

Coverage command adds `--config=/private/tmp/readability49-reset-coverage.config.mjs --coverage --coverage.provider=custom --coverage.customProviderModule=/private/tmp/readability49-toolshed-coverage/node_modules/@vitest/coverage-v8/dist/index.js --coverage.reporter=json` to the own runner, with reportsDirectory selected per baseline/final. Logs: `/private/tmp/readability49-reset-{baseline,baseline-coverage,final-coverage}.log`; JSON `/private/tmp/readability49-reset-{baseline,final}-coverage/coverage-final.json`; location comparison `/private/tmp/readability49-reset-coverage-comparison.json`; typecheck `/private/tmp/readability49-reset-typecheck.log`; hooks `/private/tmp/readability49-reset-hooks.log`.

An optional attempt to use the existing Tool Shed memory router removed a baseline warning but lost one incidental compiled RouterLink slot branch; it was removed before commit. Final coverage exactly preserves the original boundary and all source locations. No coverage-only assertion or extra scenario was added.

## Guidance and reuse

Existing README guidance on meaningful required queries and visible scenario setup applies. Tool Shed's sibling ForgotPassword uses auto-unmount; this file now follows that convention. No shared helper, production edit, additional E2E test or README guidance is needed for two small form scenarios. The existing memory-router helper remains available for tests that exercise actual routing; this originator keeps its deliberately isolated token/navigation boundary. No supporting file or ledger changed, and no security findings.
