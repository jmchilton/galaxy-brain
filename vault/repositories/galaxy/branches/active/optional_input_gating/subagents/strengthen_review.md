# optional_input_gating — strengthen review (2026-10-27)

Read-only review of `pr_description.md` against branch HEAD `c7ace222009`: 5 commits on `origin/dev`, +2618/−115, with no non-test `lib/galaxy` diff. I viewed all six screenshots. No security findings.

Side note: `index.md` is stale. It still says "4 commits" at `b158809f396`.

## 1. More development? Yes, a short list

The tasks below stay within the branch's motivation, editor gating on an optional input. They're ordered by how much they help the pitch.

1. **Negative baseline framework test.** This backs the "why a gate" claim and `doc/source/dev/workflow_conditional_steps.md:66`.
   - Add an ungated fixture: optional `maybe` wired into required `cat#input1`, with no `when`. Give it one job that omits `maybe` and sets `expect_failure: true`. The harness supports this (`test_framework_workflows.py:81`, used in `default_values.gxwf-tests.yml`).
   - It passes on `dev`, so it goes in commit 4, the baseline.
   - The harness accepts any exception, so check once by hand that the failure is the null required parameter and not an upload or scheduling error.
   - This turns the doc line and the checklist's "fails at runtime, as on `dev`" from assertion into evidence. It also lets the pitch say plainly that the editor flags the ungated connection because it fails.
2. **Surface the gate-specific drop reason.** Today `assessDrop` (`terminals.ts:251`) returns the *direct* rejection whenever the gated path also fails. As a result, the strings at `:265/:268/:271` ("This step type cannot run conditionally.", "No presence gate can be written…", "This step already has a condition.") never reach the UI. The only callers are `NodeInput.vue:116/199`.
   - The common case is dropping onto a step that already has a boolean gate. The author sees the generic "Cannot connect an optional output to a non-optional input", with no hint that the existing condition is what blocks the offer.
   - **Fix:** when the direct rejection is only the optionality rule, and `canAccept` with the gate assumed would pass, return the gated reason. Add a NodeInput test for "step already has a condition".
   - **Minimum alternative:** delete the dead strings. Without one of these, the checklist's "Drop targets turn green or red with a tooltip reason" is accurate only for the generic reason.
3. **Back the "collection" claim.** The code path exists: `InputCollectionTerminal.attachable` reaches `_producesAcceptableDatatypeAndOptionalness` at `terminals.ts:734/756`. But the only collection test (`terminals.test.ts:1171`) is a negative data→collection type mismatch.
   - Add one `canAccept` test: optional collection → required collection is accepted when gated and rejected when ungated.
   - Otherwise, drop "collection" from "data, collection and parameter inputs".
4. **Retake three screenshots** (E2E only).
   - `workflow_editor_step_custom_condition_readonly.png` shows a red square on `when_absent`'s "Concatenate Dataset" terminal, which is almost certainly the hover remove-button left by the node click. Next to "Twin dispatch renders valid" it reads as an invalid connection.
     - Move the pointer off the node before the shot.
     - Add the missing `assert_connection_valid("base#output", "when_absent#input1")`.
   - `…_drop_optional_output_gated.png` and `…_twin_dispatch_connections_valid.png` show an "Auto Layout (Ctrl + 9)" tooltip. The drop-gated shot also has the edge looping behind the node because the steps are stacked vertically. Use a left→right layout like `…_gate_mode_options.png`, and move the pointer away.
   - The description says a drop "previews as accepted and explains", but no image shows that. Add a hover screenshot mid-drag: green terminal plus tooltip "Drop to connect and run this step only when X is provided." That is the headline interaction.
5. *(Hygiene, not pitch.)* Fold the no-emit assertion of `FormConditional.test.ts:322` ("shows a hand-written expression without rewriting it", props-only) into the full-mount `:331`, then drop `:322`.

### Questions for John (would widen scope or are decisions)

- **`unknown` policy** (already open). Going strict would remove the Risks hedge "the editor can accept a connection that still fails at runtime", but it rejects valid hand-written gates.
- **Toast when a condition change removes connections.** It's undo-restorable but silent today, and it's listed as a risk. Is it worth a small UX addition?
- **`RemoveStepAction` map-over reset.** It's a pre-existing gap, out of scope here.
- **Target for commit 3.** The orphan fix is reachable on `release_26.2`. Should it be split out and targeted there?
- **IWC demonstration.** A follow-up IWC PR could swap virology's `map_param_value` + `pick_value` for the generated gate. That would be the strongest real-world evidence, but it lives in another repo. The branch's `cond|input1` fixture is the in-repo analogue of `primer|input_bed`; the real `ivar_trim` path is untested.

## 2. Likely misreadings

| # | Misreading | Answered above the fold, bold-italic? | Verdict |
| --- | --- | --- | --- |
| 1 | "This changes runtime behavior / how steps execute." | Yes, by the editor-only sentence | OK |
| 2 | "This changes how existing boolean conditions work." | Yes, by the same sentence | Weak: overclaims and uses a stale count |
| 3 | "Galaxy now skips steps implicitly when an optional input is missing." | Answered only in the plain closing paragraph ("Skipping steps implicitly…") | Missing highlight |
| 4 | "This is a new expression language, or the client now executes conditions." | No. "small evaluator" sits inside `<details>` | Missing |
| 5 | "Optional → required connections are now allowed in general (validation weakened)." | Partly, in the unhighlighted "Imported workflows validate" bullet | Missing |
| 6 | "The editor now guarantees gated connections are safe." | Highlighted, but inside the collapsed `<details>` | Weak: below the fold |
| 7 | "Dropping silently adds conditions to my steps." | The confirm screenshot answers it visually | OK |

