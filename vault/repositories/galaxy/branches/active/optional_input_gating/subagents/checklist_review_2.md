# optional_input_gating — PR checklist review 2 (2026-10-27)

Evaluated at `d30e97407ec` (5 commits on `origin/dev` `a9a68082414`): `b48099d525a` pick-value Selenium cleanup, `37626a463fb` helpers, `51135b468c7` orphan fix, `e669ab80a52` baseline framework tests (+ ungated control), `d30e97407ec` feature. Read-only. Previous review: [checklist_review.md](checklist_review.md) at `b158809f396`.

## Paste-ready checklist

### PR checklist

- [x] What does the user see when it fails?
  Drop targets turn green/red with a tooltip naming the specific blocker, gating asks for confirmation first, and hand-written conditions are read-only and need a confirm to replace.
  <details>

  - Gateable drop: green terminal, "Drop to connect and run this step only when X is provided.", then a "Run this step conditionally?" confirm. Declining changes nothing.
  - Blocked gate: when optionality is the only direct failure, the tooltip gives the gate blocker ("This step type cannot run conditionally.", "This step already has a condition.", "No presence gate can be written for this input.") in place of "Cannot connect an optional output to a non-optional input" (see row 1: consider showing both). Genuine mismatches keep their direct reason.
  - Changing a step's condition drops links whose gate port disappears, without a toast. One undo restores them.
  - A condition the evaluator can't decide is accepted; if the step then runs without its input, the job fails at run time on the missing required input, as on `dev`.
  </details>
- [ ] Is the diff free of unrelated or stale generated changes?
  No: commit 1 (pick-value `select_set_value` cleanup) is unrelated to gating, though isolated in its own commit. No generated changes.
- [x] Are unit tests not just testing the literal implementation?
  Yes.
- [x] Are baseline tests in their own leading commits (if applicable)?
  Yes.
- [x] Are the comments free of excess archeology?
  Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve?
  N/A

### Workflow-related

- [x] Which existing workflows change behavior (if any)?
  None at run time. In the editor, imported presence-gated and twin-dispatch workflows stop showing invalid connections; all 186 IWC `$(inputs.when)` conditions open as boolean conditions.
- [x] Who hits this in practice and what is the evidence?
  Authors gating a step on an optional dataset: IWC's virology workflow uses `map_param_value` + `pick_value` to gate `ivar trim` on its optional primer scheme; related runtime reports #20804, #20182.
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not?
  Yes: the two-step workaround (two extra steps per gate, still flagged invalid), an implicit runtime skip (silently changes every workflow), and validity-only / evaluator-free splits (scope evaluation).

## Review notes (evidence and fixes)

| # | Item | Verdict | Evidence | Suggested fix | Judgement call? |
| --- | --- | --- | --- | --- | --- |
| 1 | Failure UX | PASS, with a regression nit | `terminals.ts` `assessDrop`: direct accept → connect; gated path fails → direct reason; gated path passes → `presenceGateBlocker()` reason **instead of** the direct reason, or the gate offer. Review 1's gap (gate reasons unreachable) is closed. **But the blocker now replaces the primary reason:** on `dev` a pause step (or a step with an unrelated `when`) showed "Cannot connect an optional output to a non-optional input"; now it shows only "This step type cannot run conditionally." / "This step already has a condition.", and `NodeInput.test.ts:165` asserts `not.toContain("Cannot connect an optional output")`. A user who doesn't know about gating learns why the workaround is unavailable but not why the connection fails. Smaller nits: "No presence gate can be written for this input." is now user-visible, uses internal jargon (the form says "Run when an input is provided") and isn't asserted at the NodeInput level. "This step already has a condition." doesn't say what to do. The orphan drop is still silent (listed under Risks). | In `assessDrop`, return the direct reason with the blocker appended, e.g. `new ConnectionAcceptable(false, \`${direct.reason} ${blocker.reason}\`)` → "Cannot connect an optional output to a non-optional input. This step type cannot run conditionally."; flip the `not.toContain` to `toContain`. Reword the jargon string, e.g. "Galaxy can't write a condition for this input." | Yes |
| 2 | Unrelated changes | FAIL (minor) | `b48099d525a` touches only `test_workflow_editor.py`: deletes `_pick_value_select_mode` and switches the two pick-value tests to `tool_form.parameter_select(parameter="mode")` + `select_set_value`. It's not a prerequisite: polish_e2e_tests_debrief records it as a style cleanup ("replaces dev's JS-click `_pick_value_select_mode`") made while switching gate-mode picks to `select_set_value`. The feature's `_set_step_gate_mode` uses `step_when`, not the pick-value helper. Everything else is related: `filter` mocks in FormDefault/FormTool tests are needed because FormConditional now renders `FormSelect`; `workflowId` plumbing in Index.vue/FormOutputLabel.vue serves the orphan-drop action; docs page documents the feature. No generated files. | Split commit 1 into its own small PR (or drop it) so the answer is just "Yes!", per GENERAL.md usage. | Yes |
| 3 | Tests not literal | PASS | Behavioral: YAML spec round-trips generated expressions through the evaluator; undo/redo compared against whole-workflow snapshots; NodeInput uses real stores and mocks only the confirm dialog; new collection test was shown to go red when the `isPresenceGated` clause is removed. FormConditional fold: the props-only test is gone, merged into the full-mount "renders a hand-written expression as read-only text without rewriting it" (preview text, no `input`, zero emitted updates). Remaining coupling: NodeInput reads the reason via a stubbed `v-g-tooltip` directive, FormConditional `optionValues` reads `$attrs.options`; each sits beside a behavioral assertion. Gap: the ungated framework control only asserts `expect_failure`, not the cause; the cause (null required param) was checked by hand per strengthen_debrief. | Optional: if the workflow test framework can assert an error message, pin `specify a dataset`. | Yes |
| 4 | Baseline commits | PASS | `e669ab80a52` contains only `lib/galaxy_test/workflow/*` fixtures and precedes the feature. Server code is identical to `dev` (no `lib/galaxy` diff), so they pass on `dev` by construction; the ungated control was not run on a `dev` checkout. The fix commit `51135b468c7` carries its own red→green tests. | — | — |
| 5 | Archeology | PASS | Every added TS/Python comment describes current behavior (grep of added comment lines). The new E2E comments ("Selenium's drag_over is a pointer drag…", "A scripted drag enters before the editor registers it; re-enter…") explain harness constraints, not history. The "required parameter" wording nit from review 1 is gone. | — | — |
| 6 | History comments' purpose | N/A | — | — | — |
| 7 | Changed workflows | PASS | No runtime diff. IWC `origin/main` re-counted today: 186 `"when"` values, all `$(inputs.when)` (the description's 186 is correct; review 1's 184 was older). | — | — |
| 8 | Who hits this | PASS | Unchanged from review 1; the description now names the virology workaround explicitly. | — | — |
| 9 | Simpler approaches | PASS | The description now has a paragraph on the workaround and implicit runtime skip, plus scope-evaluation splits. | — | — |

