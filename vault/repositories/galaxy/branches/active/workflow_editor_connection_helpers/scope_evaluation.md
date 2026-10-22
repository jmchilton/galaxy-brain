# Scope evaluation: workflow_editor_connection_helpers

**Recommendation: expand.** Two pieces. (1) Let the editor connection helpers take a step by number as well as by label: make `workflow_editor.node._` a selector list `["[node-label='${label}']", "#wf-node-step-${id}"]`, following the precedent of `history_panel.content_item._`; let terminal refs accept `(EditorNodeReference, terminal)`; and add an E2E test that connects and disconnects two unlabelled steps of the same tool. (2) Rename the moved generic asserts to `workflow_editor_assert_*` in the move commit. Unlabelled steps of one tool share a `node-label`, so today the label-only helpers silently act on the first matching node. That is a latent wrong-node bug in the code this branch publishes, and it is why gxui carries about 60 lines of id-based fallback (`_drag_connection`, `_tooltip`, the hover-delete and `.node-destroy` paths). Both pieces stay within test infra on `release_26.2` and change no product behaviour. The thermo review declined the rename because gxui calls those names, but that blocker doesn't hold: gxui calls only `workflow_editor_try_connect`, `workflow_editor_destroy_connection` and `workflow_editor_remove_node`. The mixin, the backend-agnostic waits and rebuilding `connect` on `drag_over` stay out.

Head `b5c2a4506fd` (`index.md` still says `8380a8c1026`) on `release_26.2` `7febcc1d683`. `git diff --stat`: +119/−61 across 5 files, all hand-written (180 changed lines; `navigation.yml` is not generated).

## Possible Decompositions

The existing commits already fall into three logical pieces. These are options only; nothing here recommends a split.

**Option 1: three PRs along commit lines.**
1. **Drag-timing fix:** `f699b080a32` (`has_playwright_driver.py` plus the `test_has_driver.py` docstring). It is independent of the rest and can land first or in parallel. Its only regression guard is the E2E test in piece 3, or the one-off repro in `test_challenges_debrief.md` if it lands alone.
2. **Refactor, no behaviour change:** `2514981f5dc` (the move), `4b4be9b0b7b` (`workflow_editor_node_and_terminal`) and `b19f0095a17` (`workflow_editor_source_sink_terminal_elements`). The rename would go here. It is reviewable as a pure move plus dedup.
3. **Feature:** `28380b8083e` (`try_connect`, `remove_node`, the `navigation.yml` targets and the new test) and `b5c2a4506fd` (the `remove_node` reuse). It needs piece 2, and needs piece 1 to be green on Playwright. Step-number refs would land here or as a 3b.

**Option 2: two PRs.** Pieces 2 and 3 together as one "editor connection helpers + coverage" PR, with the drag fix separate. The drag fix touches every `drag_over` caller, so it gets its own reviewer attention.

**Option 3: one PR, as now.** At 180 lines with clean commit boundaries, one PR stays reviewable commit by commit.

`galaxy_ui_driver` needs pieces 2 and 3. Restack it after any split or rewrite.

## Scopes considered

### As implemented

Lift six connection helpers onto `NavigatesGalaxy`, dedup the `label#terminal` parse, add `workflow_editor_try_connect` (returns the refusal reason) and `workflow_editor_remove_node`, fix the timing of Playwright's synthetic `dragenter`, and add one E2E test covering refuse/connect/disconnect/reconnect/remove/save.

| Pros | Cons |
|---|---|
| <ul><li>Small, coherent, green on both backends; red checks recorded for both the helpers and the drag fix.</li><li>The drag fix is in the right layer (the driver) and is minimal.</li><li>Already consumed by gxui, which is stacked on it.</li></ul> | <ul><li>Label-only refs: with duplicate labels the helpers act on the first match, so gxui keeps its own id-based copies of connect/disconnect/remove.</li><li>Publishes generic `assert_connected`/`assert_not_connected`/`assert_input_mapped` names on a 3.4k-line shared class; this move is the cheapest moment to prefix them.</li><li>Leaves the "general piece" half-built, which is the narrow pattern the process doc warns about.</li></ul> |

### Expand A: step-number terminal refs (recommended, with B)

Make the node component addressable by step id as well as label, using a selector list on `_` (the same mechanism `history_panel.content_item._` already uses at `navigation.yml:212`). `workflow_editor_node_and_terminal` then accepts `str` (`label#terminal`) or `tuple[EditorNodeReference, str]`. Add an E2E test that connects and disconnects two unlabelled same-tool steps by number. `workflow_editor_ensure_tool_form_open` can drop its own `node.by_id` branch for the shared lookup.

| Pros | Cons |
|---|---|
| <ul><li>Fixes a latent wrong-node bug in helpers this branch publishes.</li><li>Lets gxui delete about 60 lines of fallback plus its `_unique_label` gating, so the CLI and the test suite run one code path.</li><li>No duplication in `navigation.yml`: every `${_}` child binds through the list automatically.</li><li>Reuses the existing `EditorNodeReference` type, so no new vocabulary.</li></ul> | <ul><li>Adds a new test and roughly 30–50 lines; another E2E run on both backends.</li><li>Changing the `_` selector for `node` touches every `node._(label=...)` caller's resolution path. It should be behaviour-identical for label kwargs, but needs the editor suite in CI.</li><li>Tuple refs are a second ref shape; `label#terminal` strings stay for the existing callers.</li></ul> |

<details>
<summary>Details</summary>