Proposed sentences:

- **#2, replacing the second half of the current highlight.**
  - Two problems with the current text:
    - "behaves exactly as before" isn't true of the UI: the checkbox became a selector, and turning a boolean gate off now drops its `when` link (commit 3).
    - "184" is stale: IWC `origin/main` today has 186 `when`s, counting subworkflows, all `$(inputs.when)`.
  - Proposed:
    > ***This is editor-only: no server or runtime code changes, and every existing `$(inputs.when)` condition (the only form IWC uses) runs as before and opens as a boolean condition.***
- **#3**, best placed right after the opener paragraph:
  > ***Nothing is skipped implicitly: a step skips only when its saved `when` says so, and the editor writes that `when` only after the author confirms it.***
- **#4**:
  > ***The generated condition is an ordinary `when` expression the runtime already evaluates; the editor's evaluator only reads conditions to decide whether a connection is valid, and never rewrites or rejects them.***
- **#5**, best placed in or right after the "Imported workflows validate" bullet:
  > ***An optional output on a required input stays invalid unless the step's condition skips the step when that input is absent; dropping one only offers to write that condition.***
- **#6**: move the existing undecidable-conditions sentence (or a short form of it) above the fold, e.g.:
  > ***For hand-written conditions the editor can't decide, it accepts the connection and leaves the decision to the runtime, as `dev` does.***

Five highlights is a lot. If you trim, the priority order is #2 fix, #4, #5, #3. #6 can stay in Risks rather than the body, since it's already stated there unhighlighted.

## 3. Claims the branch doesn't prove, or overstates

- **"every existing `$(inputs.when)` boolean condition (all 184 in IWC) loads and behaves exactly as before."** The count is stale (186), and the UI did change (checkbox → selector; turning a gate off drops its link). See #2 above.
- **"The existing workaround … still leaves probe-style connections flagged invalid."** This is inaccurate. The virology wiring (`map_param_value` → `when`, one-option `pick_value` → `primer|input_bed`) renders valid on `dev`. The invalid flags belong to hand-written probe or twin gates, which is a different shape. Rephrase, e.g. "The workaround costs two extra steps per gate, and hand-written probe gates that do run correctly are still flagged invalid."
- **"This applies to data, collection and parameter inputs."** Collection is uncovered by tests (task 3).
- **"previews as accepted and explains…"** This is tested in `NodeInput.test.ts` but not shown visually (task 4).
- **Checklist "What does the user see when it fails? Drop targets turn green or red with a tooltip reason."** The gate-specific reasons are unreachable (task 2). And the checklist's "fails at runtime, as on `dev`" is untested (task 1).
- **Checklist "Are unit tests not just testing the literal implementation? … every new test fails on `dev`."** This is false as written. The four framework workflow tests are new and pass on `dev` by design. The 44-test red check (test_challenges) also predates the scope-expansion tests, which were shown red against pre-fix branch code, not `origin/dev`. Use "every new client unit test fails on `dev`" and re-verify that, or scope the claim.
- **Agentic check "Every new unit test now fails on `dev`".** It has the same timing caveat.
- **Checklist "Is the diff free of unrelated or stale generated changes? Yes!"** It's defensible only because the pick-value helper swap is now its own commit 1. Say so: "Yes; the one test-helper cleanup is isolated as commit 1."
- **"With this PR, that step needs neither helper."** This is plausible but not exercised with `ivar_trim`. The nested-conditional fixture (`cond|input1` → `inputs.cond.input1`) is the analogue. This is fine for a pitch, but one clause would help, e.g. "(the same nested shape is covered by the framework tests)".
- **Verified OK:**
  - Runtime untouched: no non-test `lib/galaxy` diff.
  - The framework tests cover top level, conditional, repeat and twin dispatch, each with the input present and absent.
  - E2E covers mode choice, drop → confirm → saved `when`, twin validity and read-only custom conditions.
  - Pause-step and type-mismatch rejections are tested.
  - Single undo for drop-to-gate and for condition changes is tested.
  - Map-over reset on dropped links is tested.
  - The 5-commit list matches `git log`.

## 4. Style rules from the guidance

- **Highlights below the fold.** GX_PR_DESCRIPTIONS says highlights should be "above folds". The undecidable-conditions highlight sits inside `<details>`. See misreading #6.
- **Opener.** It isn't from the controlled list. No issue exists, so "Implement 🎯" doesn't fit. A list-conforming option: "Follow-up to 🔀 #20647 - let workflow authors gate a step on an optional input in the editor." This is a judgement call, since the current opener reads well.
- **Screenshot legend** (SHOW_ME_RULES: non-pass/fail markers need a one-line legend). Edge styling carries meaning: orange means invalid (`SVGConnection.vue` `.invalid` → `$brand-warning`), and dashed means optional. The before/after only reads if you know that; `…_gate_mode_options.png` shows the orange dashed edge. Add a line under the first table, e.g. "Dashed edges carry optional values; orange marks an invalid connection."
- **Risk Details.** "`useStepActions` gains a `workflowId` argument…" is an internal API note, not a one-way door. Move it to the commits list or drop it. This is minor.
- **Pitch order, no agent-as-evidence, details use, Context paragraph ending, Human Review placeholder, cleaned Galaxy checklist:** all compliant.
