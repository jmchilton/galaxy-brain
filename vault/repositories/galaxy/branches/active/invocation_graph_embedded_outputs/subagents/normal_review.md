Run via claude-opus-5-5 at high effort (review subagent); fixes by a claude-opus-5-5 high-effort subagent, folded into the four stage 3 commits (head `0c2458ec608`).

# Normal review debrief: invocation_graph_embedded_outputs (stage 3)

No blockers. I acted on all six should-fix findings and nits N1-N4: S1 to S4 and N1 to N3 were fixed directly, and S6, N4, N5 and N6 went away with the S2 rework. S5 is out of scope and is recorded as a known gap. N7-N10, the Selenium test style, went to the E2E polish step.

- **S1, a base height that overestimates can overlap steps.** Fixed. The base a grown step grew from is now a deliberate underestimate: 9rem wide and one title line tall (144×55 at a 16px root), converted from rem. A layout test places a step 0, 3 and 5px below a grown step. The unmeasured-step fallback is stage 2's 150×60 again.
- **S2, S6, N4, N5, N6: what Node.vue renders and what the layout assumes can disagree.** Fixed. A new `usePreferredOutputItems` composable decides which steps are shown as their preferred output: tool steps whose `preferred_output` names one of their outputs, once the output exists, while Embed Outputs is on. It skips the detailed-view step.
  - Node.vue reads that map through a typed `InjectionKey`.
  - Dedup, base sizes and the toggle rule all use the same map.
  - The step's details are fetched only when the output isn't listed in the invocation.
  - Editor nodes no longer run the composable.
- **S3, S4: values aren't validated, and only the star is tool-only.** Fixed. On import or update, `__module_from_dict` rejects a value that isn't a string or null, and any name on a non-tool step, with `ObjectAttributeInvalidException`. New API test `test_preferred_output_invalid` (10 cases). The scope stays tool-only, and the client ignores non-tool steps.
- **N1-N3.** Comment on the pre-2016 JSON-string `config` guard. Model test trimmed. The star has `aria-pressed` and a computed title.

## Not acted on

- **S5: format 2 drops `preferred_output`.** gxformat2 is out of scope, and this becomes the gxformat2 follow-up. The consequences go in the PR's known gaps:
  - Invocation export, then import through a model store, reads only the `.gxwf.yml`, so the field is lost.
  - gxformat2's strict native schema rejects the extra key.
- **N7-N10** went to E2E polish: the Selenium populator style, the `_assert_static` failure message, the no-overlap assertion's comment and subpixel allowance. N10, the `.ga` key placement, was left as is.
- **Q1: should names be checked against the tool's outputs?** No, type check only (decision). Tools can be missing or upgraded, and workflow outputs don't check their names either. A stale name is ignored by the graph.
- **Q2: a shown step loses its job-state counts.** Accepted (decision). The preview replaces the state text, and the node's state colouring and the step details still show it.
- **Q3: older invocations show nothing.** Accepted (decision): the graph resolves against the invoked version.
- **Q4: a step can end up right of a grown step it started left of.** Accepted (decision), the same as stage 2's cards. There are no overlaps.

<details>
<summary>Full review</summary>

Run via claude-opus-5-5 at high effort.

# Normal review: stage 3 (`invocation_graph_embedded_outputs`), `invocation_graph_embedded_workflow_outputs..6e8a0a965c9`

Commits reviewed: `af4c0230500` (backend), `7dc25eb1b36` (editor star), `9625feb4175` (graph), `6e8a0a965c9` (E2E).
Checks run (read-only): Vitest on the four changed client test files (51 pass); `test_model.py -k preferred` (pass);
a scratch fuzz of the layout with grown steps (`SCRATCH/review3/fuzz/`, the layout module copied, nothing written
to the worktree); greps across `lib/` for every `WorkflowStep.config` reader/writer; gxformat2 schema inspection.
Worktree left clean.

Overall: the backend is small and correct on the paths that exist; the editor star is a faithful sibling of the
existing output toggles; the graph code respects stage 2's decisions (static, right-only, one pass, constant card
sizes). One real layout bug (an overlap the solver can produce, demonstrated), plus missing input validation and
a few consistency gaps.

## Should-fix

### S1. The constant base height (60) is larger than real shrunk steps (55), and the layout can then overlap steps
`client/src/components/Workflow/Invocation/Graph/useEmbeddedOutputs.ts:20,124-132`, consumed at
`embeddedOutputLayout.ts:102-105`.

