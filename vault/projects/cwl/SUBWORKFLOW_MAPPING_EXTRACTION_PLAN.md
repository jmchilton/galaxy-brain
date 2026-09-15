---
type: plan
title: "Subworkflow Mapping — Extraction Plan"
tags:
  - project
  - galaxy/workflows
  - galaxy/invocations
  - cwl
status: draft
created: 2026-09-02
revised: 2026-09-02
revision: 2
ai_generated: true
summary: "Viability assessment and phased plan for extracting the CWL branch's parent-mapping cross-product into generic Galaxy, addressing PR 23426 without per-element subworkflow invocation."
---

# Subworkflow Mapping — Extraction Plan

Follow-on to [[UPSTREAM_SUBWORKFLOW_INVOCATION_LIMITATION]] (galaxyproject/galaxy#23426).

Corrections and decisions that supersede the earlier research note:

- The CWL branch's `parent_mapping` work is new: commits `f5d5a0c956`, `088f9b5637`, and
  `e5d3a250ba` (March 2026), not decade-old precedent.
- #23426 settles the semantic choice sufficiently for implementation. mvdbeek's final position is
  that the callable-boundary model is what Galaxy ultimately wants. The earlier suggestion that a
  mapped subworkflow should require an extra nesting level on every other collection input was a
  question, not the conclusion, and the editor test demonstrates that this is not Galaxy's current
  interface contract.
- Callable semantics do **not** require N persisted child-invocation rows. One child invocation can
  remain the permanent representation if every executable child step inherits the parent mapping
  axis. This plan treats per-element child invocation objects as out of scope unless a future,
  explicit provenance/UI requirement demands them.
- The possible editor-signature divergence in §2.4 of the research note does not hold for the
  #23426 workflow. `SubWorkflowModule.get_all_outputs()` serializes the child with
  `is_subworkflow=True`; `_resolve_collection_type()` then infers the inner `cat` map-over and
  reports that output as `list`. The hand-authored terminal fixture matches that server path.
- #23426's framework fixture records the **current** flat result. It is useful as a reproducer, but
  it is not the green oracle for the callable model; the implementation test must change the second
  output expectation to `list:list`.

---

## 1. Verdict

**Viable without a schema migration, and one child invocation is an acceptable permanent
architecture.**

The implementation rule is stronger than the first draft's push-down-plus-broadcast proposal:

> **The parent map-over is invocation context, not data dependency. Every executable step in the
> child inherits it, whether or not that step consumes the input that caused the mapping. Local
> mapping axes cross-product with the inherited axis.**

For the #23426 example, this means:

- `cat_outer_mapping_source` schedules 2 jobs;
- `cat_inner_mapping_source` schedules 2 × 3 = 6 jobs, not 3 jobs followed by output duplication;
- both sets of jobs live in the existing single child invocation;
- the outputs are `list<data>` and `list:list<data>`.

This is materially better than broadcasting a computed output. Galaxy tools are not pure
functions: they can be nondeterministic, have side effects, fail independently, and produce
distinct provenance. Running the independent child step once and reusing its three outputs twice
would match shape, but not the execution semantics of two callable invocations. Inherited-axis
execution preserves the per-element jobs and HDAs while avoiding N child-invocation records.

What this buys, and what it doesn't:

|                                                              |                                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Output **shape** matches the editor                          | Yes                                                                      |
| Output **data and job cardinality** match callable execution | Yes                                                                      |
| Substitutability restored                                    | Yes — shape becomes a function of the signature alone                    |
| `when_values` `IndexError` dissolved                         | Yes — each axis owns its own conditions                                  |
| Schema migration needed                                      | **No**                                                                   |
| Request-time invocation creation changed                     | **No**                                                                   |
| Child invocations visible in the UI                          | **One** — an execution container for all mapped jobs                     |
| Invocation-level failure isolation                           | **Grouped** — one failed coordinate can fail the shared child invocation |
| Per-element jobs for an outer-independent child step         | **Yes** — N × its local mapping                                          |

The intentional divergence from N physical child invocations is invocation-level grouping in the
API/UI and failure state. Job-level execution, data shape, element-level `when`, and failure
evidence remain per-element, but sibling coordinates do not continue as independent child
invocations after one coordinate fails. Unless that isolation or invocation-row cardinality itself
becomes a product requirement, there is no reason to retain a future migration hook or describe N
child invocations as the eventual target.

### 1.1 What is already reusable — and what is not

The generic machinery in `dev` already has part of the needed model:

- `MatchingCollections` (`lib/galaxy/model/dataset_collections/matching.py`) holds
  `linked_structure` (the zip axis) *plus* `unlinked_structures` (cross-product axes).
- `MatchingCollections.structure` already computes the full product:
  `unlinked₁ × unlinked₂ × … × linked`, via `Tree.multiply`.
- `tools/execute.py` consumes `collection_info.structure` to build implicit output
  collections, so **multi-axis output shape already works end to end** for tool steps.
- The CWL branch proves that parent mapping and local scatter can be executed as separate axes and
  that `when_values` must live on the axis that produced them.

The gap is larger than one missing iterator. In `dev`, `unlinked_structures` retain output shape but
not the input bindings needed to slice those axes. The CWL branch adds `unlinked_collections` and a
narrow iterator, then still needs three hand-rolled workarounds:

| Branch workaround | Lines | What it is compensating for |
|---|---|---|
| `_build_combined_collection_info` (`modules.py:631`) | ~20 | assembling a two-axis `MatchingCollections` by hand |
| `_iter_parent_mapping_x_scatter` (`modules.py:649`) | ~25 | iterating the product by hand |
| `_build_flat_crossproduct_hdcas` + `_flat_cross_synthetic` + `input_overrides` | ~90 across `modules.py` and `run.py` | faking a cross-product by materialising synthetic N*M HDCAs so the *linked* iterator can be reused |

The upstream abstraction therefore needs explicit ordered axes, bindings, conditions, and product
iteration. Filling that complete gap lets all three workarounds collapse; merely adding a method
over today's fields does not.

### 1.2 Restating the bug in CWL-free terms

The precise defect, stated without reference to scatter:

> **An enclosing map-over is treated as if it belonged only to inputs that carry its collection.**
> It should instead be inherited execution context for the entire child invocation. When a child
> step also derives mapping from its own input, the inherited and local axes must cross-product.

Consequences follow mechanically:

- Unequal cardinality → `IndexError` in `Tree._walk_collections` (the `when_values[index]` read),
  or a `CANNOT_MATCH_ERROR_MESSAGE`.
- Equal cardinality → silently wrong pairing, invisible in tests (#23426's earlier 2-and-2 version
  passed with the bug present).
- A step that sees **only** B gets no outer dimension and runs only 3 times instead of 2 × 3 → the
  missing `list:list` and the wrong job cardinality.

This framing needs no `when`, scatter, or CWL. It is a generic subworkflow-mapping defect, which
makes it a `dev` fix rather than a CWL import.

### 1.3 Nested structure on a *single* input is already correct

If one input carries `outer:inner`, `Tree._walk_collections` already recurses correctly. What is
missing is composition of an inherited axis with a local axis, including the case where no child
input binds to the inherited axis. The latter requires a structure-only execution axis; using a
parent input name as a fake child binding risks name collisions and incorrect input replacement.

---

## 2. Target semantics

One rule, no format-specific conditionals:

> When a child invocation has inherited mapping axes, every executable child step is evaluated over
> those axes. Mapping derived from the step's own inputs is local and cross-products with the
> inherited axes. Axes already present in an incoming mapped collection are recognized by identity
> and not added twice. Every declared dataset/collection output carries the inherited axes.

Corollaries:

- A subworkflow step's output shape is `step_map_over.append(declared_output_type)` — identical to
  `terminals.ts`. The editor becomes correct rather than aspirational; **no client change**.
- A plain `list` connected to the child's declared `list` input remains a direct input. It does not
  need to become `list:list`; the outer dimension comes from invocation context.
- An outer-independent runnable step executes once per outer element. Computed outputs are never
  repaired by duplicating one execution's result.
- `when` values computed over the outer axis are consumed on that axis. `#23369`'s
  `is_aligned_with` detection becomes unnecessary: axes are separate by construction, so there is
  nothing to detect. Precedent: `088f9b5637` fixed exactly this crash by moving the values to the
  right axis.
- A workflow output that directly re-exports an input has no runnable producer. It is the one case
  that may need boundary wrapping: reuse the incoming mapped object when it already carries the
  inherited axes; otherwise repeat the pass-through value structurally over those axes.
- Nothing above mentions CWL, scatter methods, or tool type.

---

## 3. Phases

Phases 1–3 are upstream work against `dev`. Phase 4 is deletion on the CWL branch after those
changes are merged or rebased. Keep the PR boundaries small, but do not claim that each behavioral
phase is independently useful without its tests and recovery path.

### Phase 0 — Pin the contract and correct the oracle

Do this before production code so implementation shortcuts are visible.

- Keep #23426's editor terminal test: it pins `(list, list:list)`, accepts a plain `list` on the
  declared `list` input, and is connection-order independent.
- In the implementation branch, change the framework test's `local_mapping_output` expectation
  from a flat `P/Q/R` list to a `list:list` with outer identifiers `X/Y`, each containing
  `P/Q/R`. Update the fixture prose; do not call the original expectation the intended result.
- Add an API assertion for job cardinality: 2 jobs for `cat_outer_mapping_source` and 6 for
  `cat_inner_mapping_source`. Also assert that the six inner outputs are distinct HDA records.
  This prevents a shape-only broadcast implementation from passing.
- Preserve the 2-versus-3 cardinalities. Equal lengths hide both accidental zipping and misplaced
  `when_values`.

The RFC PR may remain red while it documents the bug. No intentionally red test lands in `dev`;
the implementation PR carries the corrected test and the fix together.

### Phase 1 — Make mapping axes first-class *(refactor, no intended behavior change)*

Refactor `MatchingCollections` around an ordered axis representation. An axis needs:

- a structure and deterministic outer-to-inner order;
- zero or more input bindings (a structure-only axis is valid);
- its own `when_values`;
- an identity/provenance token so the same inherited axis can be recognized downstream;
- an output-layout policy separate from iteration (`nested` normally, `flat` for CWL
  `flat_crossproduct`).

Axis identity comes from the semantic mapping source (source terminal/boundary role, slice, and
linked group), not merely an HDCA id. The same HDCA can legally be wired once as the mapped scalar
input and again as a direct collection input; those uses are distinct axes. Conversely, two child
steps mapping over the same workflow input should recognize the same local axis.

Bindings must be scoped objects, not one global `dict[input_name, collection]`: an inherited axis
can have no binding on an independent child step, and parent input labels can collide with child
tool input names. A binding may consume more than one ordered axis when a nested incoming
collection is sliced.

Add `slice_collections_product()` over all axes and make today's linked-only path a compatibility
case. Keep compatibility accessors for `linked_structure`, `unlinked_structures`, `collections`,
and `when_values` during migration; remove them only after all callers move.

Unit tests in `test/unit/data/dataset_collections/test_matching.py` and `test_structure.py`:

- 2 outer × 3 inner yields six slices in stable row-major order;
- two inputs on one linked axis zip, while two independent axes cross-product;
- the same HDCA used in two different boundary roles remains two axes, while two steps mapping the
  same source terminal share an axis;
- a structure-only outer axis still multiplies execution without injecting an input;
- outer conditions repeat across the inner axis and never index the inner cardinality;
- bindings spanning nested axes return the right leaf/subcollection;
- empty, singleton, linked-only, unlinked-only, and unknown-structure cases preserve behavior;
- nested and flat output layouts use the same execution coordinates but different output shapes.

**Branch effect after rebase:** `_iter_parent_mapping_x_scatter` and
`_build_combined_collection_info` become unnecessary. The CWL branch's
`slice_collections_crossproduct()` can become a thin caller of the generic product iterator.

### Phase 2 — Propagate inherited axes through one child invocation *(closes #23426)*

At `SubWorkflowModule.execute`, compute the subworkflow step's boundary mapping once and pass it to
the child `WorkflowProgress` as inherited mapping context. Then change generic collection matching
so every executable child module composes:

```
effective mapping = inherited axes × mapping derived locally by this step
```

The composition rules are the hard part and should be explicit:

1. Inherited axes are included even when none of the step's inputs bind to them.
2. If an incoming collection already carries an inherited prefix, bind that input to the existing
   axis coordinates and strip the prefix before deriving local mapping. Do not add the outer axis
   twice.
3. Deduplicate by axis identity/provenance, never merely by equal type, identifiers, or length;
   two unrelated `list<X,Y>` inputs can be independent axes.
4. Preserve outer-to-inner order through nested subworkflows.
5. Attach subworkflow-step `when` values only to the inherited axis that produced them. A false
   outer value suppresses every child job at that coordinate, including locally mapped jobs.
6. Record output-to-axis metadata in `WorkflowProgress` beside replacements so downstream steps can
   recognize inherited prefixes without shape guessing. `recover_mapping` must rebuild it from the
   workflow graph, source terminals, and persisted step outputs.
7. Recovery must reconstruct the same axis identities deterministically; no new database column is
   needed. Derive tokens from the invocation/step nesting path, semantic source role, linked group,
   and axis ordinal rather than an in-memory UUID.

Apply the generic composition path to every executable module that uses collection mapping, not
only `ToolModule`. Audit at least `SubWorkflowModule`, `ToolModule`, and `PickValueModule`; nested
subworkflows must compose rather than reset inherited context.

Remove the old either/or behavior in `compute_collection_info`:

```python
return collection_info or progress.subworkflow_collection_info
```

That line is the direct reason a local inner mapping discards the inherited outer mapping. Also
replace the `subworkflow_structure` peel logic with the explicit prefix/binding rule above.

Regression tests:

- corrected #23426 fixture and the 2+6 job-count assertions;
- one inner step consuming both A and B, and another consuming only B;
- nested mapped subworkflow (outer axes compose once at each level);
- mapped child step with no data dependency on the mapping-causing input;
- unequal outer/inner cardinalities with outer `when=[true,false]`;
- empty outer collection;
- scheduler restart after some mapped jobs have completed;
- existing `test_invocation_map_over_inner_collection*` and
  `test_invocation_double_map_over_inner_collection_with_tool_collection_input` unchanged.

**Branch effect:** the `parent_mapping` half of `find_cwl_scatter_collections`, the special
`outer_when_values` routing, and the `has_explicit_scatter`/CWL-tool gates are replaced by generic
inherited-axis composition.

### Phase 3 — Handle pass-through outputs and document the parameter boundary

Tool- and module-produced dataset outputs should already have the inherited structure after Phase
2. Do **not** inspect producers afterward and duplicate computed outputs.

The remaining dataset case is a child workflow output wired directly to an input step:

- if the input already carries the inherited axes, return/reuse that mapped object;
- if it is a direct collection/value that does not carry them, wrap it once per inherited
  coordinate using outer identifiers followed by its declared inner structure;
- keep the wrapper adapter-backed while possible, but explicitly test serialization and scheduler
  recovery; materialize with the existing adapter-to-HDCA path when a model object is required;
- materialize distinct collection elements over shared input HDAs. Do not point multiple parent
  elements at one shared child `DatasetCollection` without auditing ownership assumptions.

This is pass-through shaping, not an optimization for runnable producers.

Parameter/`output_value` outputs are a separate interface question because Galaxy has no dataset
collection to carry the mapped values. Do not let that block the dataset/collection bug fix. Scope
the initial upstream PR explicitly to dataset/collection outputs, add a rejecting or expected-
unsupported test for mapped parameter outputs, and resolve parameter arrays in a follow-up design.

Tests: direct scalar input output, direct collection input output, optional/skipped input, nested
pass-through, adapter round-trip, and invocation recovery.

### Phase 4 — Retire CWL synthetic cross-product HDCAs *(branch-local)*

With generic product iteration, `flat_crossproduct` should use the same product coordinates as
`nested_crossproduct` and project them to a flat output layout. It should not materialize N×M
synthetic input HDCAs merely to reuse linked iteration.

Delete `_build_flat_crossproduct_hdcas`, `_flat_cross_synthetic`, and the `input_overrides`
parameter threaded through `subworkflow_invoker`, `subworkflow_progress`, and
`SubWorkflowModule`. Preserve CWL-specific code only for reading `scatterMethod`, ordering axes by
the CWL `in:` declaration, and selecting flat versus nested output layout.

This phase is abandonable independently of the generic Galaxy fix and is gated on the measured CWL
baseline.

### Phase 5 — Semantics documentation

Add the callable-boundary rule and worked examples to
`lib/galaxy/model/dataset_collections/types/collection_semantics.yml`, feeding
`doc/source/dev/collection_semantics.md`. Include links from each example to the editor, framework,
API/job-cardinality, and collection-matcher tests. State explicitly that one child invocation is
the execution container and that mapped jobs, rather than child invocation rows, carry element
cardinality.

---

## 4. Testing strategy

Order the loops by cost; run slow Galaxy suites one at a time.

1. **Unit** — `test/unit/data/dataset_collections/test_matching.py` and `test_structure.py`.
   Phase 1 is fully testable here, including the `IndexError` reproduction, with no app. Fastest
   red-to-green loop in the plan; do essentially all of Phase 1's iteration at this level.
2. **Framework workflow** — the #23426 workflow with the corrected `list:list` oracle, plus
   pass-through, nested, empty, and conditional siblings.
3. **API/job evidence** — assert inner job cardinality and distinct output HDAs. Then run
   `test_invocation_map_over_inner_collection*` and
   `test_invocation_double_map_over_inner_collection_with_tool_collection_input`; they must stay green
   **unchanged**. If any needs editing, stop: that is a signal the semantics drifted past the
   intended blast radius, not a licence to adjust the test.
4. **CWL conformance** — the 10 workflows in
   `test/functional/tools/cwl_tools/v1.2/tests/scatter/` are the strongest regression net available
   for multi-axis behaviour, covering all four outer×inner method combinations. Run them **before**
   starting, to convert "marked green" into a measured baseline. Without that baseline the phases
   cannot be graded.

### 4.1 Pre-work — establish the baseline

Nothing else starts until this is done:

```
# Directory is named cwl_fixes_4; checked-out branch is cwl_fixes_5.
cd /Users/jxc755/projects/worktrees/galaxy/branch/cwl_fixes_4
# With the branch environment activated and lib on PYTHONPATH:
pytest -m cwl_conformance_v1_2 -k "scatter" lib/galaxy_test/api/cwl/test_cwl_conformance_v1_2.py
```

Record pass/fail per test. Every later phase is graded against this list, not against the `green`
markers.

---

## 5. Divergence accounting

| Phase | Branch code removed | Lands in |
|---|---|---|
| 1 | `_iter_parent_mapping_x_scatter`, `_build_combined_collection_info`, narrow cross-product iteration | `dev` abstraction; delete on branch |
| 2 | `parent_mapping` discovery and `outer_when_values` routing | `dev` generic behavior; delete on branch |
| 3 | — (small pass-through wrapper only) | `dev` |
| 4 | `_build_flat_crossproduct_hdcas`, `_flat_cross_synthetic`, `input_overrides` | branch-local deletion |
| 5 | — | `dev` |

Do not promise a line-count reduction until the branch is rebased; the first draft's ~175-line
number mixes code from different branch ages. Grade divergence by deleting the named concepts.

---

## 6. Risks

| Risk | Assessment |
|---|---|
| **More jobs and changed output shape for existing workflows** | Real and the main compatibility risk. An outer-independent inner mapping changes from M jobs/flat output to N×M jobs/nested output. This is required callable behavior, but can materially increase cost. Audit before landing and release-note it. |
| **Axis accidentally duplicated or conflated** | Equal-shaped unrelated collections cannot establish identity. Use deterministic axis provenance and tests with identical identifiers/cardinalities on independent axes. |
| **Non-collection subworkflow outputs** | Not designed. Scope the first fix to dataset/collection outputs and make unsupported behavior explicit rather than guessing. |
| **`when` interaction on the outer axis** | Phase 1 handles per-axis conditions, but conditional subworkflows crossed with inner mapping have thin coverage. `conditionals_nested_cross_scatter` and `conditionals_multi_scatter` in the conformance suite are the closest thing to a test and must be in the baseline. |
| **Recovery changes axis identity/order** | A scheduler restart must reconstruct the same product and map completed jobs to the same coordinates. Use deterministic tokens and add a partial-completion restart test. |
| **Pass-through adapter serialization** | Direct outputs surviving a scheduler restart depend on adapter round-tripping. Test explicitly; eager HDCA materialization is the fallback. |
| **Empty outer axes** | Product iteration over zero elements must create correctly typed empty outputs and no child jobs, not fall back to one unmapped execution. |
| **Phase 4 regressions** | Touches every CWL scatter path. Gated on a green conformance baseline; abandonable without affecting Phases 1-3. |

### 6.1 Compatibility audit

Use two passes; static workflow analysis alone cannot know the runtime type of every connected
history item.

1. **Structural candidates:** flag mapped-capable subworkflow steps containing a runnable step or
   output that is not transitively dependent on every boundary input that can induce mapping.
2. **Realized invocations:** where instance data is available, inspect actual boundary input
   collection types and count cases in which inherited-axis semantics would add jobs or an output
   dimension. Estimate N×M growth, not only the number of workflows.

Run the first pass over the test corpus and both passes on a representative instance if possible.
Use measured frequency and job multiplication in the release/compatibility discussion.

Deliberately **not** proposed: a config flag or a per-workflow semantics version. Both would
reintroduce exactly the conditionality this plan exists to remove, and would leave the editor
unable to know which rule applies to the workflow in front of it.

---

## 7. Decisions and remaining implementation questions

Settled for this plan:

- **Callable boundary, not input constraint.** The other collection input stays `list`; outputs
  gain the outer axis.
- **One child invocation permanently.** N invocation rows are not a future goal. Revisit only for
  a concrete invocation-level UI/provenance requirement.
- **Execute, do not broadcast, runnable producers.** An outer-independent inner step runs N×M
  jobs.
- **The editor signature is representative.** The server resolves the child's mapped tool output
  to `list` before exposing the subworkflow output.
- **No red test lands.** Correct the framework oracle and land it with the implementation.
- **Generic phases go upstream.** CWL is the regression proof and deletion beneficiary, not a gate
  on the semantic decision.

Still open, but none blocks the dataset/collection implementation:

1. What is the public type and persistence model for mapped parameter/`output_value` outputs?
2. Does a pass-through repeated collection remain adapter-backed in invocation output APIs, or
   should it be materialized eagerly for simpler recovery/export semantics?
3. Should the invocation UI add copy explaining that one subworkflow invocation contains mapped
   jobs? This is presentation, not a scheduler/data-model dependency.
4. What does the compatibility audit show about job multiplication, and does that justify a
   temporary rollout switch? Do not create permanent dual semantics; the editor cannot represent
   them reliably.
