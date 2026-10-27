# optional_input_gating — PR checklist review (2026-10-27)

Evaluated at `b158809f396` (4 commits on `origin/dev` `a9a68082414`): `208b8ffae50` helpers, `897badf1153` orphan fix, `2e706fe8c97` baseline framework tests, `b158809f396` feature. Read-only. Neither checklist has a human-read item.

## Paste-ready checklist

### PR checklist

- [x] What does the user see when it fails?
  Drop targets show green/red with a tooltip reason, a confirm dialog precedes gating, and imported gates the editor can't classify are accepted and left to the runtime.
  <details>

  - Gateable drop: green terminal, tooltip "Drop to connect and run this step only when X is provided.", then a "Run this step conditionally?" confirm. Declining changes nothing.
  - Non-gateable drop: red terminal with the pre-existing reason (e.g. "Cannot connect an optional output to a non-optional input").
  - Hand-written `when`: shown read-only as "Custom expression", and replacing it asks for confirmation.
  - Changing a step's condition drops links whose gate port disappears, without a toast. One undo restores them.
  - A gate the evaluator classifies `unknown` is accepted. If it actually runs with the input absent, the job fails on the missing required input at run time, the same as on `dev`.
  </details>
- [ ] Is the diff free of unrelated or stale generated changes?
  No. The feature commit also rewrites two existing pick-value Selenium tests to use `select_set_value`. There are no generated changes.
- [x] Are unit tests not just testing the literal implementation?
  Yes. One shallow props-only FormConditional test is redundant with its full-mount sibling.
- [x] Are baseline tests in their own leading commits (if applicable)?
  Yes: `2e706fe8c97` adds the framework workflow tests, which pass on `dev`, ahead of the feature.
- [x] Are the comments free of excess archeology?
  Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve?
  N/A

### Workflow-related

- [x] Which existing workflows change behavior (if any)?
  None at run time (no server changes). In the editor, imported presence-gated and twin workflows stop showing invalid connections.
  <details>

  - All 184 IWC `when`s are `$(inputs.when)` and still load in boolean mode, so no IWC workflow changes.
  - Editor-only changes:
    - Hand-written `when`s are read-only and need a confirm before they are discarded. The old checkbox cleared them silently.
    - Gate links orphaned by a `when` change are dropped instead of lingering as saved invalid inputs.
    - Non-`when` probe ports now take their type and optionality from their source instead of being a required boolean.
  </details>
- [x] Who hits this in practice and what is the evidence?
  IWC authors gating a step on an optional dataset, who currently need two helper steps to do it. Example: the virology `ivar trim` primer scheme, the case the docs show.
  <details>

  - IWC `pe-illumina-simple-virus-calling-and-consensus.ga` takes an optional data input, "Primer scheme (optional)". It uses `map_param_value` (data → boolean) to feed `when` on `ivar trim`, plus a one-option `pick_value` to pass the dataset into `primer|input_bed`. This PR replaces that pair with `$(inputs.primer.input_bed !== null)`.
  - VGP users hit the "optional reference: download it or provide a file" shape: #20804, and #20182, which was fixed by #20647, "Fix optional unspecified input to conditional step".
  - No issue asks for editor support directly. #23345 was the earlier attempt and was closed.
  </details>
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not?
  Partly. Narrower editor-only variants were weighed in the branch notes; the existing `map_param_value` + `pick_value` workaround and a runtime implicit skip aren't recorded, so the reasons below are this review's. Only the explicit, editor-authored gate keeps runtime semantics unchanged.
  <details>

  - **Workaround (status quo):** it needs two extra tool steps per gate, and the editor still marks the probe shape invalid.
  - **Validity only, no UI** (scope_evaluation Option C2) and **without the inverse-gate evaluator** (scope 6): these are possible splits, not replacements. Without the evaluator, `=== null` on a consumed input is accepted, and twin dispatch can't be validated.
  - **Runtime implicit skip of steps whose required input is null:** this isn't recorded in the branch notes. It would silently change semantics for every existing workflow, which is why an explicit `when` is preferable.
  - Threading an "assume gated" argument through `attachable`, and folding the new action into `UpdateStepAction`, were both rejected as wider changes to `dev`'s API (thermo_nuclear_review, scope_evaluation scopes 3 and 4).
  </details>

## Review notes (evidence and fixes)