The same-row rule keeps the author's spacing when the two steps' *base* rows overlap, even if that spacing is
negative (an author overlap). If `baseHeight` *overestimates* the true pre-growth height, a step that sat just
below the grown step (not sharing rows in the author's layout) is treated as sharing a row, and keeps a negative
"author spacing" against the grown width.

- Real shrunk heights are 55 graph px: the stage 2 live probes (`SCRATCH/live/{run1,chip1,atac1}/measure.json`,
  `1_embed`, screen height divided by the 144px-width scale) all bottom out at 55.0, i.e. below the constant 60.
- Minimal repro (`a scratch fuzz script`): grown step `{x:0,y:0,w:260,h:171,baseWidth:144,baseHeight:60}`
  and a step `{x:0,y:58,w:144,h:55}` placed 3px below it. Result: the second step lands at `x:116,y:58`, inside the
  grown step (overlap 144x55).
- Fuzz (20000 random layouts each, `a scratch fuzz script`, `fuzz_under.ts`): constant 60 with true heights
  down to 40 gives 556 overlapping layouts; accurate base heights give 0; base heights *under*estimated by 25px also
  give 0. So underestimating is safe (only extra pushes), overestimating is not.
- The band is narrow (a step 0-5px below a grown one, horizontally overlapping it), so it's rare in practice, but it
  breaks the "growth never creates an overlap" property the E2E now asserts.

Same family, width: `baseWidth: 144` assumes 9rem = 144px. With a non-16px root font size the real shrunk width
differs and the same rule mis-measures author spacing (a smaller root font gives overlaps of up to the difference).

Fix: derive the base from the measured size instead of a constant, conservatively:
`baseWidth = width * 9 / 16.25` (both are rem widths, so the ratio is exact at any root font size) and
`baseHeight = height - previewHeightPx` (8.5rem, or 5.25rem for a collection, in px from
`getComputedStyle(document.documentElement).fontSize`). Dropping the hidden state-text line makes this an
underestimate, which the fuzz shows is safe. Keep `SHRUNK_STEP_SIZE` only as the unmeasured fallback. Add the
minimal repro above as a layout unit test.

### S2. `grew` is "names a preferred output", not "is shown as it"
`useEmbeddedOutputs.ts:125`. Steps whose preferred output doesn't exist yet (not scheduled, invalid/stale name,
detailed-view active node which isn't rendered as an invocation node) still get `baseWidth/baseHeight` of 144x60.
For an ungrown step taller than 60 (multi-terminal), rows 60..height count as "grown into", so neighbours get the
full gap instead of the author's tighter spacing: steps move although nothing grew. Not an overlap, but avoidable
movement, against stage 2's "move only when needed".

Fix: pass base sizes only for steps actually rendered with the preview. The cleanest signal is the node itself:
have `Node.vue` report it (e.g. the provided object becomes `{ enabled: Ref<boolean>, shownAsPreferred:
Set<number> }`, or a flag in the state store next to `stepPosition`), so the layout and the render can't disagree.
Short of that, mirror Node's condition (`step.outputItems?.[preferred]` or the step-details item exists). With S1's
measured base, an ungrown step's base equals its size anyway (width ratio aside), so S1 mostly subsumes this if the
width is taken as `min(width, width*9/16.25)` only for grown ones.

### S3. No validation of `preferred_output` on import/update
`lib/galaxy/managers/workflows.py:2329-2330`. Any JSON value is stored: `5` and `{"a": 1}` are persisted (the
setter only tests truthiness) and come back through the getter typed `str | None`; `[]`/`0` silently clear it.
Nothing could rely on a non-string value (the client compares it to output names), so per REVIEW_FOCUS reject it.

Fix: next to the existing workflow-output checks in `__module_from_dict` (which already raise
`ObjectAttributeInvalidException` for empty/duplicate output names):

```python
preferred_output = step_dict.get("preferred_output")
if preferred_output is not None and not isinstance(preferred_output, str):
    raise exceptions.ObjectAttributeInvalidException("preferred_output must be the name of a step output.")
```

Plus one API test line (import with `preferred_output: 5` -> 400). Whether to also reject names that aren't outputs
is Q1.

### S4. The editor can only set it on tool steps, but everything else accepts any step type
`client/src/components/Workflow/Editor/NodeOutput.vue:393` uses `showCalloutVisible` (`stepType === "tool"`).
The backend stores it for any step, `.ga` import accepts it for any step, `Node.vue` renders it for any step type,
and `InvocationOutputPreview` explicitly special-cases subworkflow steps (`notReady`). Sibling: the workflow-output
checkbox (`showCalloutActiveOutput`) is shown for tool *and* subworkflow steps. A subworkflow step is the step
most worth showing as one output.

Fix (pick one, per REVIEW_FOCUS "consistency with sibling paths"): use `showCalloutActiveOutput` for the star so
subworkflow steps can name one (and check the graph's subworkflow item lookup in the E2E or a Node test), or, if
tool-only is the intended scope, say so in the PR and don't render it for non-tool steps in `Node.vue` either.

### S5. Format 2 drops it, and that includes invocation export/import through model stores
Out of scope for this branch (gxformat2), but the consequence is wider than "YAML workflows can't set it":

- `lib/galaxy/model/store/__init__.py:1749-1759` re-imports invocation workflows from the `.gxwf.yml` only, so
  history/invocation export+import loses `preferred_output` (the `.ga` written beside it is ignored).
- gxformat2's `native_strict.NativeStep` has `extra="forbid"` and no `preferred_output` field (verified in the
  worktree venv), so a `.ga` export carrying it fails strict native validation (planemo/IWC-style linting).

Fix: list both in the PR description's known gaps and in the gxformat2 follow-up (field in the native schema and in
the native<->format2 converter). No code change here.

