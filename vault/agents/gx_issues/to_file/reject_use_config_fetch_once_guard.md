# Reject: useConfig_fetch_once_guard

Prepared 2026-10-09. Source: `vault/projects/just_jesting_around/BUGS_FOUND.md`, row 2 (Story lane, InstallationSettings). The shared ledger was not moved.

## Claim

`useConfig(true)` never loads config, because the guard `!(fetchOnce && isConfigLoaded)` tests the computed ref, which is always truthy, instead of `.value`.

## Finding

- The guard bug is real on `dev` df3932ed4ba (`client/src/composables/config.ts`). With `fetchOnce = true`, `onMounted` never calls `store.loadConfig()`. This has been unchanged since 0864d655e17 / 6c198544dc2 (2023).
- "Never loads config" is wrong. `configurationStore.ts` calls `loadConfig()` in the store's own setup, so the first `useConfigStore()` triggers the load no matter which `fetchOnce` value is passed. `loadConfig()` also dedupes on `isLoaded`/`isLoading`, which makes the `fetchOnce` flag redundant either way.
- The only observable difference: after a *failed* initial `/api/configuration` request, a component calling `useConfig()` retries on mount, while one calling `useConfig(true)` does not. This affects 20 call sites. It is an edge case with no user report.
- The story lane noted the store's own load at creation (see STORY_LOG InstallationSettings row), so its config decorator workaround is still correct.
- No duplicate issue (searched "isConfigLoaded", "useConfig fetchOnce").

## Recommendation

Don't file this as an issue. At most it is a cleanup PR: drop the `fetchOnce` parameter and update its 20 callers to `useConfig()`, or change the guard to `isConfigLoaded.value`. Either way, nothing users see changes, apart from the retry-after-failure edge case. The BUGS_FOUND row should be corrected to "dead guard; store self-loads", not "never loads config".
