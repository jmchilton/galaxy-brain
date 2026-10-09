# login-routes: accepted

Originator: `client/src/entry/analysis/routes/login-routes.test.ts`. Cases: **8 → 8**, all passing, no skips.

Two named tables express the login/registration route combinations for anonymous page matching and signed-in pending destinations. The helper still drives the actual memory router and production route definitions. It now awaits `router.push()` directly rather than swallowing any rejected navigation with a catch-all. All baseline route cases and query values remain.

Preserved assertions cover anonymous login path, one matched route and a component; anonymous login redirect query; signed-in destination with its query string; home fallback without a destination and for the existing external-URL input; signed-in registration destination; anonymous registration path and matched route; and password-reset path, email query, and route match. Registration now also requires a matched component.

The small mocked Galaxy-user boundary remains local in this and the direct guard suite; it deliberately models only the user ID consumed by the guard. A shared helper would save one assignment per suite while coupling the helper to a pre-mocked module, and a complete GalaxyApp factory would add unrelated setup. Real route wiring and direct guard calls remain complementary. Existing guidance covers named combinations and awaited promises; no added advice.

Validation: baseline JSON `/private/tmp/jest_readability_batch11_stores_baseline.json` (40 passing across these five suites); final shuffled JSON `/private/tmp/jest_readability_batch11_stores_final.json` (42 passing, seed 110019). Scoped ESLint and Prettier checks pass. Full client typecheck and independent batch review are owned by the driver. No production changes.
