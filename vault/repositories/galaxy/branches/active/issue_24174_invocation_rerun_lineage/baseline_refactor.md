Run via claude-opus-5-5 at high effort.

One leading refactor commit, `9bf74e3ee40` "Serialize workflow invocations in one batch path", moves invocation serialization into `serialize_workflow_invocations` and makes `serialize_workflow_invocation` delegate to it, with no behavior change on `dev`. The eight feature commits were replayed on top. The final tree is identical to the previous head `8d8d0f7698d`.

## What was split out

On `dev`, `serialize_workflow_invocation` held the body and `serialize_workflow_invocations` looped over it. The last feature commit (`8d8d0f7698d`, now `a16df27f2a7`) reversed that so batch lineage queries could run once per batch. That commit mixed two changes: the structural reversal, which is neutral on `dev`, and the lineage batching. The reversal now stands alone in `lib/galaxy/webapps/galaxy/services/invocations.py`:

- `serialize_workflow_invocations` computes `view` once and serializes each invocation with the same `to_dict` arguments and `messages` as before.
- `serialize_workflow_invocation` returns `serialize_workflow_invocations([invocation], ...)[0]`, keeping its `element` default view.

Every caller (`index`, `show`, `cancel`, `create_from_store`) gets the same responses. ruff, black and isort are clean. Quick mypy on the file reports 28 errors, the same count as on `dev`.

## What was left alone

- `invocations = list(invocations)` stays in the feature commit. Only the lineage pass needs to iterate twice.
- `_accessible_invocation_clause`, the `trans` keyword, the `rerun_of_invocation` plumbing in `run_request.py` and `services/workflows.py`, and the model, schema and client changes are all new feature code, not reshaped `dev` code.

## How the replay was resolved

Only `invocations.py` conflicted, in three commits:

- **`d4c7eaf9877`** (was `bd240892b03`): the original per-invocation lineage block moved, unchanged, from the single serializer into the batch loop. The single serializer delegates with `trans=trans`. `_can_access_invocation` is unchanged.
- **`d153a492623`** (was `cfec8278da0`): the same intent, adapted. `trans` becomes keyword-only and required on both methods, and the loop drops its `trans is not None` guard.
- **`a16df27f2a7`** (was `8d8d0f7698d`): resolved to the original head's file verbatim. Its diff now shows only the lineage batching: 102 lines in `invocations.py`, down from 121.

The other commits applied cleanly. Each replayed commit differs from its original only in `invocations.py`, and only in where the lineage code sits.

## New history (on `origin/dev` `7e16f446410`)

```
9bf74e3ee40 Serialize workflow invocations in one batch path   (new refactor)
d4c7eaf9877 Persist workflow invocation rerun lineage with indexed source links
62890f1a08a Show invocation rerun lineage and submit sources from both run forms
d153a492623 Require lineage serializer context and strengthen end-to-end coverage
61be12057a1 Check presence of blank original invocation lineage grid cell
f3f0afeb519 Show invocation rerun markers in the grid screenshot
8e4bfa23c32 Reuse populator helpers in invocation lineage API tests
fc3db18687f Fix invocation lineage migration and regression test typing
a16df27f2a7 Resolve invocation rerun lineage in two queries per batch
```

`git diff 8d8d0f7698d a16df27f2a7` is empty. Nothing was pushed. The fork still has the old `2f12501a61d` history, so the next push needs a force push. Fork CI on `2f12501a61d` is for a tree that differs from `fc3db18687f` only in where the lineage code sits in `invocations.py`.

## Tests

- **Refactor commit `9bf74e3ee40`, which is `dev` behavior.** `lib/galaxy_test/api/test_workflows.py -k "invocation or cancel"`: 33 passed. These cover invocation show, index, cancel, import and export.
- **Replayed pre-batch commit `fc3db18687f`.** `test_workflows.py -k "rerun_lineage or rerun_access"`: 2 passed.
- **Head `a16df27f2a7`.** `test/unit/webapps/galaxy/services/test_invocations_lineage.py`: 3 passed. `test_workflows.py -k "rerun_lineage or rerun_access"`: 2 passed.
- black and ruff are clean on `invocations.py` at each commit that was rewritten (`9bf74e3ee40`, `d4c7eaf9877`, `d153a492623`).
