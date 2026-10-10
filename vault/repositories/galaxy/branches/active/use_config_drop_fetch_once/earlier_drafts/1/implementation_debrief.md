# Implementation debrief: use_config_drop_fetch_once

Commit `8e68951968c` (amended with attribution) on `jmchilton/use_config_drop_fetch_once`, based on dev `df3932ed4ba`.

## Change

- `client/src/composables/config.ts`: removed the `fetchOnce` parameter and its guard. The guard tested the `isConfigLoaded` ref, not `.value`, so `useConfig(true)` never called `loadConfig()` on mount. `onMounted` now always calls `store.loadConfig()`, which is a no-op when the config is already loaded or loading.
- 20 `useConfig(true)` callers and 1 `useConfig(false)` caller (`Sharing/UserSharing.vue`) changed to `useConfig()`.
- Behaviour: the config store loads on creation, so nothing changes in the normal case. After a failed initial `/api/configuration`, the former `useConfig(true)` components now retry on mount, as the others always did.

## Verification

- `vue-tsc --noEmit` clean. It caught the `useConfig(false)` caller that the `true`-only sed missed.
- eslint and prettier clean on the changed files; pre-commit hooks passed.
- Full client vitest suite (node 22.20.0): 564 files, 4333 passed, 1 skipped. It ran before the UserSharing fix; `src/components/Sharing` was rerun afterwards (6 passed).
- No test exercised `fetchOnce`, so none was added (no observable behaviour change apart from the retry edge case).
