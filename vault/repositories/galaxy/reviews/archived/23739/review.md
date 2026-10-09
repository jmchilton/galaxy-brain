# galaxy#23739 — [26.1] Fix history initialization failure handling and retries

https://github.com/galaxyproject/galaxy/pull/23739 · mvdbeek · head `9a746e40ea4` · base `release_26.1` (merge-base `7c3e430b465`) · reviewed 2026-09-27

## Summary

Small, targeted fix (4 files, +89/-35) for Sentry GALAXY-MAIN-4KSCZZZ0018YS / 0019EM:

- `userStore.loadUser` — replaces the `new Promise` + async IIFE wrapper with a plain async IIFE + `.catch`, and clears the cached `loadPromise` on failure (guarded by `loadPromise === promise` so a stale failure can't clear a newer `refreshUser` promise). Successes stay cached; concurrent callers still share one request.
- `historyStore.loadHistories` — moves `loadTotalHistoryCount()` and the early-return inside the existing `try/finally`, so a failed count no longer leaves `historiesLoading` stuck `true` (which made every later call a silent no-op).
- `App.vue` — catches the startup `loadUser()` rejection and shows an error toast instead of an unhandled rejection.
- Tests: 3 new vitest cases in `historyStore.test.ts`.

"Retries" means the next caller can retry; there is no automatic retry, so no loop risk.

CI: all 26 checks green. No existing reviews/comments.

## Findings

### Blocker
None.

### Major
None.

### Minor
1. **Test uses a second `http` import instead of the existing `http.untyped` escape hatch.** `import { http as mswHttp } from "msw"` sits next to `useServerMock()`'s `http` in the same file. The repo already handles this case with `http.untyped.<verb>(...)`, e.g. `InteractiveTools.test.js:127` does `http.untyped.delete(..., () => HttpResponse.error())`. Also, `/api/histories/count` is in the OpenAPI schema, so the typed `http.get` would likely work too. Suggested fix: drop the `mswHttp` import and use `http.untyped.get("/api/histories/count", ...)` (or typed `http.get`).
2. **Tests sit in the wrong file.** All three cases exercise `userStore.loadUser()` caching/retry, and `historyStore` is only a collaborator. They'd fit better in `userStore.test.ts` (which exists), or at least the user-only case would. Non-blocking.
3. **`console.error("Failed to load user", e)` removed.** Only App.vue's caller now surfaces the error. `router/guards.ts:36` (`await userStore.loadUser(false)`) and `ToolPanel.vue:71` share the same promise, so a history-count failure during startup still rejects those user-only callers. That's pre-existing coupling and the PR makes it recoverable on the next call. Worth knowing, not worth changing in a 26.1 backport.

### Nits
- The comment in the `.catch` is useful (it explains the identity guard), so keep it. The trailing `// Return the shared promise` is an old obvious comment and could go while touching the function.

## Reuse

Good. Reuses `useToast` + `errorMessageAsString` (the established pattern) and `rethrowSimple` in the stores, and it adds no new retry helper. No existing client retry abstraction would have fit better; the cached-promise-with-reset-on-failure pattern is local to `userStore`. The only reuse miss is the test-side `http.untyped` (Minor 1).

## Tests

- Ran locally (node 22.20.0, `node_modules` borrowed from a sibling worktree): `historyStore.test.ts` + `userStore.test.ts`: **12/12 pass**.
- **Red check:** reverting `userStore.ts` + `historyStore.ts` to the merge-base makes all 3 new cases fail, and the other 6 still pass. The tests are meaningful: they cover a failing first count, a failing post-list count, concurrent callers sharing the request, retry succeeding, success staying cached, and user-only recovery.
- No existing tests weakened. The App.vue toast path is untested, which is fine for its size.

## Suggested verdict

Approve. Optional: switch the test to `http.untyped` (Minor 1).

## Draft GitHub review

*Posted by Claude (AI assistant) on behalf of @jmchilton — not authored by them personally.*

Looks good. The `loadPromise === promise` guard is the right way to keep a stale failure from clobbering a newer `refreshUser()`. Moving the count request inside `try/finally` fixes the stuck `historiesLoading` flag. I confirmed locally that the three new cases fail against the base and pass with the fix.

One small optional test cleanup: rather than importing `http as mswHttp` from `msw` alongside the `useServerMock()` `http`, the existing pattern is `http.untyped.get(...)` (e.g. `InteractiveTools.test.js`), or the typed `http.get("/api/histories/count", ...)` since that path is in the schema:

```ts
server.use(http.untyped.get("/api/histories/count", () => HttpResponse.error()));
```

These cases also mostly exercise `userStore.loadUser()`, so `userStore.test.ts` might be a more natural home. Not blocking.
