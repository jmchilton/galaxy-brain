# Scope evaluation: workflow_editor_selector_escaping (round 2)

**Recommendation: keep as implemented.** Round 1's expansion (the run-form `[step-label='…']` escape plus its E2E test) is done, and every free-text-label site that a shared helper reaches through a single-quoted CSS target now goes through `css_attribute_value`. The closest remaining candidate is making the helper quote-agnostic (also escaping `"`) and wiring it into the double-quoted `[data-label="…"]` lookups in `upload_activity_helpers.py`. That would be the first follow-up. Every caller of those lookups passes a literal label, in this tree and in the `galaxy_ui_driver*` worktrees, so it fixes no reachable bug. It would also park the branch for a second re-scope. Don't contract, and don't fold back into the parent.

Size: `git diff --stat 9699ec45644..HEAD` gives +117/−24 across 4 files (141 lines, all hand-written; 21 of them in `navigates_galaxy.py` / `navigation.yml`, the rest tests).

## Possible Decompositions

The dependencies between the 5 commits:
- `1d4137a20d7` (`css_attribute_value` plus connector `[id='…']`) is needed by both fixes.
- `fd9d178684f` (`_saved_step_connections_by_label`) feeds `a1b763b1e30`, the editor fix and test.
- `ae7e6cf9b2d` (`_wait_for_single_invocation`) feeds `7ba4f7bd25f`, the run-form fix and test.

| Option | Pieces, in landing order |
|---|---|
| A. One PR | All 5 commits as they stand. |
| B. Refactors, then fixes | 1. Commits 1–3, which change no behavior. 2. Commits 4–5, the fixes and their tests. |
| C. By surface | 1. Editor: commits 1, 2, 4. 2. Run form: commits 3 and 5, stacked on piece 1, which supplies commit 1. |

Option C's run-form PR is the round-1 expansion on its own, and `_alt_original_scope` (`248fba718cc`) already holds piece 1's tree.

## As implemented (recommended)

Adds `css_attribute_value` (escapes `\` and `'`). Routes node labels, terminal names, connector ids and the run form's `input_data_div` label through it, and switches the connector targets to `[id='…']`. Adds one editor and one run-form E2E test, plus two test-helper extractions.

| Pros | Cons |
|---|---|
| <ul><li>Covers parent item A, the node-label fold-in and round 1's run-form expansion.</li><li>Every fix has red evidence at the selector parse and is green on both backends. Codex found nothing, and the thermo review found nothing structural.</li><li>The escape sits at the existing resolver choke points, with no per-call-site escaping.</li></ul> | <ul><li>The helper is single-quote only, so the double-quoted `[data-label="…"]` sites still break on `"` or `\`.</li><li>`connector_invalid_for` / `try_connect` aren't exercised with escaped labels. That is a coverage gap in shipped code, not a scope change: the target has the same form as the proven `connector_for`.</li><li>Commit 3's thermo fold-in touches the report and export tests, which have nothing to do with escaping. Two export tests time out locally (pre-existing, environmental), so a reviewer may ask why they are in the PR.</li><li>`node_and_terminal` still returns a pre-escaped name (boundary smell, declined by the thermo review).</li></ul> |

## Expand 1: quote-agnostic helper for the `[data-label="…"]` sites (first follow-up)

Make `css_attribute_value` also escape `"` (`\"` is valid in both quote styles) and drop "single-quoted" from its docstring. Use it at `upload_activity_helpers.py:607` / `:625` (`UploadMethodInlineContext`, reached through `upload_inline(label=…)`) and at any free-text `workflow_run.input._(label=…)` / `collection_builder._(label=…)` caller. Add one red E2E test whose workflow input label contains `"` or `\`, driven through `upload_inline` (`_upload_hello_world_for_input` is the existing pattern).

| Pros | Cons |
|---|---|
| <ul><li>Same label value as round 1's fix: in the simplified run form, `FormElement.vue` sets `:data-label="props.title"`, which is the free-text workflow input label.</li><li>`\` breaks a double-quoted selector too, and the editor test already treats `\` as a real label character, so this is not only about `"`.</li><li>The helper change is a few characters. Two lines change at the call sites.</li><li>The gxui stack moves `upload_activity_helpers.py` into `lib/galaxy/selenium`, which makes `upload_inline` library surface.</li></ul> | <ul><li>Every caller is a literal (`"input1"`, `"input_list"`, `INPUT_LABEL = "input1"`), in this tree and in the `galaxy_ui_driver`, `_editor_refs` and `_gxui` worktrees. No non-test code calls `upload_inline`. Round 1's fix differed: `workflow_run_and_submit` feeds caller-supplied labels into `workflow_run_specify_inputs`.</li><li>It is a second re-scope, which parks the branch (BLOCKED) instead of re-scoping. Round-1 reviews would still apply. Still needed: a new red/green on both backends, the review, and a test-challenge refresh.</li><li>A different module and upload flow, about 60–90s of E2E per backend.</li><li>It is cheaper to fold into the gxui stack, which is already moving that file.</li></ul> |

## Expand 2: simplified-form support in `workflow_run_specify_inputs`

Let `workflow_run_specify_inputs` find inputs by `data-label` when the simplified form doesn't render `step-label`, instead of the caller having to expand the form first.

| Pros | Cons |
|---|---|
| <ul><li>It is a real functional gap in the function the branch touched. gxui runs on real workflows can hit it.</li><li>It would build on Expand 1's quote-agnostic helper.</li></ul> | <ul><li>It is a different bug class (form mode, not escaping), and it was there before the branch.</li><li>It needs new navigation targets and design work: which multiselect inside the simplified `FormElement`, and the fallback order between forms.</li><li>It would turn an escaping PR into a run-form-driver PR.</li></ul> |

## Round-1 rejects, re-checked

Nothing new changes these, so they stay out:
- **XPath `data-label` / `data-output-name` targets.** XPath needs `concat(…)` quoting, which means a second helper. Callers are still literal only, and the rescope review confirmed this for the `simplified_*` / `input_select_field` targets.
- **`#` inside a label in `"label#terminal"` refs.** This is a grammar issue in the parent's `EditorTerminalReference`, not escaping. Tuple refs already work around it.
- **Control characters.** Labels are single-line inputs, so no one can produce them through the UI.
- **About 30 literal `node._(label=…)` calls.** All are quote-free literals, so changing them is churn with no fix.
- **Fold back into the parent.** John deferred item A on 2026-10-22, and nothing has changed since.

## Contract 1: back to `_alt_original_scope`

Drop commit 5 and its helper commit 3, leaving the editor-only branch at `248fba718cc`.

| Pros | Cons |
|---|---|
| <ul><li>A smaller, editor-only PR.</li></ul> | <ul><li>Reverses round 1's expansion with no new information.</li><li>Leaves the same `'` bug live in the shared run helper.</li></ul> |

## Contract 2: drop the thermo fold-in from commit 3

Restore the two report tests and `_setup_simple_invocation_for_export_testing`. Keep `_wait_for_single_invocation` only for the tests that need the full invocation.

| Pros | Cons |
|---|---|
| <ul><li>Keeps unrelated report and export tests out of an escaping PR, so the local export timeouts aren't in its blast radius.</li></ul> | <ul><li>Leaves the extraction half-applied, which the thermo review called a defect.</li><li>One extra GET per test is the only cost of keeping it, and CI covers the export tests.</li></ul> |