### S6. `useStepOutputItems` fetches step details even when the preferred output is already listed
`client/src/components/Workflow/Editor/Node.vue:376-381` with `useStepOutputItems.ts` `items`/`load`. `items` falls
back to the step-details fetch whenever *any* output of the step is unlisted, and `load()` refetches on each state
change while any output is missing. For the common case (preferred output = a labeled workflow output, e.g.
head_table in the E2E), each such step does a `GET` of its invocation step for no reason when Embed Outputs is
turned on, and again on state changes. Verified the keyed cache dedups the concurrent read+`load()` pair, so no
double fetch, just unneeded ones.

Fix: in Node, use `step.outputItems?.[preferred]` when present and only read `stepOutputItems`/call `load()` when
it isn't; or give `useStepOutputItems` an optional output-name filter so "missing" means "the outputs I need".

## Nits

- N1. `lib/galaxy/model/__init__.py:9417,9483,9487`. `config` is now annotated `dict[str, Any] | None`, but rows
  written before Nov 2016 hold a JSON *string* there: `__module_from_dict` used to do
  `step.config = json.dumps(step_dict)` for steps with missing tools (removed in `1c9dd0dbe97`). The `isinstance`
  guards are therefore load-bearing; add a one-line comment saying so, or a future cleanup will "simplify" them.
  (The setter discarding such a string is fine; nothing reads it since 2016, and no path updates old steps in place.)
