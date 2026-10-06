# Notebook cards can hide "Share and Publish" when the current user loads after the card mounts

A notebook card that mounts before the current user has loaded hides the owner's "Share and Publish" button for the rest of its life.

`PageCard.vue` builds `secondaryActions` as a plain array once at setup. Share's `visible` is computed then from `userStore.matchesCurrentUsername(props.page.username)`. If `/api/users/current` hasn't returned yet, that is `false` and nothing re-evaluates it. `badges` in the same component is a `computed`, so it does update. The card ends up dropping the "Owned by …" badge (it now knows you're the owner) while still hiding the owner-only Share button.

| User store when card mounts | "Owned by …" badge (`computed`) | "Share and Publish" (plain array) |
|---|---|---|
| already loaded | hidden ✅ | shown ✅ |
| loads after mount | hidden ✅ | **hidden** ❌ |

`PageCard` is only used by `HistoryPageList`, i.e. the notebooks list at `/histories/:historyId/pages` and the Reports tab of a workflow invocation. `/pages/list` is a grid and is not affected.

<details><summary>Reproduction (vitest)</summary>

Run against `release_26.1` at `2b4052c8680`. `PageCard.vue` is identical on `dev`. This test fails, and a control that sets the user before mounting passes:

```ts
it("shows Share and Publish once the current user loads after mount", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mount(PageCard as object, { localVue, propsData: { page: FAKE_PAGE_SUMMARY }, pinia });
    useUserStore().setCurrentUser({ id: "u", email: "t@example.org", username: FAKE_PAGE_SUMMARY.username } as RegisteredUser);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(`#g-card-badge-owned-by-other-user-page-${FAKE_PAGE_SUMMARY.id}`).exists()).toBe(false); // passes
    expect(wrapper.find(`#g-card-action-share-access-management-page-${FAKE_PAGE_SUMMARY.id}`).exists()).toBe(true); // fails: false
});
```

</details>

This is reproduced at the unit level only, not in a browser, and the browser race is probably rare. `HistoryPageView` mounts cards only after its pages request returns, and `App.vue` starts the user request before that, so the user has to come back slower than the notebooks list on a direct load. That is the same situation as the workflow cards in #23909, which couldn't be triggered in the browser either and were fixed with a unit test.

## Context

A follow-up to 🔀 #23909, which fixed this pattern in `useHistoryCardActions` (seen in the browser on `/histories/list`) and `useWorkflowCardActions` by making the action lists `computed`. `PageCard.vue` was out of scope there.

## Proposed Approach

Make `primaryActions` and `secondaryActions` in `PageCard.vue` `computed`, matching `badges` in the same file and the #23909 composables, and add the test above. As a side effect, the Edit button's `disabled` and title follow `props.page.deleted` instead of being fixed at setup.

## Alternative Approaches

We could instead hold off rendering the list until the user has loaded. Making the actions `computed` fixes the cause in one file and follows the convention #23909 just set.

<details><summary>Alternatives In Detail</summary>

### Alternative: Gate the list on the user store

<details><summary>Description</summary>

#### Details

Have `HistoryPageView` (or `HistoryPageList`) wait for `userStore.loadUser()` before rendering `PageCard`s.

#### Why the proposed approach is preferred

It adds a wait to the first render for a value the card can just react to. It also fixes only this one caller. Any other component that copies the plain-array pattern would still have the bug.

</details>

</details>
