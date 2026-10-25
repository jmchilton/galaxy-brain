# Scope evaluation (second pass, after re-scope)

**Recommendation: keep scope.** The re-scope landed what the first pass asked for that was safe on 25.1: `show_workflow` goes through `get_stored_accessible_workflow`, the legacy `update` bookmark block keys off `USER_MENU_UPDATE_KEYS`, and the `get_owned_workflow` docstring is fixed. What is left (controller-mixin wrapper, `pages.py`, merge self-reference, `User.count_stored_workflow_user_assocs` removal) was tried or weighed and deferred for good reasons: user-visible message text on legacy routes, thin coverage, a failing test, or model-method churn on a release branch. Every API-level fetch in the touched service/API modules now names the access level it needs. No further modest expansion is worth the risk on 25.1.

## Possible Decompositions

Branch: 8 commits, about 194 added lines (about 55 changed non-test lines in `managers/workflows.py`, `api/workflows.py`, `services/workflows.py`; rest tests and populators).

1. **Single PR.** All 8 commits.
2. **Two PRs.**
   - (a) Baseline tests plus pure refactors: the two baseline commits, `get_stored_owned_workflow` used by delete/undelete, `set_workflow_menu` resolve collapse. No behavior change.
   - (b) Behavior: bookmark id from fetched workflow (UUID/`instance` ids), update/refactor getter selection, `PUT /menu` and show via accessible getter (getter message text change). Lands after (a).
3. **Three PRs.** (a) as above. (b) bookmark-id fix alone (independent of the getter pair). (c) getter routing for update, refactor, menu and show.

## Scope: As implemented (recommended)

Adds `WorkflowsManager.get_stored_owned_workflow` beside the accessible getter. Delete, undelete, refactor and legacy `PUT /api/workflows/{id}` use the matching getter; show and `PUT /api/workflows/menu` use the accessible getter. Bookmark-only updates stay available to anyone who can access the workflow, and the bookmark id comes from the fetched workflow.

| Pros | Cons |
|---|---|
| <ul><li>Getter pair in the manager; call sites state needed access level</li><li>Last inline duplicate in the service (`show_workflow`) removed</li><li>Red-to-green API tests per behavior change, baseline commits first</li><li>Small code diff, proportionate for 25.1</li></ul> | <ul><li>Controller mixin `get_stored_workflow` and `pages.py` still use older paths</li><li>Gate keeps `- {"workflow"}` special case (comment explains it)</li><li>Getter message text changes for its other callers (no test asserts the old text)</li></ul> |

<details>

Remaining raw `get_stored_workflow` calls in the touched modules: `services/workflows.py:95` (internal read after upload, no access decision), `api/workflows.py:661` (mixin call in import-shared, followed by its own importable check), `services/invocations.py:103`. These are either unprotected by design or belong to the mixin follow-up.

</details>

## Scope: Modest expansion, mixin wrapper and `pages.py`

Make `UsesStoredWorkflowMixin.get_stored_workflow` a thin wrapper over the manager getter pair and route `placeholderRenderForSave` through the accessible getter.

| Pros | Cons |
|---|---|
| <ul><li>Finishes consolidation across legacy controllers and the API</li><li>Reviewers may ask for it</li></ul> | <ul><li>Same accessibility rules already apply via the generic item check in managers/base.py: gain is consolidation only</li><li>Changes message text on legacy routes, the slug backfill, and callers passing neither flag</li><li>Thin test coverage on those routes; widens a release-branch diff</li></ul> |

<details>

Evaluated in the re-scope and left for a dev follow-up. Nothing found now that changes that: the callers are annotations, `/workflow/imp`, `POST /api/workflows/import`, export/direct import. The wrapper would be a separate PR with its own tests.

</details>

## Scope: Drop the self-referencing `workflow` merge key in `update`

Exclude `"workflow"` from the merge so the gate is just `set(workflow_dict) <= USER_MENU_UPDATE_KEYS`.

| Pros | Cons |
|---|---|
| <ul><li>Removes the special case and its comment</li></ul> | <ul><li>Tried in the re-scope: `test_update_tags` failed; a wrapped empty update relies on the key to stay a no-op 200 rather than a 400</li><li>Needs a behavior decision, not just a tidy-up</li></ul> |

## Scope: Contract (drop show/menu or bookmark-id fix)

Keep only `get_stored_owned_workflow` plus delete/undelete/refactor/update.

| Pros | Cons |
|---|---|
| <ul><li>Smaller diff</li></ul> | <ul><li>Leaves inline duplicate getters the branch exists to remove</li><li>Drops red/green-tested fixes already in place</li><li>The additions are small; contraction saves little review effort</li></ul> |

## Scope: Drop `User.count_stored_workflow_user_assocs`

Now unused after the show change.

| Pros | Cons |
|---|---|
| <ul><li>Removes dead code</li></ul> | <ul><li>Model method; churn on a release branch, can follow on dev (check other callers first)</li></ul> |