| # | Item | Verdict | Evidence | Suggested fix | Judgement call? |
| --- | --- | --- | --- | --- | --- |
| 1 | Failure UX | PASS, with a gap | `terminals.ts:251` `assessDrop` returns the *direct* rejection whenever the gated path also fails. That makes the gated-path reasons at `terminals.ts:265/268/271` ("cannot run conditionally", "No presence gate can be written…", "already has a condition") unreachable in the UI. NodeInput.test.ts:152 asserts that a pause step shows the generic optional reason. Dropping onto a step that already has a boolean gate gives no hint that the gate is what blocks the offer. The orphan drop is silent (`stepActions.ts:249`). | When the direct failure is only the optionality check, surface the gated reason. Otherwise collapse those strings into one internal reason. | Yes |
| 2 | Unrelated changes | FAIL (minor) | `test_workflow_editor.py:1384,1508`: `_pick_value_select_mode` is deleted, and two existing pick-value tests switch to `tool_form.parameter_select(parameter="mode")`, a selector that already exists on `dev` (navigation.yml:900). The branch doesn't touch pick-value forms. Everything else is related: the `filter` mock imports in FormDefault/FormTool tests are needed because FormConditional now renders a `FormSelect`, which uses `useFilterObjectArray`, and the `workflowId` plumbing in Index.vue/FormOutputLabel.vue serves the new action. No generated files are in the diff. | Revert the pick-value helper swap, or move it into its own leading test-only commit or PR. | Yes. It is a small cleanup that removes a JS-click helper. |
| 3 | Tests not literal | PASS | Behavior-level evidence: the spec YAML round-trips generated expressions through the classifier (`whenExpression.test.ts`, `generated_presence_conditions.yml`). The actions tests compare whole-workflow undo/redo snapshots. NodeInput uses real stores and mocks only the confirm dialog. test_challenges showed all 44 new tests fail on `dev`. Weak spots: `FormConditional.test.ts:322` "shows a hand-written expression without rewriting it" only checks the props passed to FormElement. This is the kind of test that missed the blank-render bug (screenshot_debrief), and `:331` (full mount) now supersedes it. `optionValues` reads `$attrs["options"]` (`:159`), and `terminals.test.ts:1177` reads `isPresenceGated()`; both are coupled to internals, but each is paired with a behavioral assertion. | Drop the `:322` test, or fold its "no emit" assertion into `:331`. | Yes |
| 4 | Baseline commits | PASS | `2e706fe8c97` contains only fixtures. scope_expansion and baseline_refactor recorded 4 passed on `dev`. The tests in the fix commit `897badf1153` were red before the fix and green after, so they belong with the fix. | Optional: move `2e706fe8c97` to the front, since it has no dependencies. | Yes |
| 5 | Archeology | PASS | Every added comment describes current behavior. A grep for "previously/used to/no longer/legacy/#NNNNN" finds nothing in code comments. One nit: `test_workflow_editor.py:1777` says "required parameter", but the target is a required data input. | Fix the wording (optional). | Nit |
| 6 | History comments' purpose | N/A | — | — | — |
| 7 | Changed workflows | PASS | No `lib/galaxy` diff. The IWC scan of `origin/main` (133 `.ga` files) found 184 `when`s, all `$(inputs.when)`, and `FormConditional.vue:42` maps that exact string to boolean mode. `dev`'s `gatePort` is a required boolean; `gatePortTerminalSource` (`workflowStepStore.ts:614`) now types non-`when` probes from their source, which only relaxes validity for probe links. The custom-expression confirm is at `FormConditional.vue:71`. | — | — |
| 8 | Who hits this | PASS | Of the 7 IWC workflows that have an optional data input and a `when`, only the virology workflow gates on dataset presence. It does so through `map_param_value` (`input_param_type.type: data` → `output_param_type: boolean`) into `ivar trim`'s `when`, and a single-option `pick_value` into `primer\|input_bed`. Host-contamination gates on a `parameter_input` instead, and rnaseq gates on booleans. The docs example (`workflow_conditional_steps.md`) mirrors the virology workflow. Related issues: #20804 (VGP: optional download-or-provide reference), #20182/#20647 (runtime fix for an optional unspecified input to a conditional step). #23345, an earlier version of this work, was closed 2026-08-25 with no comments. | State the IWC workaround explicitly in the PR description; the stale draft doesn't mention it. | No |
| 9 | Simpler approaches | PASS, with a gap in the notes | Contraction and decomposition options are in scope_evaluation (Options A–D, scopes 3–6), and the `presenceGateAssumed` alternative is in thermo_nuclear_review. The notes don't record the IWC workaround or a runtime implicit skip as considered alternatives. The reasons given above are this review's. | Add one sentence to the PR description on why the workaround and an implicit runtime skip were not pursued. | Yes |

## Other observations

- `doc/source/dev/workflow_conditional_steps.md:66` claims that without the gate "it reaches parameter validation as null and the job errors". No test in the branch exercises that negative case. It's plausible but unverified here.
- `pr_description.md` is stale. It references #23816/#23333 and "review the top commit only". It doesn't mention the orphan-fix commit, the generalized drop or map-over reset, the custom-expression preview fix, or the new screenshots.
