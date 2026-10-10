# Normal review: use_config_drop_fetch_once

The review found nothing to change in the code. I acted on the stale commit hash (`8e68951968c` should be `6045fcb730d`, the commit after the amend) and fixed it in the rewritten implementation debrief.

Not acted on:
- Retry on mount after a failed config load: this is the intended behaviour change. `loadConfig()` deduplicates calls while a load is in flight, so requests can't pile up. No change needed.
- Merging the "Anytime we mount this (for now)" comment into the new line in `config.ts:12-13`: an optional nit. It isn't worth amending a pushed one-commit branch.

<details>
<summary>Details</summary>

Findings, by severity:

1. **Low: stale commit hash in the debrief.** `implementation_debrief.md:3` cites `8e68951968c`, but HEAD and the pushed branch are `6045fcb730d`. `git diff` between them is empty; the old hash is from before the amend. Fix it in the vault debrief.
2. **Low, intended behaviour change: retry on mount after a failed config load.** See `config.ts:14-16`.
   - `configurationStore.ts:17-18` sets `isLoading` synchronously before its first await, so components mounting in the same tick send only one request.
   - The other 62 `useConfig()` callers already behave this way.
   - None of the converted components is a per-row list item.
   - A successful retry clears `loadError`, which also clears the App.vue startup banner. That is fine.
   - No change needed.
3. **Nit: comments in `config.ts:12-13`.** Keep the new "no-op once loaded or while a load is in flight" line. The old "Anytime we mount this (for now)" line could be merged into it. Optional.

Checks with no issues:
- **The old guard was dead.** `!(fetchOnce && isConfigLoaded)` tested a computed ref, which is always truthy. The bug dates back to 0cd24878985 (2023).
- **`loadConfig()` is idempotent.** It skips when the config is loaded or a load is in flight. After a failure it records `loadError`, resets `isLoading` and allows a retry, with no self-looping.
- **No callers with arguments are left.** `grep -rnE "useConfig\([^)]" client/src` finds none, and there are no `fetchOnce` mentions anywhere.
- **Mocks and tests are unaffected.**
  - All `vi.mock("@/composables/config")` factories and `__mocks__/config.ts` take zero arguments.
  - `App.test.ts:66` uses App.vue's direct store call, not the composable.
  - `configurationStore.test.ts` covers the failure and retry path.
- **Tests:** none needed. The composable is a thin pass-through, and the store tests cover the retry.
- **Reuse:** no new abstraction is needed. The change shrinks the API surface.

Verdict: a correct, well-scoped cleanup. No security concerns.

</details>
