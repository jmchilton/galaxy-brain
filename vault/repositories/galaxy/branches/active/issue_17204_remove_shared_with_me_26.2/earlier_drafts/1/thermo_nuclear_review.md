# Thermo-nuclear code quality review

Verdict: no structural regression; diff is additive, copies sibling patterns, no file near 1k lines (`useWorkflowCardActions.ts` 368, `useHistoryCardActions.ts` 341). One in-file convention break fixed; bigger moves declined for release_26.2 and listed as dev follow-ups.

Acted on:
- `useWorkflowCardActions.ts` called raw `GalaxyApi().PUT` while every other mutation there goes through `@/api/workflows` or `workflows.services`. Added `unshareWorkflowWithMe(id)` next to `undeleteWorkflow` in `client/src/api/workflows.ts` (same `rethrowSimple` shape); composable now try/catches it. Folded into the workflow cards commit.
- Composable tests only covered the cancel path, so the PUT never ran in vitest. Added confirmed-success (PUT fires, one refresh, exact success toast) and failure (no refresh, exact error toast) cases for both history and workflow composables, written and passed before the refactor. Folded into the history/workflow card commits.

Not acted on:
- Options object / view enum for `useWorkflowCardActions` (7 positional, 3 booleans) and `useHistoryCardActions`: existing signature style (`HistoryCard.vue` already passes `props.sharedView` positionally); converting touches existing callers (`WorkflowList.vue:141`, `HistoryList.vue:189`). Dev follow-up.
- Four identical `unshare_with_me` route handlers: every existing sharing route (`share_with_users`, `slug`, `sharing`) is duplicated per router the same way.
- Double share-assoc query (`get_share_assocs` check then `manager.unshare_with` re-queries): going through `unshare_with` keeps the single manager hook a workflow-bookmark cleanup follow-up would override.
- Bare `trans.anonymous` -> `AuthenticationRequired`: `ServiceBase.check_user_is_authenticated` exists but `ShareableService` doesn't extend `ServiceBase`; inline raise is the dominant pattern across services.
- Shared cross-type client unshare helper / typed client sharing module: relocates ~6 lines per call site without deleting a concept; `SharingPage.vue` still uses untyped axios for all sharing calls. Dev follow-up.
- History unshare stays raw `GalaxyApi().PUT`: `useHistoryCardActions.ts` already calls `GalaxyApi()` directly (`from_store_async`); `@/api/histories` has no mutation wrappers used there.
- Viz grid op inline `GalaxyApi().PUT`: grid configs inline their HTTP calls (sibling Delete/Restore/Copy use axios inline).
- Naming `sharedWithMeView` (workflow) vs existing `sharedView` (HistoryCard): kept; matches `publishedView` and `sharedWithMe` in the workflow components; renaming HistoryCard's existing prop out of scope.

Tests: vitest History composable + `Workflow/List` + `api/workflows.test.ts` 11 files / 104 passed; eslint, prettier, `vue-tsc` clean. `make client-production` rebuilt (first try hit ENOTEMPTY from a Finder `.DS_Store` in the plugin staging dir; retry clean). `test_workflow_sharing.py::test_unshare_with_me` passed on Playwright (first local run of the workflow E2E). Backend untouched, API tests not rerun; history client code untouched (tests only), history E2E not rerun.

<details><summary>Full review</summary>

**Structural / code judo.** Looked for a reframing that deletes the view flag: `useWorkflowCardActions` already computes `shared` (not owner), but published view also shows non-owned workflows that aren't shared with the user, so ownership can't stand in for "shared with me"; `WorkflowSummary` carries no recipient info. Threading `sharedWithMeView` WorkflowList -> WorkflowCardList -> WorkflowCard mirrors `publishedView` exactly. History already had `sharedView`. No branch disappears under a different model without a broader view-mode enum, which is a refactor of existing code.

**Spaghetti.** New actions are list entries gated by a single `visible` flag; no conditionals added to existing flows. Fine.

**Canonical layer (rule 6).**
- Workflow composable bypassed `@/api/workflows` -> fixed.
- Backend: `ShareableService.unshare_with_me` sits beside `share_with_users`, reuses `manager.get_share_assocs` / `manager.unshare_with`. Anonymous check before `get_share_assocs` matters (`user=None` returns all assocs). Not-shared and missing both 404 with the same message.
- No canonical login helper reachable from `ShareableService`.

**Duplication.** History/workflow handlers share the confirm -> PUT -> toast -> refresh shape, but each follows its file's conventions (`localize`/`Toast` vs plain strings/`useToast`); a cross-type helper would need per-type typed paths and wouldn't remove a concept. Four routes: matches the existing per-router duplication for all sharing endpoints; a shared router mixin would be a dev-wide change.

**Types / boundaries.** 204 with no body (avoids leaking other recipients); client wrapper returns `Promise<void>`. `String(data.id)` in viz grid / history matches neighbouring code. Test `as unknown as AnyHistoryEntry` casts match existing test fixtures.

**Positional params.** `useWorkflowCardActions(workflow, current, editorView, refresh, insertSteps, insert, sharedWithMeView)` is now 3 booleans + 3 callbacks positional. Real smell, pre-existing shape; options object is the right dev follow-up.

**Orchestration / atomicity.** Check-then-delete in one request/session; `unshare_with` commits once. No sequencing issues.

**File size.** All touched files well under 1k lines; `schema.ts` is generated.

**Tests.** Mixin runs for all four types with exact `users_shared_with` equality; vitest now covers cancel, success and failure for both composables plus viz grid success/failure; E2E for history and workflow.
</details>
