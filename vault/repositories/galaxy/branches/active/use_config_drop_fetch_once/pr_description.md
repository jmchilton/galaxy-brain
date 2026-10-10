Drop `useConfig`'s `fetchOnce` flag, whose guard has never worked.

`useConfig(true)` was meant to skip loading config on mount once it was already loaded. The guard tests the `isConfigLoaded` ref instead of its value, and a ref is always truthy:

```ts
// before - fetchOnce=true makes this always false, so loadConfig() is never called on mount
onMounted(() => {
    if (!(fetchOnce && isConfigLoaded)) {
        store.loadConfig();
    }
});

// after - every caller loads on mount; loadConfig() already skips when loaded or loading
onMounted(() => {
    store.loadConfig();
});
```

***When config loads, nobody saw a broken page from this. The config store starts loading as soon as it's created, so `useConfig(true)` callers got their config anyway.*** The flag has been dead code since 2023. It's also redundant: `loadConfig()` returns early when the config is already loaded or a request is in flight, which is all `fetchOnce` was trying to do.

***Fixing the guard to `isConfigLoaded.value` would be worse: the flag would start doing something for the first time.*** Those 20 components would stop retrying after a failed `/api/configuration` request, while the other ~39 callers kept retrying. ***Removing it leaves one behaviour for all `useConfig()` callers: retry on mount after a failed load, with no extra requests while a load is in flight or once it has succeeded.***

The diff is the composable plus 21 one-line caller changes (20 `useConfig(true)`, 1 `useConfig(false)` in `Sharing/UserSharing.vue`). No caller passes an argument any more, and `vue-tsc` rejects one in TypeScript components.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the scope as implemented: drop the flag and update its 21 callers.</summary>

- Fixing the guard instead (`isConfigLoaded.value`) was rejected. It turns dead code into a real difference: 20 components would never retry after a failed load.
- Removing `onMounted` entirely was rejected. It would stop all ~60 callers retrying after a failure, which is a product change, not a cleanup.
- Replacing `useConfig` with direct store access was rejected. It churns ~60 files and their mocks without fixing anything.
- A dedicated composable test was skipped. The composable is a thin pass-through, and `configurationStore.test.ts` already covers the failure and retry paths.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings.</summary>

Reviewed all 22 changed files plus the config store, its tests, `App.vue`'s error banner, the composable mock and the vitest helpers. No caller still passes an argument and no `fetchOnce` reference remains.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Same as before: App.vue's "Unable to load the Galaxy configuration" banner. The 20 former `useConfig(true)` components now retry on mount, and a successful retry clears the banner.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A. No tests added; `configurationStore.test.ts` covers the store's failure and retry paths.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] This is a refactoring of components with existing test coverage.

<details><summary>Tests run</summary>

- `vue-tsc`, eslint and prettier are clean.
- The full client vitest suite passes (4333 tests).

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
