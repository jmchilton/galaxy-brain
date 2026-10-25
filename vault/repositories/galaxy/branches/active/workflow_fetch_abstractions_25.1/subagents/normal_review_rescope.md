# Normal review (re-scope) - workflow_fetch_abstractions_25.1

Acted on in `deca37cd456`: getter docstring (2), red-to-green unset-`importable` show test (6), and corrected the skip reason in `implementation_rescope_debrief.md` (4).

Not acted on:
- 1 `User.count_stored_workflow_user_assocs` now unused: model method on a release branch; left.
- 3 import paths still checking `importable is False`: belongs to the mixin follow-up.

<details>

Approve `5531402899b`. No bugs. Two cheap nits (dead model method, getter docstring), a debrief correction about why the `pages.py`/mixin items were skipped, and one optional test that pins the `importable IS NULL` change.

Open items for the implementer:
- 1: drop `User.count_stored_workflow_user_assocs`, or leave it and say why.
- 2: getter docstring.
- 4: correct the stated reason for skipping `pages.py`/mixin in `implementation_rescope_debrief.md`. The decision to skip can stay.
- 6: optional NULL-importable show test. Either way, put a line about it in the PR description.

<details>

Reviewer: subagent, read-only. Focus: `git show 5531402899b`. The rest of `origin/release_25.1...HEAD` was read for context.

## Verdict

Approve. The swap from the inline check to `get_stored_accessible_workflow` keeps behavior for owner, admin, share recipient, importable=True, and anonymous users. The only change is `importable IS NULL` (see the parity table). It moves show onto the rule that every other getter caller already uses. Changing the message is safe: nothing asserted the getter's old text, and show's text, which is asserted, is unchanged. `USER_MENU_UPDATE_KEYS & workflow_dict.keys()` is correct (frozenset & dict_keys gives a set). Ruff is clean on the three touched files. `exceptions` is still used in `services/workflows.py`.

## Behavior parity: old show check vs getter

| Case | Old inline (`importable is False and user != trans.user and not admin`, then share count) | Getter (`user != trans.user and not admin and not importable`, then share count) |
|---|---|---|
| Owner / admin | pass | pass |
| Share recipient | pass | pass |
| `importable=True` (incl. published via sharing API) | pass | pass |
| Anonymous, private | 403 (`wf_count = 0`, no query) | 403 (`filter_by(user=None)` count of 0, one extra query, negligible) |
| `published=True, importable=False` | 403 unless shared | same |
| `importable IS NULL` (`Mapped[Optional[bool]]`, `model/__init__.py:8329`) | **pass for anyone** | owner/admin/share recipient only |
| `instance=true` | fetch unchanged (`by_stored_id=not instance`) | same |
| attach path (`by_stored_id=False`, no StoredWorkflow) | `attach_stored_workflow` checks ownership and creates a StoredWorkflow with `user=trans.user` | same; passes the owner branch |

NULL is reachable through more than legacy rows. An owner's legacy `PUT /api/workflows/{id}` with `{"importable": null}` stores it (`api/workflows.py:466-468`). The new rule matches every other path: download, preview, SVG, invoke, versions, markdown embeds, and reports (all use the same getter), `SharableModelManager.is_accessible` (`sharable.py:106`), `managers/base.security_check` (`base.py:125`), and the index `importable == true()` filter. Put one line in the PR description.

## Callers affected by the message change

`get_stored_accessible_workflow` callers: `api/workflows.py:174` (PUT menu), `:339`, `:437` (legacy update, tool-panel-only), `:743`; `services/workflows.py:137` (invoke), `:205`, `:214`, `:240` (show); `managers/workflows.py:392` (SVG); `managers/markdown_util.py:196/202/208/319`; `workflow/reports/generators/__init__.py:42`. The old text, "Workflow is not owned by or shared with current user", is asserted nowhere in `lib`, `test`, or `client/src`. The new text is asserted by `selenium/test_workflow_sharing.py:31` (export page, which goes through show) and mocked by `client/src/components/WorkflowInvocationState/WorkflowInvocationOverview.test.js:21`. Both match. No client code matches on either string.

## Bugs

None.

## Nits

1. **`User.count_stored_workflow_user_assocs` is now dead** (`lib/galaxy/model/__init__.py:1377`). `show_workflow` was its only caller (no hits in `lib`, `test`, or `client/src`). The branch removed that caller, so it should either drop the method or say why it stays. Dropping it is cheap. The getter can't simply reuse it, because the getter has to handle `trans.user is None`.
2. **Getter docstring** (`lib/galaxy/managers/workflows.py:313-315`): "from a encoded stored workflow id and make sure it accessible". These are the same mistakes just fixed in `get_owned_workflow`. It also takes UUIDs and `by_stored_id=False`. Suggested: "Get a stored workflow (encoded id or UUID) and make sure it is importable, owned by, or shared with the user (or the user is an admin)."
3. **Sibling outliers on NULL** (note only): `api/workflows.py:665` (`POST /api/workflows/import`) and `controllers/workflow.py:105` (`/workflow/imp`) still test `importable is False`. They are now the only workflow read paths that treat NULL as importable. Aligning them is part of the mixin follow-up, not this commit.

## Skipped recommendations

4. **`pages.py` / mixin: right call, wrong reason.** The debrief says `security_check`'s accessibility rules "aren't the same as the workflow getter's". For a `StoredWorkflow` with `check_accessible=True`, `security_check` (`managers/base.py:94-130`) applies the same rules as the getter: admin, then owner, then `not importable`, then share recipient. For `placeholderRenderForSave` (`managers/pages.py:655-656`), the swap only changes the message text, gives `ObjectNotFound` instead of an `AttributeError` on a missing id, and accepts UUIDs. For the mixin (`webapps/base/controller.py:867`), the real differences are message text ("Must be logged in to manage Galaxy items" / "StoredWorkflow is not owned by the current user" vs the manager defaults), the neither-flag callers (import paths with their own `is False` check), and the slug backfill. Skipping both is still reasonable on a 25.1 target: the legacy routes have thin coverage, the message text changes, and `pages.py` sits outside the workflow modules. Fix the stated reason so the follow-up isn't framed as a rules change.
5. **Self-referencing `workflow` key: right call.** Confirmed. `WorkflowPopulator.update_workflow` wraps payloads as `{"workflow": ...}` (`base/populators.py:2557`). The second call in `test_update_tags` (`test_workflows.py:1066`) sends `{"workflow": {}}`. With the self-reference, `workflow_dict` is truthy and the call returns 200. Without it, the call falls through to the "requires dictionary" 400 (`api/workflows.py:520-522`). That is a visible behavior change and belongs on dev, if anywhere.

## Test coverage of show

Show routing is covered: non-owner and anonymous 403 (`test_workflows.py:350`), share-recipient 200 (`:517`, `:526` call `_show_workflow` as the recipient), owner `instance=true` on an unattached subworkflow (`:1388`), and the export-page message (`selenium/test_workflow_sharing.py:31`). The getter's importable and anonymous branches are covered through download tests (`:369`, `:376`, `:383`). Show now shares that getter, so a show-specific importable test isn't needed.

6. **Optional: pin the NULL change.** The owner sends a legacy PUT with `{"importable": None}`, then a different user's `GET /api/workflows/{id}` gets 403. This is red on base (200) and green here. It is the one show behavior this commit changes on purpose, and nothing pins it.

</details>

</details>
