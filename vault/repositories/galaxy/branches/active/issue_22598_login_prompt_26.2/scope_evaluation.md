# Scope evaluation: issue_22598_login_prompt_26.2

**Recommendation: modest expansion.** Keep the anonymous Changelog/Contents login prompts and the vetted `/login?redirect=` path, and make the new return path general: the masthead Login button (`ShedToolbar.vue`) and the "Already registered? Login." link in `RegisterPage.vue` should pass the current route as `?redirect=`, so any login returns the user to where they were. Also drop the dead `returnUrl: null` store state the new `returnTo` replaces. Don't pull in #24167's anonymous browsing; that stays on `dev`.

## Possible Decompositions

About 200 changed lines, roughly 90 of them tests. Not a recommendation:

1. **Refactor:** `7f89007bf1c` renders the hgweb explore links from one model. Behavior unchanged.
2. **Login return path:** `6f9303d1a0f`, `3cec8532a55`, `80642c0ed01`, `4b8a54c195d` (`safeReturnPath`, store/route/LoginPage/LoginForm wiring, E2E). Also the place for the toolbar/register expansion.
3. **Anonymous prompts:** `017c42927f1`. Depends on 2.
4. **Stale-user fix:** `64f0b66df55` (clears cached user when the session check fails). Independent bug fix; could land first or separately.

## Scopes considered

### A. As implemented

Anonymous users see "Log in to view changelog/browse contents" linking to `/login?redirect=<hgweb path>`. Login honors a same-origin `redirect`. Also clears a stale cached user when `/api/users/current` fails.

| Pros | Cons |
|---|---|
| <ul><li>Fixes the reported symptom with no server load</li><li>Open-redirect handling is tested hard</li><li>Small, release-safe</li></ul> | <ul><li>`?redirect` is supported but only two links use it, so a general feature ships half-used</li><li>Masthead Login still drops users on `/login_success`</li><li>Dead `returnUrl` state left next to the new mechanism</li></ul> |

### B. Modest expansion (recommended)

A plus: the toolbar Login button and RegisterPage's login link carry `redirect=<current route fullPath>`, and the unused `returnUrl` store field goes away.

| Pros | Cons |
|---|---|
| <ul><li>Routes all login entry points through the new abstraction, which reviewers tend to want</li><li>A few lines, reusing the same `safeReturnPath`</li><li>Removes a confusing second "return URL" concept</li></ul> | <ul><li>Small extra diff on a release branch</li><li>Toolbar must skip `redirect` when already on `/login` or `/register`</li><li>Slightly more forward-merge surface</li></ul> |

<details>
Have the toolbar compute `to` from `useRoute().fullPath`, skipping the auth pages. `safeReturnPath` already accepts in-app paths. Add one vitest case for the toolbar href. Registration could also go back to the original page after signup, but that's a different flow; leave it out unless it's trivial.
</details>

### C. Further expansion: route guard / redirect on 401

Have a router guard or API 401 handler send anonymous users to `/login?redirect=` whenever a page needs auth.

| Pros | Cons |
|---|---|
| <ul><li>Most general version</li></ul> | <ul><li>hgweb views aren't SPA routes, so this wouldn't cover the issue's case</li><li>Few shed SPA pages need auth today</li><li>Behavior change too broad for 26.2</li></ul> |

### D. Backport anonymous browsing (#24167)

| Pros | Cons |
|---|---|
| <ul><li>Fixes the issue outright</li></ul> | <ul><li>Adds the server load the gating exists to avoid</li><li>mvdbeek asked for it on `dev`; this stopgap was his suggestion</li></ul> |

### E. Contraction: prompts only, no `?redirect`

Show the login prompts linking to plain `/login`, and drop `safeReturnPath` and the redirect wiring.

| Pros | Cons |
|---|---|
| <ul><li>Removes the open-redirect risk surface entirely</li><li>Smaller diff</li></ul> | <ul><li>User still has to find their way back to hgweb after login, which is a worse stopgap</li><li>Throws away a tested, reusable piece that dev can also use (see index notes)</li></ul> |

### F. Contraction: split out `64f0b66df55`

The stale cached-user fix is a related bug in the touched store (the prompt depends on `isLoggedIn` being right), so keep it in. Splitting it out is listed only as a decomposition option.
