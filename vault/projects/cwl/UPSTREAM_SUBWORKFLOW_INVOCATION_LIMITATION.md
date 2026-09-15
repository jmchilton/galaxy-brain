---
type: research
title: "Upstream Subworkflow Invocation Limitation"
tags:
  - project
  - galaxy/workflows
  - galaxy/invocations
  - cwl
status: draft
created: 2026-09-02
revised: 2026-09-02
revision: 1
ai_generated: true
summary: "PR 23426 RFC: Galaxy implements subworkflow-as-inlining in the scheduler but subworkflow-as-function in the editor. Records the bug, the discussion, and the agreed target semantics."
---

# Upstream Subworkflow Invocation Limitation

Research note on [galaxyproject/galaxy#23426](https://github.com/galaxyproject/galaxy/pull/23426) —
*"[RFC] Subworkflow design bug report."* — open, base `dev`, head
`subworkflow_mapping_per_step_semantics`.

Deliberately **not a fix**. It is a failing framework test, a pinning editor test, and a written
argument, opened to get a second opinion from `@mvdbeek`.

Related:

- [galaxyproject/galaxy#23369](https://github.com/galaxyproject/galaxy/pull/23369) — *"Keep subworkflow `when` state with the collection it was computed over"* — **closed** in favour of this smaller PR.
- [galaxyproject/galaxy#22200](https://github.com/galaxyproject/galaxy/issues/22200) — *"Workflow Semantics Documentation + Test Mapping"* — the `collection_semantics.yml` effort this feeds.
- No Galaxy Help / Matrix thread is linked anywhere. There is **no user bug report** behind this; it is developer-authored.

Adjacent local note: [[SUBWORKFLOW_BUG_1]] (`vault/projects/foundries/`) documents the
`when_values` cardinality crash that is the *symptom* discussed in §1.3 below, and explicitly
leaves open the design question this PR is about.

---

## 1. The bug

### 1.1 The scenario

Child workflow `sub`, declared interface `(data, list<data>) -> (data, list<data>)`:

| | |
|---|---|
| input `mapped_dataset` | type `data` |
| input `inner_collection` | type `collection`, `collection_type: list` |
| step `cat_outer_mapping_source` | `cat` over `mapped_dataset` |
| step `cat_inner_mapping_source` | `cat` over `inner_collection` |
| output `inherited_mapping_output` | <- `cat_outer_mapping_source/out_file1` |
| output `local_mapping_output` | <- `cat_inner_mapping_source/out_file1` |

Embed `sub` in a parent and connect **a list to the `data` input**:

- `outer_mapping_source` = `list<X, Y>` (2 elements) -> `sub.mapped_dataset` — a **map-over**
- `inner_mapping_source` = `list<P, Q, R>` (3 elements) -> `sub.inner_collection` — a **direct match**

### 1.2 The two models disagree

| | `inherited_mapping_output` | `local_mapping_output` |
|---|---|---|
| **Editor / callable-boundary** | `list<data>` | `list:list<data>` |
| **Scheduler / inlined-graph** | `list<data>` | `list<data>` |

jmchilton, PR body:

> `map_over(sub, list<data>)` should therefore yield `(list<data>, list:list<data>)` (each output
> mapped over by one level of list). This is I think the logic the workflow terminals abide by
> because it treats the subworkflow as a black box (rightfully). At runtime - I think since the
> mapped over list isn't included as an explicit input to `sub/consume_inner_mapping_source` -
> that tool step and its output don't get mapped over and the subworkflow is producing
> `(list<dataset>, list<dataset>)`.

The one-line diagnosis, quoted in the PR body:

> Galaxy has subworkflow-as-inlining in the scheduler and subworkflow-as-function in the editor,
> UI, and signature. Inlining is self-consistent on its own terms — push the mapping down per
> step, no extra dimensionality, one child invocation. The bug is that nothing else in the system
> agrees with it. `sub`'s output cardinality depends on its internal wiring rather than its
> interface, which means you can't reason about a subworkflow from its signature and can't
> substitute an equivalent one.

**Substitutability is the stated harm.** Two children with identical declared signatures produce
differently shaped outputs from the same parent invocation depending only on internal wiring. A
refactor inside a child silently changes the parent's output shape, and the editor cannot type
anything downstream of a subworkflow step without reading the child's internals.

### 1.3 Why it happens mechanically

A mapped-over subworkflow step does **not** run the child N times. `SubWorkflowModule.execute`
computes a `collection_info`, then calls `progress.subworkflow_invoker(...)` **once**, passing
the collection info down as `subworkflow_collection_info`. The child runs as a **single
invocation** whose input step receives the *whole* HDCA; each inner step then independently
derives its own map-over from its own connected inputs
(`WorkflowModule.compute_collection_info` / `_find_collections_to_match`). The outer structure
reaches only the steps that actually consume the mapped-over input, via
`progress.subworkflow_structure`.

So `cat_outer_mapping_source` maps 2x, `cat_inner_mapping_source` maps 3x, neither multiplies the
other, and `local_mapping_output` never acquires the outer dimension.

### 1.4 The secondary bug that currently masks it

The framework test **never reaches the output comparison**. From commit `958b743`:

> No fix here - the test records the intent so the design question can be settled first. It does
> not pass today: with the inner collection longer than the outer one, scheduling fails with
> `IndexError` out of `_walk_collections` before the outputs are ever compared.

`MatchingCollections.when_values` is a flat list read **by element position**;
`Tree._walk_collections` (`structure.py:106-122`) does `when_value = self.when_values[index]`.
`compute_collection_info` (`modules.py:1010-1019`) copies the outer
`subworkflow_collection_info.when_values` onto *every* inner step — including steps mapping over a
completely different collection. 2 outer / 3 inner -> read index 2 of a length-2 list ->
`IndexError`. Equal lengths -> silent condition mismatch. Separately, `SubWorkflowModule.execute`
built `[None, None]` even with no `when` expression, and an all-`None` list is still truthy.

PR #23369 proposed fixing exactly this (collapse all-`None`; add `MatchingCollections.is_aligned_with`
so conditions only travel between collections whose elements correspond). mvdbeek did not accept
the premise; jmchilton closed it, calling the `IndexError` *"a symptom of the problem instead of
the problem."*

---

## 2. Editor vs runtime divergence

### 2.1 What the editor assumes

`client/src/components/Workflow/Editor/modules/terminals.ts`:

- Map-over is **per step**: `Terminal.mapOver` reads `stepStore.stepMapOver[this.stepId]` (81-83).
  One map-over for the whole step.
- Each input also tracks a `localMapOver` (200-213) — what *that* input contributes.
- `setMapOver` (119-147) computes the input's effective map-over, records it as `localMapOver`,
  and promotes it to step level when it is a collection or nothing else is contributing one.
- Output types are the step map-over **appended to the declared output type**
  (`OutputCollectionTerminal`, 615): `this.collectionTypes.map((t) => this.localMapOver.append(t))`.

The model: **a subworkflow step is a function with a fixed signature; mapping is a functor applied
uniformly at the boundary.** The editor never looks inside the child — it *cannot*, it is served
only the child's declared outputs via `SubWorkflowModule.get_all_outputs`.

Notably, `workflowStepStore.ts` has **no subworkflow-specific map-over logic at all**. A
subworkflow step is just a step with a signature. That is precisely the point.

The PR pins this with a new `describe("subworkflow map over")` block over a new fixture
`test-data/subworkflow_mapping_steps.json` (the first editor fixture anywhere containing a
`"type": "subworkflow"` step). Three things it establishes:

1. The editor reports `(list, list:list)` — the callable-boundary answer.
2. The collection input **keeps accepting a plain `list`** throughout:
   `expect(input.canAccept(listOutput).canAccept).toBe(true)` and
   `expect(independentItemsInput.localMapOver).toBe(NULL_COLLECTION_TYPE_DESCRIPTION)`.
3. Reported output types **do not depend on connection order** — hence the `it.each` over which
   input is wired first.

Point 2 is the empirical refutation of mvdbeek's counter-proposal (§3).

### 2.2 What the runtime assumes

- **One child invocation per subworkflow step, period.** `SubWorkflowModule.execute` calls
  `subworkflow_invoker(...)` once. The schema has no room for more:
  `WorkflowInvocationToSubworkflowInvocationAssociation` keys on
  `(workflow_invocation_id, subworkflow_invocation_id, workflow_step_id)` with **no element
  index**, and `get_subworkflow_invocation_association_for_step` scans and `break`s on the first
  match.
- **Worse: the child invocation is created eagerly at request time.**
  `workflow_run_config_to_request` (`run_request.py:576-613`) walks the parent's steps and
  recursively builds a child invocation for every `subworkflow` step *before* any scheduling and
  before any collection contents are known. The invocation tree is materialised before the
  map-over cardinality exists.
- Inside the child, every step recomputes its own mapping. The outer structure enters only via
  `progress.subworkflow_structure` (`modules.py:1042-1140`), constraining/peeling dimensions for
  inputs whose data actually carries it. The in-tree comment states the intent:

  > If we have `progress.subworkflow_structure` we're mapping a subworkflow invocation over a
  > higher-dimension input e.g an outer `list:list` over an inner `list`. Whatever we do, the
  > inner workflow cannot reduce the outer list.

  Note *"cannot **reduce**"*. Nothing says *"must **apply** to every output"*.

The model: **a subworkflow step is a macro / inlining device; the outer map-over is pushed down
per-step to the steps that transitively consume the mapped-over input.**

### 2.3 User-visible symptoms

1. **Wrong output shape downstream.** The editor types the graph assuming `list:list` where the
   runtime delivers a flat `list`. Connection validity, further map-over inference, and
   collection-type errors downstream are all computed against a fiction.
2. **Non-substitutable subworkflows.** Same signature, different shape.
3. **Silent drift, or a hard crash.** With equal counts (2 and 2) the shapes coincide numerically
   and the discrepancy is invisible — an earlier 2-and-2 version of the framework test *passed
   with the bug present*. With unequal counts, `IndexError`.
4. **`when` results attached to the wrong elements** (§1.4).
5. **Nothing written down.** `collection_semantics.yml` / `doc/source/dev/collection_semantics.md`
   contain **zero** subworkflow content today. #23369 would have added
   `UNCONDITIONAL_SUBWORKFLOW_INDEPENDENT_LOCAL_MAPPING` documenting the inlining behaviour as
   correct; it closed, so neither model is documented.

### 2.4 A possible second, layered divergence

Flagged by the research pass, **not** stated in the PR and **not yet verified**:

the editor's *signature* is derived from **declared** output types and ignores mapping inside the
child. `_workflow_to_dict_editor` sets `"outputs": module.get_all_outputs()` verbatim;
`SubWorkflowModule.get_all_outputs` copies the child step's `data_output` dicts unchanged;
`ToolModule.get_all_outputs` reports the tool's declared output type. For the actual framework
workflow in this PR, `cat`'s `out_file1` is a plain `data` output — so the parent editor would
most likely report `local_mapping_output` as `data`, not `list`.

The PR's editor fixture *hand-declares* `output_from_independent_items` as
`collection_type: "list"`, which pins the terminal algebra correctly but may not match what the
API actually serves for the framework workflow. If the API says `data`, the editor would report
`(list, list)` — numerically agreeing with the runtime on flat type while still disagreeing on
which collection each output derives from and how many elements it has.

Worth verifying before treating the editor test and the framework test as two rows of one table.
It does not weaken the argument — arguably it strengthens it, as a second place where the child's
internals leak (or fail to leak) inconsistently.

---

## 3. The discussion

Participants: `@jmchilton` (author), `@mvdbeek` (reviewer). Five issue comments, three review
submissions, three inline comments; plus the prior exchange on #23369.

### 3.1 Prior round (#23369) — mvdbeek rejects the premise

> But `when_values` refers to the jobs that are being produced by the `module.execute` function,
> not a particular collection. I haven't really understood what the bug is?

> This may or may not be correct. I've been reading and thinking for an hour about this and i
> think my inability to understand the issue is that i am not sure what bug this is fixing?

> `walk_collections` determines the map-over order, which seems like the source of truth for
> whether we skip something or not, independent of what other collections we encounter.

And, candidly, the inlining position:

> All steps inherit that mapping, right? ... it seems to me that this behavior is the only logical
> option (but maybe because i implemented this?)

jmchilton closed it: *"Closing this out for a smaller more bug focused PR - I'll keep the doc
stuff as a followup."*

### 3.2 Inline review on #23426

1. mvdbeek on a leftover `conditional_values = when_values if any(...) else None` in `modules.py`:
   *"What's the logic behind this? Does that affect the bug that the test is supposed to show?"*
   — jmchilton: *"That was fixing the bug down the path we don't want to implement I think. I'll
   strip it."* He did. **The final diff touches no production code.**
2. mvdbeek on naming: *"I got a little confused by `consume` ... call it `cat_outer_mapping_source`
   / `cat_inner_mapping_source`"* — done in `f290570`.

### 3.3 mvdbeek's counter-proposal

> OK, what the agent says i think is consistent with the approximations we used, there are cases
> where the "map over isolation" breaks down, this is probably one of them.
>
> The interesting thing is that should be able to map over, but then the collection needs to a
> have an extra nesting layer? I think the editor would say the map over constrains the collection
> connected to the connection input should be at least `list:list`?
>
> The inner subworkflow in isolation doesn't accept a list for both inputs in the UI, it'll only
> accept a single dataset and a collection, what would you expect if you gave it the test inputs?
> I think this is where I struggle to know what should happen.
>
> > Sub-workflow sub below consumes a dataset and a list - and produces two outputs `(dataset, list<dataset>)`.
>
> is that so, in isolation? as a standalone, doesn't it produce `(list<dataset>, list<dataset>)`,
> exactly what you passed in?

Two separable objections:

- **(a) A third model.** Rather than *adding* the outer level to the second output, *demand* it of
  the collection input — mapping the step over a list forces `inner_collection` to be fed a
  `list:list`, matching the dimensions up instead of inventing one. "Map-over constrains all
  inputs uniformly."
- **(b) A framing challenge.** What does `sub` produce *in isolation*? Run it standalone with a
  list on the `data` input and you get `(list, list)`. So which is the signature — the declared
  interface, or the observed standalone behaviour?

### 3.4 jmchilton's response and the CWL appeal

Rejects (a) on instinct and disowns his own generated test:

> My gut disagrees - I'm asked for a terminal test and it pushed it without me looking but claimed
> it confirms my reading. I don't think the test is super clear though.

Two commits later the test says precisely what he claims, and the
`canAccept(listOutput) === true` assertion is the empirical refutation of (a): **the editor as
implemented does not demand `list:list` there.**

Then the crux comment, with three asks:

> - Would a workflow editor Selenium test help make this communication easier/better?
> - If I could make a argument that CWL would use Editor substitution principle/semantics - would
>   that move you on believing the editor semantics should be applied to the backend here. I
>   really believe there must be work in the CWL tree to implement these semantics.
> - The test fails on the unrelated bug now that I originally encountered - so that actual
>   framework test isn't even expressing this problem correctly.

The appeal to **CWL as tie-breaker**: CWL `scatter` over a step (including a subworkflow `run:`)
adds exactly one array dimension to *every* output of that step, unconditionally, from the step's
interface — the callable-boundary model.

He explicitly declined codex's suggestion of making both lists 2 elements to get the test green:
*"this muddies the water a bit IMO though because the lists look more similar."*

### 3.5 mvdbeek concedes

> The callable boundary model is probably easier to reason about, i think that's ultimately very
> much what we want? It's just not how we've implemented this? Maybe now is the time to fix that,
> though it does seem hard to very hard?

jmchilton, last word (PR otherwise idle):

> I think - I hope - it is some of the ugliest stuff left in my latest version of the CWL branch
> and... if I did it by hand a decade ago I think an agent should be able to make it work from my
> failed approaches. I'm worried about breakage of course though - I think that is what the hard
> part would be.

### 3.6 Agreed / open

**Agreed:**

- The divergence is real; "map over isolation" breaks down here.
- The **callable-boundary model is what is wanted**.
- The current implementation does not do that.
- Inlining is at least self-consistent; the problem is that nothing else agrees with it.
- The `when_values` `IndexError` is a separate, subsidiary bug and should not be conflated.

**Open:**

- **No fix, no plan, no timeline.** *"I don't have a solution yet."*
- **Backward compatibility.** Both flagged it as the hard part; nobody has scoped it.
- **mvdbeek's (a)** was never argued down explicitly — only shown not to be current behaviour.
  Whether the editor *should* constrain rather than append is technically still open.
- **mvdbeek's (b)** — "what does `sub` produce in isolation?" — never directly answered. It
  matters: Galaxy has no notion of "the child in isolation."
- **Broadcast semantics are undefined.** Under the callable model the flat `list` on
  `inner_collection` is broadcast (each child invocation gets the whole list). Nobody wrote that
  down.
- Whether a Selenium editor test is worth adding — asked, not answered.
- Where the documentation lands.
- CI is red (three `Test` jobs) **by design**.

---

## 4. Target backend semantics

Consensus on the model; no plan for getting there.

### 4.1 Subworkflow as callable, not as macro

A subworkflow step should behave exactly like a tool step w.r.t. collection mapping:

1. **The signature comes solely from the child's declared interface** — labelled input steps with
   their `data` / `collection_type` declarations, labelled workflow outputs with their declared
   types. Internal wiring is not part of it.
2. **Map-over is determined at the step boundary**, comparing each connected input's actual
   collection type against the declared input type — exactly as
   `compute_collection_info` / `_find_collections_to_match` already do for tools.
3. **The resulting map-over applies uniformly to every declared output:**
   `effective_output_type = step_map_over.append(declared_output_type)` — the algebra
   `terminals.ts` already implements client-side.
4. **The child is invoked once per element of the map-over.** For
   `sub : (data, list<data>) -> (data, list<data>)` mapped over `list<X,Y>`, run `sub(X,[P,Q,R])`
   and `sub(Y,[P,Q,R])`. Outputs: `[cat(X), cat(Y)]` = `list<data>`, and
   `[[cat(P),cat(Q),cat(R)], [cat(P),cat(Q),cat(R)]]` = `list:list<data>`.
5. **`when` results belong to the element they were computed for**, consumed by exactly that
   child invocation. No flat by-position read against an unrelated collection — so no `IndexError`
   and no silent mismatch. This makes #23369's `is_aligned_with` machinery unnecessary rather than
   patching it.

### 4.2 What the editor gets to rely on

- The API's subworkflow-step `inputs`/`outputs` payload is a complete and sound signature.
- One `stepMapOver` per subworkflow step, appended to every declared output — `terminals.ts`
  needs **no change**; its current behaviour becomes correct rather than aspirational.
- A plain `list` on a declared `list` input stays legal regardless of the step's map-over.
- Connection order does not affect reported output types.
- Output shape is stable under any refactor of the child that preserves its interface.

### 4.3 Data-model / API obstacles

This is where *"hard to very hard"* lives, and it is the part nobody has designed:

1. **One child invocation per step is baked into the schema.**
   `workflow_invocation_to_subworkflow_invocation_association` has no element index;
   `get_subworkflow_invocation_association_for_step` returns the first match. Per-element
   invocation needs a new column (element index / identifier, plus the collection it indexes) or a
   different association shape — and a migration.
2. **Child invocations are created eagerly at request time, not at scheduling time.**
   Cardinality of a map-over is a runtime fact. Either child invocations become lazy, or the
   request-time record becomes a template that scheduling expands.
3. **Output collection assembly.** The parent must build an implicit collection per output
   *across* child invocations — the analogue of implicit HDCA creation for mapped tool runs, but
   over N sub-invocations rather than N jobs.
4. **`progress.subworkflow_structure` and the peel-a-dimension logic become obsolete.**
   `modules.py:1042-1104` exists purely to make inlining work. Under the callable model the child
   sees element-level inputs and needs none of it. A large deletion, and a correspondingly large
   blast radius.
5. **`MatchingCollections.when_values` stops being a cross-collection flat list.** With one child
   per element, `when` is a scalar per child invocation.
6. **UI/API surfacing of N child invocations.** Invocation views, `managers/jobs.py:1600-1630`,
   and the invocation-tree UI all assume one child per step.
7. **Backward compatibility.** Any stored workflow relying on an output *not* gaining the outer
   dimension changes shape. No discussion yet of versioning, opt-in, or migration.

### 4.4 Documentation deliverable

Whatever is decided lands in
`lib/galaxy/model/dataset_collections/types/collection_semantics.yml` (feeding
`doc/source/dev/collection_semantics.md`), which today has **no** subworkflow content. That is the
explicit purpose of #22200 — a machine-checkable spec whose examples map onto editor tests,
workflow-runtime tests, tool-runtime tests and CLI validation. #23426 is precisely a case where
they don't match up.

---

## 5. Code touchpoints

### 5.1 Files the PR touches (all test/fixture — no production code)

| Path | Change |
|---|---|
| `client/src/components/Workflow/Editor/modules/terminals.test.ts` | +85 — `describe("subworkflow map over")` with `effectiveOutputType()` helper |
| `client/src/components/Workflow/Editor/test-data/subworkflow_mapping_steps.json` | +64, **new** — first editor fixture with a `subworkflow` step |
| `client/src/components/Workflow/Editor/test-data/parameter_steps.json` | +1/-1 — trailing whitespace |
| `lib/galaxy_test/workflow/subworkflow_mapping_per_step.gxwf.yml` | +49, **new** — the parent/child workflow of §1.1 |
| `lib/galaxy_test/workflow/subworkflow_mapping_per_step.gxwf-tests.yml` | +57, **new** — 2-element `X,Y` / 3-element `P,Q,R`; asserts flat `list`(2) and `list`(3). Fails with `IndexError` before reaching assertions |

Commits: `958b743` (framework test) -> `f290570` (rename per mvdbeek) -> `679abb8` (terminal
tests) -> `ec88bda` (clarify). Two force-pushes; the `modules.py` hunk mvdbeek questioned was
stripped.

### 5.2 Production code implicated

> Line numbers below are from the local `cwl_fixes_5` checkout, which carries CWL-branch additions
> (`scatter_type`, `nested_crossproduct` / `flat_crossproduct`, `_flat_cross_synthetic`,
> `input_overrides`, `CollectionAdapter`) **not** present in `dev`. Treat them as approximate for
> upstream.

**`lib/galaxy/workflow/modules.py`** — centre of gravity:

- `WorkflowModule.compute_collection_info` (1003-1019) — copies outer `when_values` onto every
  inner step; returns `collection_info or progress.subworkflow_collection_info`.
- `WorkflowModule._find_collections_to_match` (1021-1160+) — per-step map-over derivation. The
  `progress.subworkflow_structure` interactions at **1042-1044** (skip leaf/`disabled`),
  **1061-1073** (super-collection check + error), **1084-1090** (`effective_input_collection_type`
  fallback), **1093-1104** (peel outer levels; the "cannot reduce the outer list" comment),
  **1136-1140**. All of it exists only to make inlining work.
- `SubWorkflowModule.get_all_inputs` (1262-1295) — input half of the signature.
- `SubWorkflowModule.get_all_outputs` (1321-1367) — output half; copies the child's producing-step
  `data_output` dicts and relabels.
- `SubWorkflowModule.execute` (1373-1459) — computes `collection_info`, builds `when_values`,
  calls `subworkflow_invoker(...)` **once**, reads each `workflow_output` back via
  `get_replacement_workflow_output`. **This is the function that would have to loop per element.**

**`lib/galaxy/workflow/run.py`**:

- `WorkflowProgress.__init__` (439-465) — stores `subworkflow_collection_info`, derives
  `subworkflow_structure`, stores `when_values`.
- `subworkflow_invoker` (947-973) / `subworkflow_progress` (975-1067) — build the single child
  progress; resolve child input steps from the parent's `input_connections`.
- `_subworkflow_invocation` (861-867) — `get_subworkflow_invocation_for_step(step)`; **the
  one-per-step assumption**.
- `remaining_steps` (481-511), `_recover_mapping` (1086+) — scheduling/resume.

**`lib/galaxy/workflow/run_request.py`**:

- `workflow_run_config_to_request`, subworkflow branch (576-613) — **eager, request-time,
  recursive creation of exactly one child invocation per subworkflow step.** The structural
  blocker.

**`lib/galaxy/model/__init__.py`**:

- `WorkflowInvocation.subworkflow_invocations` (9393-9398);
  `create_subworkflow_invocation_for_step` (9458-9462), `attach_subworkflow_invocation_for_step`
  (9464-9474), `get_subworkflow_invocation_for_step` (9476-9478),
  `get_subworkflow_invocation_association_for_step` (9480-9487 — scans, `break`s on first match).
- `WorkflowInvocationToSubworkflowInvocationAssociation` (10111-10141) — **no element index**; a
  schema change plus migration lands here.

**`lib/galaxy/model/dataset_collections/matching.py`**: `MatchingCollections.when_values` (62),
`slice_collections` (77-79), `slice_collections_crossproduct` (81-97), `structure` (104-114). Where
#23369 wanted `is_aligned_with`.

**`lib/galaxy/model/dataset_collections/structure.py`**: `Tree.walk_collections` /
`_walk_collections` (103-124) — the `self.when_values[index]` positional read; source of the
blocking `IndexError`.

**`lib/galaxy/managers/workflows.py`**: `_workflow_to_dict_editor` (1316-1450+), line **1372**
`"outputs": module.get_all_outputs()` — the signature the editor consumes.

**`lib/galaxy/managers/jobs.py`** (1600-1630) — joins through the association on
`(workflow_step_id, workflow_invocation_id)`; assumes one child per step.

**Client**: `terminals.ts` — `Terminal.mapOver` (81-83), `setMapOver` (119-147),
`BaseInputTerminal.localMapOver` (200-213), `canAccept` / `_effectiveMapOver` (~330-370, 439-530),
`OutputCollectionTerminal` (~615), `BaseOutputTerminal` (621-650).
`workflowStepStore.ts` — `stepMapOver`, `stepInputMapOver`, `input_subworkflow_step_id` plumbing
(69, 116, 138, 326-327, 456-457).

**Docs/spec**: `lib/galaxy/model/dataset_collections/types/collection_semantics.yml`,
`doc/source/dev/collection_semantics.md` — no subworkflow content today.

### 5.3 Regression surface — tests that pin the current inlining behaviour

- `lib/galaxy_test/api/test_workflows.py::test_invocation_map_over_inner_collection` (6227) —
  `list:list` mapped over a subworkflow declaring a `list` input.
- `...::test_invocation_map_over_inner_collection_with_tool_collection_input` (6286).
- The `..._with_extra_nesting` conditional-subworkflow regression referenced in #23369.
- `test/unit/data/dataset_collections/test_matching.py` — where #23369 added `is_aligned_with`
  unit tests.

---

## 6. Relevant work already in the CWL branch (`cwl_fixes_5`)

In #23426 jmchilton wrote:

> If I could make a argument that CWL would use Editor substitution principle/semantics - would
> that move you on believing the editor semantics should be applied to the backend here. I really
> believe there must be work in the CWL tree to implement these semantics.

**There is** — but it is **not** decade-old work. It is called *parent-mapping*, it lives in
`ToolModule`'s CWL execution path, and it was added in March 2026 (commits `f5d5a0c956`,
`088f9b5637`, `e5d3a250ba`, Opus 4.6 co-authored). `older_plans/CWL_LEGACY_BRANCH.md` lists
*"Scatter execution: How CWL scatter actually maps to Galaxy's collection-based parallelism"* as an
**open question**, and `older_plans/CWL_LEGACY_RUNTIME.md` mentions neither scatter nor subworkflow
mapping. The argument for #23426 has to rest on the conformance suite and the CWL spec, not on
prior art.

It is backed by ten green two-level-nested-scatter conformance workflows.

### 6.1 The mechanism: `parent_mapping`

`find_cwl_scatter_collections` (`modules.py:473-587`) returns a **pair** of `CollectionsToMatch`
rather than one:

> Returns (scatter_collections, parent_mapping_collections). Scatter collections come from
> explicit CWL scatter annotations. Parent-mapping collections are HDCAs passed to scalar params
> inside a mapped subworkflow that need implicit decomposition. **They are returned separately
> because they form an independent dimension (cross-product with scatter).**

The trigger (`modules.py:551`):

```python
elif name not in collection_param_names:
    if has_explicit_scatter and progress is not None and progress.subworkflow_structure is not None:
        # Parent-mapping: inside a mapped subworkflow, this disabled-scatter input
        # carries a parent HDCA that needs decomposition.
        parent_mapping.add(name, hdca, subcollection_type=subcollection_type)
```

`ToolModule.execute` then cross-products the two dimensions
(`modules.py:3396-3406`, `_iter_parent_mapping_x_scatter` at 649, `_build_combined_collection_info`
at 631):

> Structure = parent(outer) x scatter(inner) = `parent:scatter` (e.g. `list:list`).

**This is the callable-boundary answer, computed per-step.** Where `dev`'s
`progress.subworkflow_structure` only *constrains and peels* dimensions off inputs that already
carry them ("the inner workflow cannot **reduce** the outer list"), `parent_mapping` **creates** the
outer dimension on the inner step's output. The lifted `list:list` the editor predicts actually
materialises.

It also carries the outer `when` values on the axis they belong to (`modules.py:3371-3383`):

```python
if collection_info and not parent_mapping_info:
    # when_values from outer subworkflow map 1:1 to scatter elements.
    collection_info.when_values = outer_when_values
if parent_mapping_info:
    # Outer when_values correspond to the parent-mapping dimension
    # (e.g. 4 letters), NOT the scatter dimension (e.g. 16 flat_crossproduct combos).
    parent_mapping_info.when_values = outer_when_values
```

That is a **working precedent for exactly what #23369 was trying to generalise** — and note the
commit that added it, `088f9b5637`, hit the *same* `IndexError` that currently blocks #23426's
framework test:

> Fix `when_values` mismatch in two-level nested scatter (outer simple x inner flat_crossproduct):
> assign outer `when_values` to `parent_mapping_info` not `collection_info`, preventing
> `IndexError` when dimensions differ.

The fix was not `is_aligned_with`-style detection. It was **having a second axis to attach the
values to.** Under the callable model the axes exist by construction, which is why §4.1(5) claims
the `IndexError` dissolves rather than needing a patch.

### 6.2 The evidence: two-level nested scatter conformance

`test/functional/tools/cwl_tools/v1.2/tests/scatter/` — 10 workflow fixtures, all combinations of
`{simple, dotproduct, flat-crossproduct, nested-crossproduct}` outer x inner. All generated tests
carry `@pytest.mark.green` (v1.2 `RED_TESTS` is only `filename_with_hash_mark` and
`resreq_step_overrides_wf`).

`simple-simple-scatter.cwl` is structurally #23426's scenario:

```yaml
outputs:
  result:
    type: {type: array, items: {type: array, items: string}}   # list:list
    outputSource: scatterletters/alphanum
steps:
  scatterletters:
    run:            # inline subworkflow, output alphanum: string[]  (a list)
      steps:
        scatternumbers:
          in: {letter: letter, number: numbers, ...}
          scatter: number                                       # inner axis
    in: {letter: letters, numbers: numbers, ...}
    scatter: letter                                             # outer axis
```

Expected output is `[[1a,2a,3a,4a],[1b,...],[1c,...],[1d,...]]` — the child's declared `string[]`
output lifted by one level because the step was scattered. **That is precisely the row of §1.2's
table that Galaxy's native scheduler gets wrong.**

Commits: `f5d5a0c956` "Fix CWL scatter into subworkflow steps." (removed 4 tests from `RED_TESTS`)
-> `088f9b5637` "Fix CWL nested scatter when_values" (removed a 5th) -> `e5d3a250ba` "Support
nested_crossproduct scatter on CWL subworkflow steps."

> Caveat: green markers mean *expected to pass*; these were not re-run as part of writing this
> note.

### 6.3 Where it stops — the gap is real but narrower

`parent_mapping` is **not** a general implementation of callable-boundary semantics. Three limits:

1. **CWL-only path.** The call site is inside
   `use_cwl_path = tool.tool_type in CWL_TOOL_TYPES and not tool.has_galaxy_inputs`
   (`modules.py:3330`, call at 3367). Galaxy-native tool steps still go through
   `compute_collection_info` / `_find_collections_to_match` and get inlining.
2. **Tool steps only.** `find_cwl_scatter_collections` has exactly one call site.
   `SubWorkflowModule.execute` does not use it — a subworkflow nested inside a mapped subworkflow
   gets no parent-mapping cross-product.
3. **The inner step must actually consume the outer input.** The gate requires the parent HDCA to
   appear in that step's `cwl_input_dict`. In `simple-simple-scatter.cwl` it does — `scatternumbers`
   takes `letter`. **In #23426's workflow it does not** — `cat_inner_mapping_source` consumes only
   `inner_collection`. So for a step that ignores the mapped-over input entirely, even the CWL
   branch produces a flat `list`.

That third limit is the interesting one. It is not an oversight so much as an artefact of the
same root cause: **the branch still runs the child exactly once.**
`SubWorkflowModule.execute` (`modules.py:1442-1463`) invokes once and passes each
`get_replacement_workflow_output(...)` straight through to `progress.set_step_outputs` with no
lifting. The `list:list` in the conformance tests is correct **because the dimension was
manufactured inside the child by the cross-product**, not because it was applied at the boundary.
Every step that happens to see the outer HDCA gets the dimension; a step that doesn't, doesn't.

### 6.4 Other invocation-handling work on this branch worth knowing about

| Area | What it does | Bearing on #23426 |
|---|---|---|
| `run.py::replacement_for_input_connections` (new, ~510-590) | Merge semantics for N sources into one input — `MergeDatasetsAdapter`, `MergeLists{Flattened,Nested}Adapter` per `WorkflowStepInput.merge_type` (CWL `MultipleInputFeatureRequirement`) | Establishes that a *declared* input can be fed by several outer sources and reshaped at the boundary — the same class of boundary-side transform the callable model needs |
| `run.py::_subworkflow_progress` (975-1067) | Rewritten to collect **all** connections targeting one child input step instead of `break`ing at the first; merges them, and `_persist_adapter_as_hdca` materialises the adapter before handing it to the child | Direct precedent for materialising a synthetic input at the subworkflow boundary |
| `input_overrides` threaded through `subworkflow_invoker` / `subworkflow_progress` | Lets the parent substitute the HDCA a child input step receives (used for `flat_crossproduct` synthetic HDCAs) | **The hook a per-element invocation would use** — the parent already can decide what a child sees, independent of the wiring |
| `_build_flat_crossproduct_hdcas` (~600-628) | Builds synthetic flat N*M HDCAs so an existing dotproduct iteration handles a crossproduct | Precedent for manufacturing collection structure at the boundary rather than teaching the iterator new shapes |
| `model/__init__.py` `WorkflowOutput.source_index` + `_output_sort_key` (~9904-9980) | Orders invocation outputs by `(source_index, order_index)`; aggregates duplicate labels into **lists** | Note the shape: multiple contributions to one declared output already collapse into a list. That is a partial, ad-hoc version of the "assemble a collection across N contributions" problem §4.3(3) names |
| `modules.py:1421` `collection_info.when_values = when_values` | Unconditional — the branch does **not** carry [[SUBWORKFLOW_BUG_1]]'s all-`None`-vector discard | Live gap: `SubWorkflowModule` still builds `[None, None]` with no `when` expression, and an all-`None` list is truthy |

### 6.5 What to tell mvdbeek

The CWL argument jmchilton wanted to make is available and concrete:

1. CWL's spec semantics are the callable-boundary model — `scatter` adds exactly one array
   dimension to every output of the step, derived from the step's interface.
2. Galaxy's CWL branch already implements enough of that to pass **ten** two-level nested scatter
   conformance workflows across all four scatter-method combinations, by giving the outer mapping
   its own axis and cross-producting it with the inner one.
3. The `IndexError` that currently blocks #23426's framework test was hit on that branch too, and
   was fixed by **attaching outer `when_values` to the outer axis** — supporting §4.1(5)'s claim
   that under a proper two-axis model the conditional-alignment problem stops being a special case.
4. But the branch's version is a per-step push-down gated on the inner step consuming the mapped
   input, restricted to CWL tool steps, and still built on one child invocation. It is evidence
   that the target semantics are implementable and testable — **not** a drop-in.

The honest framing for the PR: *the CWL branch shows the destination is reachable and worth
reaching, and supplies a ready-made conformance suite to grade a general implementation against.
It does not show the migration is cheap.*

### 6.6 Suggested next steps

- **Run the ten nested-scatter conformance tests** on `cwl_fixes_5` to convert "marked green" into
  a verified claim before citing them in #23426.
- **Add the negative case.** Port #23426's workflow to CWL — a scattered subworkflow containing a
  step that ignores the scattered input — and confirm it produces a flat `list` even on the CWL
  branch. That pins §6.3(3) as a known limit rather than an assumption, and gives the upstream PR
  a CWL-side reproduction.
- **Resolve the [[SUBWORKFLOW_BUG_1]] all-`None` discard** on this branch (`modules.py:1421`), or
  record why the parent-mapping split makes it unnecessary here.
- **Verify §2.4** — check what the editor API actually reports for `local_mapping_output` on the
  #23426 framework workflow. If it says `data` rather than `list`, the PR's editor fixture and its
  framework workflow are not describing the same two rows, and jmchilton should know before
  mvdbeek notices.

See [[SUBWORKFLOW_MAPPING_EXTRACTION_PLAN]] for the viability assessment and phased plan.
