# getFakeAnonymousUser

`client/tests/test-data/index.ts` gains `getFakeAnonymousUser(data: Partial<AnonymousUser> = {}): AnonymousUser`, next to `getFakeRegisteredUser`. It returns `{ isAnonymous: true, total_disk_usage: 0, nice_total_disk_usage: "0.0 bytes", ...data }`, a complete `AnonUserModel` and the same disk-usage defaults as the registered factory. What makes the user anonymous to `isAnonymousUser` is that it is a non-null object with no `email`, so the factory never sets one. It replaces hand-written literals: some were typed, and some were cast `as any`/`as never`.

Consumers (supporting unless noted):
- `ToolsList/ToolsListCard.test.ts`: both `{ id: "anonymous", isAnonymous: true } as any` literals. Removing the casts left three pre-existing `any`s under `--max-warnings 0`. So `currentUser?: any` became `AnyUser`, `SIGNED_IN_USER` became `getFakeRegisteredUser({ id, username, email })` with the original values, and `useUserStore() as any` lost its cast, since `action` is already a literal union. 10 → 10 tests.
- `Workflow/List/CuratedWorkflowCard.test.ts`: `ANONYMOUS_USER` is now `getFakeAnonymousUser()`, and the `AnonymousUser` import is gone. 19 → 19.
- `Workflow/List/WorkflowListTabs.test.ts`: same change, with the `AnyUser` cast and import dropped. 9 → 9.
- `History/HistoryOptions.test.ts`: the `if/else` default becomes `userData ?? getFakeAnonymousUser()`. 13 → 13.
- `Workflow/Run/WorkflowMissingToolsRequest.test.ts`: the `ANONYMOUS_USER` constant is inlined at its two sites. 17 → 17.
- `composables/userToolCredentials.test.ts` and `stores/unprivilegedToolStore.test.ts`: one inline literal each. 19 → 19 and 5 → 5.
- `History/CurrentHistory/HistoryNavigation.test.ts`: one inline literal. 2 → 2.
- `CommandPalette/CommandPalette.test.ts`: the `browseAnonymously()` body. The `{ id: "anon", isAnonymous: true } as never` cast is gone. 77 → 77.
- `composables/useCommandPalette.test.ts`: originator, committed separately.

Fixture changes. All are filler, and no assertion reads them:
- `nice_total_disk_usage` goes from `"0 bytes"` to `"0.0 bytes"` in CuratedWorkflowCard, WorkflowListTabs, HistoryOptions, WorkflowMissingToolsRequest, userToolCredentials, unprivilegedToolStore and HistoryNavigation. A grep for "bytes" in those suites finds only the fixtures.
- `id: "anonymous"` / `id: "anon"` is dropped in ToolsListCard and CommandPalette. `AnonUserModel` has no `id`. The id-reading paths are guarded: `useHashedUserId` and the userStore favorite actions skip anonymous users, and `unprivilegedToolStore` requires `isRegisteredUser`.
- ToolsListCard's `SIGNED_IN_USER` gains the registered factory's remaining defaults (`is_admin: false`, `preferences: {}`, `quota`, ...).

Not adopted:
- `api/index.test.ts`: it tests the anonymous/registered discriminator itself, so the literal's shape is the scenario input and stays visible.
- The CommandPalette provider tests' `makeCtx({ isAnonymous: true })`: a context flag, not a user object.
- `Panels/ToolBoxSearch.test.ts` (`{ id: "anon", isAnonymous: true } as any`, one site): the file has three unrelated pre-existing `any`s (`SIGNED_IN_USER`, `currentUser`, `favorites`) that would fail `--max-warnings 0` once touched. Typing `favorites` as the store's `FavoriteObjects` would need fixture changes, since `{ tags: [...] }` has no required `tools`. Left as a follow-up.

Validation, from `client/`: all 9 supporting suites (171 tests) pass shuffled (seed `320101`, `NODE_OPTIONS=--no-webstorage`) with the same counts as baseline. ESLint (`--max-warnings 0`), Prettier and `vue-tsc --noEmit` pass.

Follow-ups: ToolBoxSearch (above). CommandPalette's registered `{ id: "u1", email, username } as never` literals (six sites) could use `getFakeRegisteredUser`. ToolBoxSearch's `currentUser` doc says "anonymous by default", but the default is no user (`null`).
