# Scope evaluation: workflow_editor_connection_helpers (round 2)

**Recommendation: expand.** Add two small pieces and keep everything else as implemented.

**(A) CSS-safe terminal and connector selectors.**
- What it fixes: a subworkflow step's terminal names are its inner workflow's free-text input step labels and output labels (`SubWorkflowModule`, `modules.py` ~850 and ~920), so they can hold spaces, `'` or `\`.
- Today `connector_for` / `connector_invalid_for` (`#connection-${sink_id}-${source_id}`) escape only `|`. The `[input-name='${name}']` / `[output-name='${name}']` targets break on a `'`.
- As a result, every `workflow_editor_assert_*` helper and `destroy_connection` this branch publishes fails on such a step.
- The fix:
  - switch the two connector targets to `[id='…']`;
  - add one attribute-value escape (for `\` and `'`) that every terminal-name and connector-id substitution goes through, in place of the `|`-only `replace` in `workflow_editor_source_sink_terminal_ids`;
  - add an E2E test that connects into, asserts and disconnects a subworkflow input whose label has a space and an apostrophe.

**(B) Rename `workflow_editor_set_tool_vesrion` to `workflow_editor_set_tool_version`.**
- The method already goes through this branch's `workflow_editor_node`.
- The thermo review said gxui calls it. A grep of both gxui worktrees (`galaxy_ui_driver_gxui`, `galaxy_ui_driver_editor_refs`) shows it doesn't: the only callers are two lines in `test_workflow_editor.py`.
- So no alias is needed. That is the same false blocker round 1 found for the assert rename.

**Kept out:** the four tests that build their own label map are an optional add-on, not recommended. `node.by_id` removal, the `NavigatesWorkflowEditor` mixin, backend-agnostic waits and rebuilding `connect` on `drag_over` all stay out.

Head `04ce1a3f088` (`index.md` still says `8380a8c1026`) on `release_26.2` `7febcc1d683`.
- `git diff --stat 7febcc1d683..HEAD`: 5 files, +266/−152, which is 418 changed lines, all hand-written (`navigation.yml` is not generated).
- The `77b5ea69434` fold-in that `index.md` mentions is superseded by the re-scope and the polish commit, which the baseline rewrite folded into `204bc521781`.

## Possible Decompositions

After the baseline rewrite, the eight commits fall into clean layers. These are options only; nothing here recommends a split. Commits, oldest first:
1. `262bca43375` move + rename asserts
2. `1e780f1eece` `node_and_terminal`
3. `204bc521781` `source_sink_terminal_elements`
4. `cbc20fd9ebe` order-index refs
5. `863574bbed9` drag fix
6. `e42cf5f49b5` `try_connect` / `remove_node` + refused-connection test
7. `9787ba72208` helper reuse in existing tests
8. `04ce1a3f088` order-index test

**One coupling constrains every split.** `cbc20fd9ebe` (the order-index infra) has only one test, `04ce1a3f088`. Any split that separates them lands untested infra first. Commit 8 also uses `try_connect` and `_saved_steps_with_connections` from commit 6.

**Option 1: four PRs.**
1. **Drag-timing fix:** commit 5 alone. It is independent of the rest. Its only regression guard is commit 6's test, or the one-off repro in `earlier_drafts/1/test_challenges_debrief.md`.
2. **Label-based helper refactor:** commits 1–3, which contain no behaviour change. Expansion A's escaping fits here, since it changes `source_sink_terminal_ids` and the connector targets, but its subworkflow test needs no new helper.
3. **Refused connection + remove step:** commits 6–7 (needs 2, and needs 1 to be green on Playwright). It would need commit 4's ref typing removed from `try_connect` / `remove_node`, or commit 4 moved in.
4. **Step refs by order index:** commits 4 + 8 together. Commit 4 would have to rebase over 6–7, which reverses today's order.

**Option 2: three PRs.** The drag fix (5); the refactor plus order-index refs and their test (1–4, 8, with commit 8 reordered after 6, or its `try_connect` swap reverted to `connect`); then the feature (6–7).

**Option 3: two PRs.** The drag fix separately, because it changes every `drag_over` caller on Playwright; then everything else as one "editor connection helpers + coverage" PR.

**Option 4: one PR, as now.** At 418 lines, about 170 of which are mechanical call-site renames in `test_workflow_editor.py`, it stays reviewable commit by commit.

Expansion A would land as one commit after 3 (or after 8), and B as a one-commit rename anywhere. `galaxy_ui_driver` needs every piece except the drag fix and the order-index test, so restack it after any split.

## Scopes considered

### As implemented

The branch:
- lifts the connection helpers onto `NavigatesGalaxy` as `workflow_editor_assert_*`;
- dedups the ref parsing;
- addresses steps by label or order index (`node._` selector list, `EditorTerminalReference`, `workflow_editor_node`);
- finds drag terminals through the node component;
- adds `try_connect` and `remove_node` and reuses them in existing tests;
- fixes Playwright's synthetic `dragenter` timing;
- adds two E2E tests.

| Pros | Cons |
|---|---|
| <ul><li>Round 1's expansion is done and reviewed. Codex found nothing, and the thermo review calls the helper layer "the right shape".</li><li>Green on both backends, with a meaningful red for each test.</li><li>gxui already consumes it with step-number refs, and its mouse-drag fallback is gone.</li></ul> | <ul><li>The connector and attribute selectors still break on terminal names that subworkflow labels can produce (see A). The published `assert_*` helpers and `destroy_connection` are wrong for those steps.</li><li>gxui keeps its own `_by_id` / `[id^=…]` edge waits in `workflow-connect` and `-disconnect` (`verbs.py` ~1605, ~1647) instead of the shared assert helpers.</li><li>Leaves a misspelled public helper next to methods the branch rewired.</li></ul> |

### Expand A: CSS-safe terminal and connector selectors (recommended)

Make every terminal and connector lookup safe for any terminal name:
- `connector_for` / `connector_invalid_for` become `[id='…']` attribute selectors;
- one escape for `\` and `'` covers both the ids passed to them and the `name=` values for `input_terminal` / `output_terminal` / `connector_destroy_callout` / `input_terminal_dragging`;
- add an E2E test on a subworkflow input labelled with a space and an apostrophe.

| Pros | Cons |
|---|---|
| <ul><li>Fixes a reachable bug in helpers this branch makes public, and in code it touches: `_terminal_ids` already carries the `|`-only escape.</li><li>Completes what the polish commit started. Drag lookups went through the component, but asserts and destroy did not.</li><li>gxui can then use `workflow_editor_assert_connected` / `assert_not_connected` for its edge waits instead of its own `_by_id`.</li><li>Three review rounds raised it (rescope review, polish, thermo) and called it "small".</li></ul> | <ul><li>Changes the selector of every connection assert (about 70 call sites). The new selector should match the same elements, but the editor suite in CI has to confirm that.</li><li>Needs a subworkflow fixture with an odd label, so one more E2E test (about 60–90s per backend).</li><li>The escape helper is new vocabulary. It has to live in one place: next to `workflow_editor_node_and_terminal`, or as a `SelectorTemplate`-level helper if one already exists.</li></ul> |

<details>
<summary>Details</summary>

- **Reachability, by code reading (not run).**
  - `NodeInput.vue:82` builds `id` as `node-${stepId}-input-${input.name}`, and `:input-name="input.name"`. `NodeOutput.vue:282` and `:425` mirror it.
  - `SubWorkflowModule.get_all_inputs` names each input after the inner step's `label`, and outputs use workflow-output labels. Both are free text.
  - gxui's own `_by_id` docstring says: "Terminal ids embed input names, which may hold spaces or `|`."
- **What already works.** Since `204bc521781`, drag lookups use `[input-name='${name}']`, so spaces are fine for `connect` / `try_connect`. A `'` still isn't. The connector asserts and `#connection-…` still fail on spaces too.
- **Red test.** Connect a data input into a subworkflow whose inner input is labelled, e.g. `reads (Bob's)`. `workflow_editor_assert_connected` should time out before the fix and pass after. `test_edit_subworkflow` / `test_change_datatype_in_subworkflow` already build subworkflow fixtures, so reuse their YAML shape.
- **Not in A.** `node._`'s `[node-label='${label}']` has the same `'` gap for step labels. Folding it into the same escape is cheap and in touched code, so include it if the escape lives in `workflow_editor_node`.

</details>

### Expand B: fix `workflow_editor_set_tool_vesrion` (recommended)

Rename the method to `workflow_editor_set_tool_version` and update its two callers (`test_workflow_editor.py` ~1021, ~1043).

| Pros | Cons |
|---|---|
| <ul><li>About 3 lines. It sits in the same helper group the branch already routes through `workflow_editor_node`.</li><li>The thermo review deferred it on the grounds that gxui calls it. That is false: grep finds no gxui caller in either gxui worktree.</li><li>This is the cheapest moment, while editor helpers are being made a public surface for gxui.</li></ul> | <ul><li>Not strictly part of the connection theme.</li><li>A trivial conflict with any other branch that calls it. None found in the gxui stack.</li></ul> |

### Expand C: route the four label-map tests through `_saved_steps_with_connections` (optional, not recommended)

The tests around lines 483, 519, 574 and 653 build `{step["label"]: step}` from `index_ids(search=name)`. They could use the shared helper, which returns full step dicts, so they can still reach `tool_state`.

| Pros | Cons |
|---|---|
| <ul><li>Removes four copies of a pattern the branch now has a helper for.</li></ul> | <ul><li>Changes how those tests find the workflow (search by name vs. the current editor's workflow), which is a behaviour change in unrelated tests.</li><li>The helper's `inputs` shape is unused by them, so the reuse is partial. The test challenge declined it for the same reason.</li></ul> |

### Expand D: delete `workflow_editor.node.by_id`

Replace its 16 callers (undo/redo ×15, clone ×1) with `node._(id=)`.

| Pros | Cons |
|---|---|
| <ul><li>Removes a duplicate selector.</li></ul> | <ul><li>Churns an unrelated test file for no behaviour change.</li><li>`navigation.yml` is a shared contract. Other branches or the client tooling may reference `by_id`.</li></ul> |

### Expand E: `NavigatesWorkflowEditor` mixin

Split the roughly 200 lines of editor helpers out of the 3.4k-line `NavigatesGalaxy`.

| Pros | Cons |
|---|---|
| <ul><li>Addresses the god class; precedent `UsesUploadActivity`.</li></ul> | <ul><li>Hundreds of moved lines that predate the branch. A structural change for dev, not `release_26.2`.</li><li>Conflicts with every in-flight editor-helper branch (`workflow_editor_run_cancel`, `selenium_tool_form_helpers`, gxui).</li></ul> |

### Expand F: backend-agnostic "rendered" wait

A SmartTarget wait that treats SVG `<g>` as rendered on Playwright, which would remove `assert_connected`'s `backend_type` branch.

| Pros | Cons |
|---|---|
| <ul><li>One fewer backend branch.</li></ul> | <ul><li>It is the only visibility-type branch of about eight `backend_type` checks. The rest are action shims and accessors, so a new SmartTarget API would serve one caller.</li></ul> |

### Expand G: rebuild `workflow_editor_connect` on `drag_over`

| Pros | Cons |
|---|---|
| <ul><li>Deletes about 25 lines of backend-specific mouse code; `connect` and `try_connect` share one mechanism.</li></ul> | <ul><li>Swaps a real pointer drag for a synthetic HTML5 drag at about 22 existing call sites, and changes what their screenshots capture.</li><li>Predates the branch.</li></ul> |

### Contract

Options considered:
- **Drop the order-index refs** (`cbc20fd9ebe` + `04ce1a3f088`), going back to the alt `_alt_original_scope`.
- **Drop the reuse commit** (`9787ba72208`).

| Pros | Cons |
|---|---|
| <ul><li>Smaller diff (about 150 fewer lines without order-index).</li></ul> | <ul><li>Brings back the wrong-node bug for unlabelled same-tool steps, which gxui now relies on being fixed (`df78f64ec31` removed its fallback).</li><li>Dropping the reuse commit leaves the new helpers with fewer callers and inline copies in existing tests, so nothing is gained.</li></ul> |