## Playwright-only branch and synthetic `dragenter` (`test_editor_drop_optional_output_gates_step`)

Verdict: acceptable, with one design note.

- Branching on `backend_type` is an established pattern in this file (`assert_connected`, `move_center_of_canvas`) and in `workflow_editor_connect`. The Selenium path still exercises drop → confirm → valid connection → saved `when`; the Playwright path adds only the mid-drag preview assertion and screenshot. Neither backend loses the core coverage.
- The synthetic `dragenter` works around a harness artifact, not a product bug: `HasPlaywrightDriver._drag_hold` dispatches `dragstart`, `dragenter`, `dragover` synchronously in one `evaluate`, while `draggingTerminal` is set later via NodeOutput's `watch([dragPosition, isDragging])` → `onDragConnector`. `NodeInput.dragEnter` only shows the tooltip if `reason` is already set, so the first enter sees no reason. Real drags enter the target in a later task. The re-dispatched event has no `dataTransfer`, which is fine because `dragEnter` doesn't read it. The `can-accept` class assertion happens before the re-dispatch and is reactive, so it is a real check.
- Design note: the cleaner, reusable fix is in the harness (`_drag_hold` yielding a frame between `dragstart` and `dragenter`), which would help any drop zone that reacts to state set on `dragstart`. That widens the PR into shared Selenium/Playwright infra, so keeping the per-test workaround is defensible. Judgement call.
- The Selenium-branch comment ("Selenium's drag_over is a pointer drag, not the scripted HTML5 drop the editor listens for") is unverified and partly contradicted by existing evidence. Selenium was not run locally (no chromedriver). Meanwhile `test_history_pages.py::test_drag_drop_visual_feedback` is a plain `@selenium_test` with no backend gate, and it uses `drag_over` to assert an HTML5 dragover class (`page-dragover-success`). If that test is green on Selenium CI, Selenium's `drag_over` does deliver HTML5 drag events, and the comment overstates the case. The preview assertion might then run on both backends, unless Selenium hits the same same-tick issue, which is unknown until CI runs. `drag_and_drop`'s use of `seletools_drag_and_drop` makes the claim plausible for the *drop*, but it isn't shown. Fix: check that test's Selenium CI status. If it's green, try the preview on both backends, or reword the comment to "Selenium drop via drag_over is unverified here". Judgement call; the verdict stays acceptable.
- The twin test's new `canvas_body` hover and fixed positions are also unverified on Selenium; CI covers them.

## Inaccurate or stale statements in `pr_description.md`

- John's Checklist, item 2: "Yes! The pick-value test helper cleanup is isolated as commit 1." Self-contradictory: the diff does contain an unrelated change. Split or drop commit 1 rather than qualifying the answer (row 2).
- John's Checklist, item 1 and "What changes for authors" ("the tooltip says which"): accurate as written, but the tooltip now shows *only* the gate blocker for pause/already-conditioned steps, dropping the optionality reason (row 1).
- John's Checklist, item 3: "New client tests fail on `dev` or on the pre-fix code" — the new guard "keeps the direct reason when a gate would not help" passed before and after the strengthen fix (strengthen_debrief §2) and, reading `dev`'s `NodeInput.vue` (reason = `canAccept().reason`), very likely passes on `dev` too (not run). Same staleness in the Test Challenges summary ("the rest fail without the change"). Fix: "…except one regression guard for genuine mismatches."
- Commits item 4: "An ungated control fails with `Parameter 'input1': specify a dataset…`" — true per a manual check, but the test only asserts `expect_failure`. Fine as prose; don't imply the test pins the message.
- Everything else checked is accurate: tooltip names the blocker; collection inputs covered; 186 IWC conditions; Playwright-only preview screenshot noted under Coverage.
- Out of checklist scope: `index.md` Status still pins `b158809f396` / 4 commits.
