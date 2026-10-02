# galaxy#23777 - Fix empty "My workflows" list when workflows load before the current user

- Author: itisAliRH, base `dev`, +50/-0
- Head SHA: `2192376e02a2e9cdbb21f818c2a5f52eb916c370` (merge-base `07420debd2e`)
- Worktree: `~/projects/worktrees/galaxy/pr/23777`
- Status: reviewed, not posted

## Verdict

Approve with a suggested change. The diagnosis is correct, the fix works, and the new race test goes red to green. But awaiting `loadUser(false)` inside `load()` is the wrong place for it. Every other owner check in the client (`WorkflowCard`, `WorkflowIndicators`, `PageCard`, `HistoryPanel`, the history badges, and so on) is a `computed` over `userStore.matchesCurrentUsername`, so it updates when the user arrives. `WorkflowList` is the only place that copies an owner filter into a ref once. Making it a `computed` too fixes the bug without the await/catch, and without the `includeHistories` cache problem in finding 1.

## Verification

- node 22.20.0 (pnpm-managed), `pnpm install --frozen-lockfile`, `vitest run src/components/Workflow/List/WorkflowList.test.ts`
- PR head: 5/5 pass.
- `.vue` reverted to merge-base with the PR tests kept: "render own workflows when the user loads after the workflow list" fails (`expected ... length of 3 but got +0`). Real red to green.
- The "load rejects" test passes even without the fix. That's expected, because it guards the `.catch` (drop the `.catch` and the list toasts and stays empty). It's still useful.
- Tried the computed alternative below: all 5 tests pass unchanged. The `loadUser` mock in the tests is then irrelevant but harmless.

## Findings (ranked)

1. **`WorkflowList.vue:205`: `loadUser(false)` can cache a users-only promise that a later full load reuses.** `userStore.loadUser` (`stores/userStore.ts:172-191`) ignores `includeHistories` whenever a promise is cached. Normally `App.vue` has already cached the full promise (user plus histories), so this is fine. But after that load rejects, `loadPromise` is cleared (that's the #23739 retry fix). The next `load()` from this list (any sort, filter, or page change) then starts and caches a **users-only** promise. Then #23743's Retry button (`userStore.loadUser()`, histories=true) gets that resolved promise back. The alert clears, but histories are never reloaded. `ToolPanel.vue:71` and `router/guards.ts:36` already have the same latent problem. This PR adds a caller that runs repeatedly, which makes it much more likely to hit. The computed approach avoids it. Otherwise the store needs to handle `includeHistories` properly, which is a bigger change.

2. **`WorkflowList.vue:60,203-209`: suggested fix is to filter reactively instead of awaiting.** Keep the raw page in a ref and derive the list from it:
   ```ts
   const workflowsFetched = ref<WorkflowSummary[]>([]);
   const workflowsLoaded = computed(() =>
       props.activeList === "my"
           ? workflowsFetched.value.filter((w) => userStore.matchesCurrentUsername(w.owner))
           : workflowsFetched.value,
   );
   // in load():
   workflowsFetched.value = data;
   ```
   `workflowsLoaded` is only read elsewhere (`allItems` for `useSelectedItems`, and `.find`/`.filter`/`.length`), so a computed can replace it directly. What it fixes:
   - no ordering dependency on `App.vue`
   - no swallowed rejection
   - no extra `/api/users/current` after a failure
   - it corrects itself if `currentUser` changes

   The trade-off is a short "No workflows found" before the user arrives, since `noItems` only checks `loading`. If that matters, add `|| (props.activeList === "my" && !userStore.currentUser)` to the loading/`noItems` condition. The comment at `:204` and the `mockResolvedValue(undefined)` at `WorkflowList.test.ts:54` can then go.

3. **(Follow-up, not this PR.) The client-side owner filter is the underlying cause, and it also breaks pagination.** The "my" tab calls `/api/workflows` without `show_shared`. The backend defaults that to true (`managers/workflows.py:223-224`), so shared workflows come back and are then dropped on the client. `Total_matches` still counts them, so pages come up short and the page count is too high. `loadWorkflows` already takes `showShared` (b2aba362d1c). Passing `showShared: false` for "my" would let the filter and the race go away entirely. But the "my" filter set advertises `is:shared_with_me` (`workflowFilters.ts:107`), and that raises a 400 without `show_shared` (`managers/workflows.py:297`). So that filter would have to be dropped from "my" too; today it can only ever return an empty list there anyway. Worth an issue. Too much for this fix.

4. **Other lists:** no similar race. The history/page/visualization owner checks are all `computed` (`HistoryPageList.vue:38`, `PageCard.vue:50,93`, `useHistoryCardBadges.ts`), so they re-render when the user arrives. `WorkflowList` is the only one.

Checked, no issue:
- Anonymous users: `/workflows/list` goes through `redirectAnon`.
- User switching: a full reload resets the store.
- Duplicate fetches in the happy path: none (it's the shared promise).
- Filter/pagination reset: `load()` still runs on the same triggers.

## Draft GitHub review comment

> *Posted by Claude (AI assistant) on behalf of jmchilton - not personally authored.*
>
> Thanks, the diagnosis is spot on. I confirmed the new "user loads after the workflow list" test fails with the `.vue` change reverted and passes with it.
>
> One suggestion: rather than awaiting `userStore.loadUser(false)` inside `load()`, could the owner filter be a `computed`? Every other owner check in the client (`WorkflowCard`, `PageCard`, the history badges, etc.) is already a reactive `matchesCurrentUsername`. This list is the only place that stores the filtered result once.
>
> ```ts
> const workflowsFetched = ref<WorkflowSummary[]>([]);
> const workflowsLoaded = computed(() =>
>     props.activeList === "my"
>         ? workflowsFetched.value.filter((w) => userStore.matchesCurrentUsername(w.owner))
>         : workflowsFetched.value,
> );
> // load(): workflowsFetched.value = data;
> ```
>
> Your two new tests pass unchanged with this. It also avoids a subtle interaction with the store. `loadUser` ignores `includeHistories` when a promise is cached, and after a failed startup load the cache is cleared. So a sort, filter, or page change here would cache a users-only promise. A later full `loadUser()` (e.g. a Retry) would then resolve without ever reloading histories. If the brief "No workflows found" before the user arrives is a concern, the empty state could also wait for `userStore.currentUser` on the "my" tab.
>
> Not for this PR: the root cause is that the "my" tab fetches with `show_shared` defaulting to true and filters on the client, which also makes `Total_matches`/pagination overcount. `loadWorkflows` already accepts `showShared`, so that could be a nice follow-up.
