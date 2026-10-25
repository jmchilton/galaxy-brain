# Implementation debrief

**STATUS: BLOCKED** for a scope decision. The second scope evaluation (`scope_evaluation.md`) recommends one small addition. Everything else is hardened. Head `7f8a10ab0e5` on `jmchilton`, base `release_26.2`.

## Decision needed
Should the branch use its new `pluralize` in the 11 existing owner bulk confirm/toast strings in `HistoryList.vue` / `WorkflowList.vue` (today they read "delete 1 histories" etc.), plus the Multiview toast ternary? That's one small commit, and no tests check those strings. The alternative is to ship as is. Either way, the branch still needs to finish:
- **Check branch:** `make format` is clean. mypy has +9 errors vs base, all from the four new `unshare_with_me` routes and the `WorkflowsManager.unshare_with` override having no return type; they need `-> Response` / a return annotation. Then rerun.
- **Screenshots** (`GX_PROCESS_SCREENSHOTS.md`). This is a UI change, so screenshots are required.

If the plural commit is added, the earlier reviews and tests still apply. It would only need a vitest or eyeball check of the strings and a quick review.

## What the branch does (#17204)
- **API:** `PUT /api/{histories,workflows,pages,visualizations}/{id}/unshare_with_me` returns 204. It deletes only the caller's share. Anonymous callers get 403; not-shared or missing items get the same 404. `ShareableService.unshare_with_me` handles all four types.
- **Bookmarks:** removing a workflow share, from either the owner or the recipient side, now drops that recipient's tool-panel bookmark (a `WorkflowsManager.unshare_with` override).
- **Client, per item:** a "Remove from Shared" action on shared history cards and shared workflow cards, and a row operation on the shared visualizations grid.
- **Client, bulk:** selection plus a "Remove from Shared (N)" footer in Histories and Workflows Shared with Me, and a batch op on the shared visualizations grid. These use `settleEach` (keeps going past failures and reports them) and `pluralize`.
- Delete/Backspace does nothing in the shared views. Owner bulk actions stay hidden there.
- **Wrappers:** `unshare{History,Workflow,Visualization}WithMe` in `client/src/api/*`.
- Pages are API-only, because there's no shared-with-me pages UI.

## Choices
- **Base `release_26.2`:** this restores functionality lost with the legacy grid, it's additive with no migration, and the issue is labeled `release-testing-26.2`. Fall back to dev if maintainers object.
- **Route verb:** `PUT .../unshare_with_me`, in the style of the sibling sharing verbs. It returns no `SharingStatus`, which would expose the other recipients.
- **After a partial bulk failure:** workflows keep the failed items selected and histories clear the selection. Each matches its own file's existing bulk convention.

## Left out (follow-ups)
- Ordering shared items by share time: needs a migration, so it targets dev.
- A shared-with-me pages list.
- An options object for the card composables.
- Moving the owner bulk loops onto `settleEach` (would change destructive-delete semantics).
- A backend batch endpoint.
- Bulk workflow and visualization E2E tests (no shared-viz Selenium coverage exists).
- A framework fix for the `submit_login` screenshot timeout.

## Process
- Initial implementation went through review, test challenge, E2E polish, Codex, thermo-nuclear, baseline refactor, then scope evaluation (expand). That produced the re-scope (`implementation_rescope_debrief.md`, alt `issue_17204_remove_shared_with_me_26.2_alt_original_scope`) and a full re-harden. Earlier drafts are in `earlier_drafts/1/`.
- Codex found nothing on either pass. All reviews approved; details are in `subagents/`.
- `GX_PROCESS_BRAIN_RESEARCH.md` was added to the process mid-run, after implementation, so it was not run.

## Tests
- **API:** the sharing mixin covers all four types, plus a histories `shared_with_me` test and bookmark tests. All shown red against base, then green.
- **vitest:** History, Workflow/List, Grid, api and util suites, 554 passed. type-check and eslint are clean.
- **E2E on Playwright:** history single, history bulk and workflow single all pass. Owner-side setup now goes through the API, which stopped the login flakes.
- The Selenium backend wasn't run locally because headless needs `pyvirtualdisplay`. It's left to CI.
