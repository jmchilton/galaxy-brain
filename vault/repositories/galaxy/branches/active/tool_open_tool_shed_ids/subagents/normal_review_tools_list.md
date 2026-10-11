# Normal review: tools_list selector fold-in (2026-10-11)

This review covers the `tools_list` selector fix and the second E2E test folded into the commit, reviewed at `3546a6302b9`. It found no high or med issues. Applied in `5daa04de087`:
- a `favorite_tool_button` check, so 5 of the 6 changed selectors are now exercised;
- the comment on test 1 now says why it checks the panel, not a form;
- a new commit subject, "Let tool panel and tools list find Tool Shed tools by id".

Not acted on:
- **Assert the tool form opens in test 1.** It can't: `compose_text_param` is special-form, so the click loads into the hidden `galaxy_main` frame. The `UX_RENDER` sleep stays, because the screenshot needs it. This is the same follow-up as before.
- **`open_tool_button` unexercised.** It is hidden for special-form tools (`useToolsListCardActions.ts` `canBeRun`), and it has the same `[id="g-card-action-…-${tool_id}"]` shape as the favorite button, which is checked.
- **The Playwright `By.ID` → `#{value}` divergence** (`has_playwright_driver.py:251`, `:485`). It's out of scope because no caller passes a tool id. Logged as a follow-up.

<details>
<summary>Full review</summary>

**Security:** none.

**Other `#…${…}` selectors.** None take a tool id. `admin.dm_jobs_button` uses the kebab-cased data manager name, and `custom_tools.tool_link` uses a UUID. In Python, `tool_id` appears only in the `id:` search text.

**`[id="..."]`.** This form is already used in `tool_form.parameter_*`, at `:887`, and in `workflow_run` `form-element-${index}`.

**`setUp` install.** `setUp` is right: the install needs the instance-bound interactor. Re-installing returns 200, and the sibling `test_workflow_repository_tool_update.py` installs the same changeset in each method.

**Rename.** `test_tool_shed_tool_ids.py` / `TestToolShedToolIds` is fine.

**Findings**
- **low** (`test_tool_shed_tool_ids.py:26-28`): nothing is asserted after `tool_open`. Either check the tool form, or drop the sleep.
- **low** (`:37-40`): add a `favorite_tool_button` check.
- **nit** (`:25`): the comment restates what `tool_open` does.
- **nit:** the commit subject undersells the change.
- **nit / out of scope:** Playwright `By.ID` builds `#{value}`; it should use the `id=` engine.

**Rest of the commit checked and fine:**
- `utilities.ts`: `includes` instead of regex; the `sanitizeString` callers are safe.
- The vitest case.
- The `tool_panel` link selectors, including the `a.tool-link` restriction, which excludes `ToolFavoriteButton`.

</details>
