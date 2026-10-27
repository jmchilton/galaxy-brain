No refactoring of the base branch was performed.

History unchanged: head `aca3a3bcea6`, "Baseline tests" commit `79b7bba0615` still first.

Reviewed every hunk of `origin/release_26.2..HEAD`. All production changes are additive:

- Backend: new `ShareableService.unshare_with_me` and four new `unshare_with_me` routes. No existing code changed, moved or renamed. It reuses `get_share_assocs` / `unshare_with` as they are.
- Client: new `unshareWorkflowWithMe` in `api/workflows.ts`, new actions in `useHistoryCardActions` / `useWorkflowCardActions` and a new `visualizationsShared` operation. New `sharedView` / `sharedWithMeView` parameters default to `false`, and the props are threaded through. The only line changed rather than added is a docstring in `useHistoryCardActions`.
- Regenerated schema and new `navigation.yml` selectors exist only for the new endpoints and buttons.

Candidates considered and rejected:

- Vitest scaffolding in `useHistoryCardActions.test.ts` / `useWorkflowCardActions.test.ts`: hoisted `confirm` mock, `vi.mock("@/composables/toast")`, `useServerMock`, `vi.clearAllMocks()`, extra `setup()` params. This could be pulled ahead as its own commit. But it is test-only, it exists only to serve the new feature tests, and its `setup()` passes `sharedWithMeView`, which is not on base. A separate commit would just move a few lines. It would not make the feature commits easier to read.
- Options object / view enum for the positional composable signatures, a shared cross-type client unshare helper, and a shared sharing-router mixin: the thermo-nuclear review already deferred these to dev as follow-ups. They change existing callers on a release branch, which is out of scope here.

No commits were created and no tests were run, because the tree is unchanged.
