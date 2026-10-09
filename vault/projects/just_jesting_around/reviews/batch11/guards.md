# guards: accepted

Originator: `client/src/router/guards.test.ts`. Cases: **6 → 7**, all passing, no skips.

The existing absolute and protocol-relative URL variations are separate named table cases. Test names describe route entry/redirect outcomes rather than claiming that this pure guard renders a form. `runGuard()` creates one typed normalized route instead of casting an incomplete route object; the query under test stays visible at each call.

All original inputs and expectations remain: anonymous ID returns undefined, absent user returns undefined, signed-in missing destination returns root, signed-in pending destination preserves its query string, each existing external-URL variation returns root, and login-entry destination returns root. The extra case is solely the split second URL assertion; no regression input was removed or loosened.

The simple Galaxy mock boundary remains local, as described in [the login-route review](login-routes.md). No shared utility or supporting migration is useful. Existing guidance covers names and combinations; no new advice proposed.

Validation: baseline JSON `/private/tmp/jest_readability_batch11_stores_baseline.json` (40 passing across these five suites); final shuffled JSON `/private/tmp/jest_readability_batch11_stores_final.json` (42 passing, seed 110019). Scoped ESLint and Prettier checks pass. Full client typecheck and independent batch review are owned by the driver. No production changes.