- N2. `test/unit/data/model/test_model.py` new test mostly checks that the setter preserves *other* config keys,
  which no code path writes. Keep the "clearing leaves `config` None" part (that's what keeps exports minimal) and
  drop or trim the rest; the API round-trip test covers the real behaviour.
- N3. `NodeOutput.vue:394-398`. The star has a static `title` and no `aria-pressed`; screen readers can't tell
  starred from not. Add `:aria-pressed="isPreferred"` (the button is a toggle). The copy says "in invocation graphs
  this step is displayed as this output", which holds only with Embed Outputs on; e.g. "Show this step as this
  output when outputs are embedded in invocation graphs". Sibling buttons use computed hints
  (`activeOutputHint`, `visibleHint`); a computed "Unstar..." hint for the active state would match them.
- N4. `Node.vue:371`, `InvocationGraph.vue:129`. String injection key, consistent with `"transform"`/`"isDragging"`
  but untyped; an exported `InjectionKey<Ref<boolean>>` would type both ends. provide/inject itself is the right call
  here (otherwise `WorkflowGraph` grows another pass-through prop; it already threads `detailedView`, so a prop is
  defensible too).
- N5. `Node.vue:376`. `useStepOutputItems(invocationStep)` now runs in every *editor* node too (and instantiates the
  invocation store there). Cheap and lazy, but `invocationStep` is a `Step` cast to `GraphStep` in that case; a
  comment or guarding the call on `isInvocation` would make the intent clearer.
- N6. `useEmbeddedOutputs.ts:89-93`. `hasEmbeddableOutputs` enables the toggle for a scheduled step whose preferred
  output name is stale/invalid, where turning it on only shrinks the steps. Minor; S2's "shown" signal would fix it.
- N7. Selenium: `from gxformat2.converter import python_to_workflow` and `yaml.safe_load`; the populators use
  `from gxformat2 import python_to_workflow` and `gxformat2.yaml.ordered_load`. Match them. `_open_invocation`'s
  `workflow: str | dict` + `test_data` only-for-dicts is slightly awkward; an alternative that also exercises the
  real save path is to upload the format 2 workflow, set `preferred_output` via the editor dict + update (as the API
  test does), then invoke. Either is fine.
- N8. Selenium `_assert_static` failure message changed from the card's label to `outerHTML[:80]`, which is less
  readable for the stage 2 cards; prefer `get_attribute("data-output-label") or get_attribute("data-description")`.
- N9. The new "no two steps overlap" check (`test_workflow_invocation_graph.py:491-494`) is a property of this test
  workflow, not of the layout (author overlaps are kept by design). A short comment saying so would stop someone
  adding an overlapping step to `WORKFLOW_OUTPUT_KINDS` from reading it as a layout regression. `clear_of` has no
  subpixel `EPSILON`, unlike the edge comparisons; touching steps rounding to 0.3px overlap would fail. Not seen,
  but cheap to guard.
- N10. `.ga` key order: `preferred_output` is inserted between `when` and `tool_id`; harmless, but placing it after
  the step's other display fields (e.g. after `workflow_outputs` or next to `position`) keeps IWC diffs tidier.

## Questions

- Q1. Should a `preferred_output` that names no output of the step be rejected (REVIEW_FOCUS: never-working input)?
  On import the module's outputs are known for installed tools but not for missing ones, and tool upgrades can
  remove the output later, so a hard error would need to skip missing tools. Workflow outputs (the sibling) don't
  validate their `output_name` against the module either. My lean: type-check only (S3), and add a best-practices
  lint/editor warning for a stale name, since the editor currently shows no star at all and silently re-saves it.
- Q2. While shown as its preferred output a step loses `NodeInvocationText`, i.e. the per-state job counts
  ("8 ok, 2 error") for mapped-over steps. The header colour/icon still shows the aggregate state. Is that the
  intended trade, or should the one-line counts stay above the preview (slightly taller node)?
- Q3. Version resolution (from brain_research): the graph loads the invoked workflow version, so starring an output
  creates a new version and older invocations show nothing. Intended for v1, or should the graph read
  `preferred_output` from the latest version for matching step UUIDs? Worth a sentence in the PR either way.
- Q4. Settle order with growth: a source (or any step) that starts left of a grown step but whose right edge is
  past the grown step's x settles after it and is pushed past the grown step, flipping their left-right order
  (no overlap). Stage 2 cards behave the same way, so consistent; just confirming it's accepted.

## Checked and fine

- `WorkflowStep.config` has no other reader/writer in `lib/` besides `copy_to` (`model/__init__.py:9680`), which
  copies it wholesale, so workflow copies carry `preferred_output`; the setter builds a new dict, so the shared
  reference isn't mutated. Editor saves build new steps through `__module_from_dict`, so nothing is clobbered.
- Refactor (`do_refactor`) and model-store `.ga` writing go through `_workflow_to_dict_export`, which carries it.
- Editor dict always carries the key (`null` when unset); import treats `null` as "clear"; `.ga` export carries it
  only when set. The API round-trip test covers editor update, editor + `.ga` export, `.ga` reimport, and clearing,
  at the right level.
- The pydantic `WorkflowStepToExport*` models aren't used outside `schema.py` (and already lack `when`);
  `StoredWorkflowDetailed` is the instance style the graph doesn't use. No schema change needed.
- Editor: save sends whole steps (`toSimple`), so `preferred_output` is saved; undo/redo via `UpdateStepAction` is
  correct and tested; readonly is respected; in the invocation graph the output buttons are hidden (`blank`), so the
  star never shows there. No `SetDataAction` caller could drop the field (it's unused).
- Graph: the preview is mounted only while shown; the keyed cache dedups the read-triggered fetch and `load()`;
  the not-yet-produced state renders as usual (no item) and the running state shows the not-ready message inside
  the grown box, matching stage 2's cards; the 8.5rem/5.25rem fixed heights keep the node size stable while
  content loads. Dedup in `collectRequests` uses the same lookup (`outputItems`) that Node shows first, so a deduped
  card is always shown in the step.
- Stage 2 consistency: static (`inert`, `pointer-events: none`, pagination hidden), right-only, no vertical
  moves, one pass from the original positions (no runaway: each layout starts from `originalPositions`), constant
  card sizes. Fuzz with accurate base sizes: 0 overlaps / wrong moves in 40000 layouts.

</details>
