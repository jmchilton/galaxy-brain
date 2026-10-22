# Codex review: workflow_editor_selector_escaping

Codex (`codex exec -s read-only`) reviewed `9699ec45644..21508cf7686`. It reported no findings, so nothing needed acting on.

## Not acted on

- Nothing. Codex returned an empty findings array.

<details>
<summary>Full review</summary>

**Brief:** make the editor helpers work for steps and terminals whose names contain spaces, `'` or `\`:
- add `css_attribute_value`;
- route terminal names, node labels and connector ids through it;
- switch the connector targets to `[id='…']`;
- add the new E2E test.

Codex was asked for concrete defects only, plus missed or duplicated abstractions.

**Files reviewed:**
- the diff;
- `navigation/components.py` and `data.py`;
- `smart_components.py`, `has_playwright_driver.py` and `playwright_elements.py`;
- `WorkflowEdges.vue`, `NodeInput.vue` and `NodeOutput.vue`.

**Coverage notes, verbatim:** "Reviewed the full diff and surrounding selector construction and backend handling. E2E tests were not run. An auxiliary DOM selector check could not run because jsdom was unavailable."

**Findings:** `[]`

</details>
