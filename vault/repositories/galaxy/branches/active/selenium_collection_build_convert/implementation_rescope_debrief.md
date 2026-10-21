# Re-scope debrief

The [scope evaluation](earlier_drafts/1/scope_evaluation.md) recommended a modest expansion, which I took. It adds one product fix to the component the new convert test drives. Original scope: [alt](alts/original_scope.md) (`97ffab4de3f`).

## Change

New last commit `294dc0dd957` "Disable Convert Collection until a converter is selected":
- `SuitableConvertersTab.vue` had `:disabled="selectedConverter == {}"`, which is always false, so the button was always enabled. Clicking it with nothing selected POSTed to `/api/tools/undefined/convert`. It is now `:disabled="!selectedConverter?.tool_id"`, covering the initial `{}`, a deselect to `null`, and the reset after a click.
- `test_convert_datatype_simple_list` asserts the button is disabled before a converter is picked. The click in `collection_edit_convert` already waits for it to become enabled under both backends.

## Red → green

- Red: with the assertion added and the client built without the fix, Playwright failed at `assert_disabled`.
- Green: after the fix and a client rebuild, `test_collection_edit.py` (3) and the two builder tests pass 5/5 under Playwright and 5/5 under Selenium.

## Review

[Re-scope normal review](subagents/rescope_normal_review.md): no changes. No Vitest was added, because the E2E assertion is red without the fix. The sibling tabs already disable their buttons correctly.

## Not taken

- `00c72c7fa3c` (Apply rules nesting): on 26.2 it needs dev-only `tool_form_fill`.
- Stale tab selection when switching collections on the same route: not reproduced. Follow-up candidate.
