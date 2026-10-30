# Initial review: galaxyproject/galaxy#24565

- Profile: default
- Model: Claude Opus 5.5 (claude-opus-5-5)
- Effort: medium
- Reviewed commit: `fc477492afec572160601cd5d60e8d2d0f5b1be6` (base `dev`)

## Summary

The fix is correct. With `show_shared=false`, `WorkflowsManager.index_query` (`lib/galaxy/managers/workflows.py:239`) filters on `StoredWorkflow.user == trans.user` only (`show_published` is false on the My tab), so the page and the `Total_matches` header now cover the same rows. Dropping the `shared_with_me` filter from the My tab follows: the API rejects `is:shared_with_me` when `show_shared` is false, and the PR description says so. Sibling lists already do this (`Grid/configs/pages.ts`, `visualizations.ts`, `api/histories.ts` pass `showShared: false` for "my" lists). Backend `show_shared=false` behavior is already covered by `test_index_show_shared` in `lib/galaxy_test/api/test_workflows.py`.

The main gap is that the PR adds a server-side fix on top of the client-side workaround from #23777 without removing the workaround.

## Findings

### P2 1: Client-side owner filter from #23777 is now redundant; remove it and its user-loading gate

#23777 hid shared workflows on the My tab by filtering by owner on the client, `WorkflowList.vue:66-71`:

```ts
const workflowsLoaded = computed(() =>
    props.activeList === "my"
        ? workflowsFetched.value.filter((w) => userStore.matchesCurrentUsername(w.owner))
        : workflowsFetched.value,
);
```

Because of that filter, the list also had to keep `loading` true until `userStore.currentUser` was known (`loading = fetching || (activeList === "my" && !userStore.currentUser)`). Otherwise the list showed as empty if the workflows arrived before the user did, which was the bug #23777 fixed. Now that the My tab requests `show_shared=false`, the server returns only the user's own workflows, so the filter never removes anything. The `workflowsFetched`/`workflowsLoaded` split and the wait-for-user gate guard against a case that can no longer happen. Keeping both mechanisms leaves two sources of truth for "what is mine": the code grows instead of being replaced by the better fix. It also keeps the extra wait for the current user before the list renders.

Suggested fix: remove the owner filter so `workflowsLoaded` is the fetched data again. Drop the `currentUser` part of `loading`, or keep it only if something else on the tab needs the user. Update or remove the #23777 test "render own workflows when the user loads after the workflow list" to match. The new `showShared: false` test then covers the behavior that matters.

### P3 1: The two "server default" tests repeat each other and only check that a parameter is missing

`WorkflowList.test.ts` adds two nearly identical tests, "leaves shared workflows to the server default on the published tab" and the same for the shared-with-me tab. Each only asserts `options.showShared` is `undefined`. They pin an implementation detail (the parameter is left out) rather than behavior, and they would fail if the Shared tab started passing `showShared: true` explicitly, which would be a reasonable change. Suggest merging them into one `it.each` over the two tabs, or dropping them and keeping only the My tab test, which pins the actual fix.

### P3 2: Shared with me tab still relies on the API's implicit `show_shared` default

The My tab now passes `showShared` explicitly, while the Shared with me tab still relies on the server's computed default (`show_shared = not show_hidden and not show_deleted`). The `is:shared_with_me` query that the tab always appends requires `show_shared` to be true. The comparable sibling configs (`visualizationsShared.ts`, `api/histories.ts` shared loader) pass `showShared: true` explicitly. Passing `showShared: sharedWithMe.value ? true : published.value ? undefined : false`, or a small computed, would make each tab's intent explicit and keep it from depending on the server default. This is optional; current behavior is correct.

## Non-findings checked

- `is:deleted` on the My tab: before this PR, the default `show_shared=true` combined with `is:deleted` in the search could also match deleted workflows shared with the user. `show_shared=false` removes that, which is a small improvement.
- The `SharingIndicators` `filter` emit with `shared_with_me` isn't wired into the workflow list (workflow cards go to `/workflows/list_shared_with_me` instead), so removing the filter key doesn't break a caller.
- The new `filterConversion.test.js` case is a reasonable guard on the filter-set change.