- **Ref format.** A `"3#output"` string can't tell step 3 from a step labelled "3", so a numeric ref has to come in by type. `EditorNodeReference = int | str` already makes that int-vs-str split for the form helpers. A tuple `(3, "output")` keeps it, and plain strings keep the current meaning.
- **Selector list.** `SelectorTemplate.selector` tries each list entry until `string.Template.substitute` succeeds (`components.py:139`). `node._(label=x)` resolves through entry 1 and `node._(id=3)` through entry 2. Children such as `output_terminal`, `input_terminal_dragging` and `connector_destroy_callout` get the bound `_`.
- **Related, in touched code.** `workflow_editor_source_sink_terminal_elements` builds `#{id}` with only `|` escaped. gxui's `_by_id` notes that terminal ids can hold spaces too, and uses an attribute selector. Switching to `[id="..."]` while here would fix that case for both `connect` and `try_connect`.
- **gxui follow-through.** `workflow-connect` keeps its UX_RENDER retry for terminal types that settle late. That behaviour is gxui-specific and stays in the verb.

</details>

### Expand B: `workflow_editor_` prefix on the moved asserts (recommended, with A)

Rename `assert_connected`, `assert_not_connected`, `assert_connection_invalid`, `assert_input_mapped` and `assert_input_not_mapped` to `workflow_editor_assert_*` in the move commit, and update the 70 call sites in `test_workflow_editor.py`.

| Pros | Cons |
|---|---|
| <ul><li>Matches the other roughly 40 `workflow_editor_*` helpers on `NavigatesGalaxy`.</li><li>Cheapest now: the names first become public on the shared class in this branch.</li><li>Refutes the review's blocker: gxui calls none of these names (grep of `galaxy_ui_driver_gxui` `lib/galaxy/selenium/gxui`).</li><li>Purely mechanical, single file.</li></ul> | <ul><li>About 70 changed call-site lines turn the move commit from a pure move into move+rename. Keep it as a separate rename commit for review.</li><li>Small conflict risk with other branches editing `test_workflow_editor.py`: `workflow_editor_run_cancel` (+16) and `selenium_tool_form_helpers` (+17) touch it. Mechanical to resolve.</li></ul> |

### Expand C: `NavigatesWorkflowEditor` mixin

Move every `workflow_editor_*` helper (about 40 methods) out of `NavigatesGalaxy` into a dedicated mixin, mixed back in so names keep working.

| Pros | Cons |
|---|---|
| <ul><li>Addresses the 3.4k-line god class.</li><li>Has a precedent: `UsesUploadActivity` in `selenium_standalone_package`.</li></ul> | <ul><li>Hundreds of moved lines, almost all predating the branch; not modest.</li><li>A repo-wide structural change belongs on dev, not `release_26.2`.</li><li>Conflicts with every in-flight branch that adds editor helpers.</li></ul> |

### Expand D: backend-agnostic "rendered" wait

Add a SmartTarget-level wait that treats an SVG `<g>` as rendered on Playwright, and drop the `backend_type` branch in `assert_connected`.

| Pros | Cons |
|---|---|
| <ul><li>Removes a backend branch from editor code.</li></ul> | <ul><li>The thermo review overstated the payoff: of the nine `backend_type` checks in `navigates_galaxy.py`, only `assert_connected` (line 1372) is a visibility wait. The others are `connect`'s screenshot drag (see E), action shims (shift-click, file input, keys, `mouse_drag`), the `driver`/`page` accessors and the hid wait.</li><li>A new SmartTarget API for one caller in moved code is a poor trade.</li></ul> |

### Expand E: rebuild `workflow_editor_connect` on `drag_over`

Replace `connect`'s roughly 25 lines of per-backend mouse screenshot code with the `drag_over` path that `try_connect` uses.

| Pros | Cons |
|---|---|
| <ul><li>Deletes a backend branch; `connect` and `try_connect` share one mechanism.</li></ul> | <ul><li>Changes what existing screenshots capture: mid-drag near the source versus over the sink.</li><li>Swaps the real pointer drag for a synthetic HTML5 drag at 22 existing call sites (21 in `test_workflow_editor.py`, 1 in `test_workflow_run.py`). gxui's own fallback deliberately uses a real pointer drag, which is evidence the paths aren't interchangeable.</li><li>The code predates the branch.</li></ul> |

### Expand F: swap the remaining inline remove-node sites

Route the three other `destroy.wait_for_and_click()` + `wait_for_absent()` sites (around lines 273, 297 and 390) through `workflow_editor_remove_node`.

| Pros | Cons |
|---|---|
| <ul><li>More reuse of the new helper.</li></ul> | <ul><li>Those sites keep using the node component for title, label and annotation checks plus screenshots, so the swap would mean an extra lookup and a split flow. `test_challenges_debrief.md` already judged this correctly.</li></ul> |

### Expand G: driver unit test for the drag-timing fix

Add a `basic.html` fixture plus a `test_has_driver.py` test whose `dragstart` sets state asynchronously.

| Pros | Cons |
|---|---|
| <ul><li>Puts the regression next to the driver code; matters most if decomposition piece 1 lands alone.</li><li>The repro is already written (`test_challenges_debrief.md`).</li></ul> | <ul><li>Pins a one-line fix that the E2E test already covers in CI; the process rule for this case says to keep a one-off repro in the debrief instead.</li></ul> |

### Contract

The only real contraction is dropping the two dedup commits (`4b4be9b0b7b`, `b19f0095a17`) and going back to copy-paste parsing.

| Pros | Cons |
|---|---|
| <ul><li>A slightly smaller diff.</li></ul> | <ul><li>Brings back six copies of the `label#terminal` parse; gains nothing.</li><li>Splitting out the drag fix is a decomposition, not a contraction (see above).</li></ul> |
