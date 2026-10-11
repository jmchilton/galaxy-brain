# Scope evaluation: use_config_drop_fetch_once

**Recommendation: keep the scope as implemented. Don't change it.** Commit `6045fcb730d` drops the dead `fetchOnce` parameter from `useConfig` and updates its 21 callers. That is the smallest change that removes the misleading API, rather than just repairing a flag nobody needs. The only behaviour change is the retry after a failed initial config load, and it brings those 21 callers in line with the other ~39. No reviewer asked to widen or narrow the scope. Two small follow-ups sit outside the branch, in the vault: correct BUGS_FOUND row 2, and fix the stale hash in `implementation_debrief.md`.

Inputs: the branch diff (22 files, +24/-25), `index.md`, `implementation_debrief.md`, `codex_review.md`, `subagents/normal_review.md`, `gx_issues/to_file/reject_use_config_fetch_once_guard.md`, and BUGS_FOUND row 2.

Scope signals from the reviews:
- The rejected-issue note offered two options: "drop the `fetchOnce` parameter … or change the guard to `isConfigLoaded.value`". The branch took the first.
- The normal review said "no new abstraction is needed; the change shrinks the API surface" and "tests: none needed". Its one optional nit was to merge two comments in `config.ts`.
- Codex had no findings.
- Neither review asked to expand or contract the scope.

## 1. As implemented: drop `fetchOnce`, update its callers (recommended)

This removes the parameter and its guard, so `onMounted` always calls `store.loadConfig()`. That call is a no-op when the config is loaded or a load is in flight. It also rewrites 20 `useConfig(true)` callers and 1 `useConfig(false)` caller as `useConfig()`.

| Pros | Cons |
| --- | --- |
| <ul><li>Removes a flag that never worked (broken since 2023) and isn't needed: the store loads itself, and `loadConfig()` dedupes</li><li>Every caller retries in the same way after a failure</li><li>The diff is mechanical, and `vue-tsc` enforces it (it caught the `false` caller)</li><li>Shrinks the API, so nobody can "fix" the guard into a real divergence later</li></ul> | <ul><li>The diff touches 22 files, which is a little noisy to review for a one-line bug</li><li>Small behaviour change: the 21 converted components now retry on mount after a failed `/api/configuration`</li><li>No test pins the retry-on-mount contract</li></ul> |

## 2. Contract: fix the guard only (`isConfigLoaded.value`)

This is a one-line fix in `config.ts` that makes `fetchOnce` behave as its name says. Callers don't change.

| Pros | Cons |
| --- | --- |
| <ul><li>Smallest possible diff, one file</li><li>No caller changes at all</li></ul> | <ul><li>Keeps a flag that is redundant: the store has already loaded or started loading before `onMounted` runs</li><li>Turns dead code into live divergence: `useConfig(true)` would then *never* retry after a failure, while `useConfig()` would</li><li>Leaves a confusing parameter for future callers</li></ul> |

## 3. Contract: no code change (fix the ledger only)

Correct BUGS_FOUND row 2 to read "dead guard; store self-loads", and drop the branch.

| Pros | Cons |
| --- | --- |
| <ul><li>Zero upstream review cost</li><li>No user-visible bug exists</li></ul> | <ul><li>The dead, misleading code stays on `dev`</li><li>John already chose a cleanup branch over this option (2026-10-09)</li></ul> |

## 4. Expand: remove `onMounted` from `useConfig` as well

The store's own setup already loads the config, so the composable becomes a pure computed wrapper and the on-mount retry goes away.

| Pros | Cons |
| --- | --- |
| <ul><li>Simplest composable</li><li>No mount-time call at all</li></ul> | <ul><li>Changes behaviour for all ~60 callers in the *opposite* direction: no component would retry after a failed load</li><li>Recovering from an error would then rest only on App.vue's banner and a reload</li><li>Needs product judgement, which a dead-flag cleanup shouldn't need</li></ul> |

## 5. Expand: replace `useConfig` with direct `useConfigStore()` / `storeToRefs`

This retires the composable. 61 files use `useConfig()`, and 15 already use the store directly.

| Pros | Cons |
| --- | --- |
| <ul><li>One way to read config instead of two</li></ul> | <ul><li>Churns about 61 files, plus the `vi.mock("@/composables/config")` factories and `__mocks__/config.ts`</li><li>Large conflict surface for little gain</li><li>A separate refactor, unrelated to the bug</li></ul> |

## 6. Expand: add a composable test for retry-on-mount

This adds a `config.test.ts` that mounts a component after a failed store load and asserts that `loadConfig` is called again.

| Pros | Cons |
| --- | --- |
| <ul><li>Pins the new uniform contract</li><li>Would have caught the original guard bug</li></ul> | <ul><li>The composable is a thin pass-through</li><li>`configurationStore.test.ts` already covers failure and retry</li><li>The normal review judged a test unnecessary</li><li>John's guidance is to skip dedicated tests for tiny fixes</li></ul> |

<details>
<summary>Details</summary>

**Why 1 beats 2.** Both fix the guard bug. But with option 2, `fetchOnce` would *start* doing something for the first time since 2023: it would block the retry after a failure on 20 components. Nobody has asked for that, and nothing shows those components need to differ from the other ~39. Option 1 removes the question instead of answering it.

**Why not 4.** Today, retry on mount after a failure is the de facto behaviour for most callers. Removing it to simplify the code would change how the app behaves while pretending to be a cleanup. If anyone wants it, it belongs in its own discussion.

**Why not 5.** The composable adds `onMounted` retry on top of the store and is used widely. Folding it away doesn't fix any bug, and every mock factory would have to be rewritten.

**Out-of-branch follow-ups (vault only, not Galaxy scope):**
- BUGS_FOUND row 2 still reads "`useConfig(true)` never loads config … Confirmed on dev". The rejected-issue note found that claim wrong, so the row should say "dead guard; store self-loads" and link to this branch.
- `implementation_debrief.md` still cites `8e68951968c`. The real commit is `6045fcb730d`. The normal review flagged this as fixed, but the file wasn't updated.
- The optional comment-merge nit in `config.ts:12-13` stays optional. Fold it in only if the branch is amended for another reason.

**Bundling.** The other BUGS_FOUND rows (tooltip HTML, accessible names) have nothing to do with config loading. Each should get its own PR, as the ledger's header says.

</details>
