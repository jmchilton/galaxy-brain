# Scope evaluation: workflow_editor_selector_escaping

**Recommendation: expand** with one small piece: route `workflow_run_specify_inputs` through `css_attribute_value` and add a run-form E2E test whose workflow input label has a `'`. That way the new helper serves its second real consumer in the same module and fixes the same bug class in the run form. The connection helpers gxui drives also hit that run-form path with free-text input labels. Keep everything else as implemented. Leave all the other options out. Don't fold this branch back into the parent.

Size: `git diff --stat 9699ec45644..HEAD` gives +66/−8 across 3 files (74 lines), so this report has no "Possible Decompositions" section.

## As implemented

Adds `css_attribute_value` (escapes `\` and `'`), switches `connector_for` / `connector_invalid_for` to `[id='…']`, and escapes node labels, terminal names and connector ids in the `workflow_editor_*` helper chain. It also adds one E2E test covering both ref shapes, connect, destroy and save. This is item A of the parent's round-2 scope evaluation, plus the `[node-label=…]` fold-in that item suggested.

| Pros | Cons |
|---|---|
| <ul><li>Covers all of parent item A, including its optional node-label note.</li><li>Red evidence for each piece (terminal name, connector id, step label). Green on both backends. Codex and the thermo review found nothing.</li><li>Small, and the escape sits at the existing choke point (`workflow_editor_node_and_terminal`).</li></ul> | <ul><li>`css_attribute_value` has one real unwired consumer in the same module (`workflow_run_specify_inputs`), and the same `'` bug is still live there.</li><li>`node_and_terminal` returns a pre-escaped name (boundary smell flagged by the thermo review).</li></ul> |

## Expand 1: escape `workflow_run_specify_inputs` (recommended)

Pass `css_attribute_value(label)` into `workflow_run.input_data_div(label=…)` (`[step-label='${label}'] .multiselect`). Add a run-form E2E test (via `workflow_run_open_workflow` / `workflow_run_specify_inputs`, e.g. the `framework.py:1411` run helper) on a workflow whose data input label holds a `'`.

| Pros | Cons |
|---|---|
| <ul><li>Same bug class and same helper, applied in a one-line change to the module the branch already touches.</li><li>The thermo review's consumer search named it as the concrete second consumer, and the helper fits it as written (single-quoted target).</li><li>Labels come from test-data YAML keys / workflow input labels (`WorkflowRunDefaultStep.vue` `:step-label="model.step_label"`), which are free text. gxui-driven runs on real workflows can reach it.</li><li>Makes the helper a general "attribute selector value" utility rather than an editor-only one.</li></ul> | <ul><li>It touches a different feature (the run form), so the branch name and PR title would need to read as "test-driver selector escaping", not just the editor.</li><li>One more E2E test (about 60–90s per backend), and it needs its own red.</li><li>No existing test data uses a quoted label, so this fixes latent breakage, not a failing test.</li></ul> |

<details>
<summary>Details</summary>

- Callers: `framework.py:1411` (the shared run-workflow helper) and `test_workflow_run.py:741`. Two direct `input_data_div` / `input_div` uses in `test_workflow_run.py` (184, 643) pass literals (`input1`, `input_int`) and need nothing.
- `input_div` (`[step-label='${label}']`) has no helper caller that takes free text, so leave it alone.
- Red test sketch: a format2 workflow with one data input labelled e.g. `Bob's reads` feeding `cat1`, plus test data keyed by that label. Before the fix `input_data_div` fails the selector parse. After it, the run submits and the API confirms the invocation.

</details>

## Expand 2: extend `css_attribute_value` to `"` for `upload_activity_helpers.py`

Also escape `"` and adopt the helper for the double-quoted `[data-label="{label}"]` selectors (`upload_activity_helpers.py:607`, `:625`).

| Pros | Cons |
|---|---|
| <ul><li>`\"` is valid in both quote styles, so one helper would cover every quoted attribute selector.</li><li>The upload labels are free text.</li></ul> | <ul><li>A different subsystem (upload activity) in a different module (`galaxy_test.selenium`), with no current failure.</li><li>Needs an upload-flow E2E red test, which is unrelated to the editor.</li><li>Better done when someone wires that site. The helper change is trivial then.</li></ul> |

## Expand 3: `data-output-name` and XPath targets

Escape `workflow_output_toggle*` (`[data-output-name='${name}']`) and the XPath `output_data_row`.

| Pros | Cons |
|---|---|
| <ul><li>Closes the remaining unescaped editor-adjacent targets.</li></ul> | <ul><li>The consumer search found only literal `out_file1` / `out_file2` callers, so there is no reachable bug.</li><li>XPath needs a different quoting scheme (`concat(…)`), which means a second helper with no caller.</li></ul> |

## Expand 4: `#` inside a label in `"label#terminal"` refs

Make string refs unambiguous when a node label contains `#` (e.g. split on the last `#`, or escape it).

| Pros | Cons |
|---|---|
| <ul><li>Removes a documented footgun in the parent's ref grammar.</li></ul> | <ul><li>A terminal name can contain `#` too, so neither split point is right in general. A real fix is a grammar change to the parent's `EditorTerminalReference`.</li><li>Tuple refs already handle it, and the caveat is documented.</li><li>It is a parsing issue, not a selector escape, so it is out of this branch's theme.</li></ul> |

## Expand 5: newlines and control characters

Escape `\n` and other control characters as CSS hex escapes (`\a `).

| Pros | Cons |
|---|---|
| <ul><li>A fully general CSS string escape.</li></ul> | <ul><li>Editor and run-form labels are single-line inputs, so this is unreachable through the UI.</li><li>Adds code and a test for a case no one can produce.</li></ul> |

## Expand 6: the ~30 direct `node._(label=...)` test calls

Route the direct `editor.node._(label=…)` calls in `test_workflow_editor.py` through `workflow_editor_node` or escape them.

| Pros | Cons |
|---|---|
| <ul><li>Uniform label handling across the suite.</li></ul> | <ul><li>Every one passes a literal, quote-free label, so it fixes nothing.</li><li>Churns about 30 call sites in a ~2300-line file. That diff would dwarf the fix.</li><li>A migration like that belongs with a broader test-file cleanup, not an escape fix.</li></ul> |

## Fold back into the parent

Squash these three commits into `workflow_editor_connection_helpers` and drop this branch.

| Pros | Cons |
|---|---|
| <ul><li>Neither branch has a PR yet, so folding is mechanically possible.</li><li>The parent's round-2 evaluation recommended A as part of the parent, and this would give one PR whose published helpers are correct from the start.</li></ul> | <ul><li>John explicitly deferred A to a follow-up on 2026-10-22. Folding back would reverse that decision without new information.</li><li>The parent is hardened twice. Folding means re-hardening, and `galaxy_ui_driver` would have to restack again.</li><li>As a separate stacked PR it stays small and easy to review.</li></ul> |
