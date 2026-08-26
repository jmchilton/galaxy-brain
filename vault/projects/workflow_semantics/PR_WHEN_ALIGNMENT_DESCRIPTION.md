Builds on #PR1 — the unconditional half of the original #23369, which fixes a real
`IndexError`. This half fixes no user-visible bug; it stops a *conditional* subworkflow
from pairing `when` results with elements they were never computed for, and makes the case
where that cannot be established fail with an explanation.

## What's wrong

`MatchingCollections.when_values` is a flat list read by element position —
`_walk_collections` does `when_value = self.when_values[index]` as it walks a collection.

The list is **produced** by one walk and **consumed** by another. `SubWorkflowModule.execute`
computes it by walking the collection the subworkflow step was mapped over.
`WorkflowModule.compute_collection_info` then copies it onto every step inside the
subworkflow — including steps that mapped over some entirely different collection, whose
own linked structure is what `_walk_collections` will actually walk. Index `i` then means
two different things on the two sides:

- **same number of elements** → every element silently gets the wrong condition
- **different number of elements** → `IndexError` out of `_walk_collections`

## What this changes

**Conditions only follow collections whose elements correspond.** New
`MatchingCollections.is_aligned_with` asks whether two matches share a collection they were
mapped from — the same collection, or one that an implicit collection was created from,
followed through `implicit_input_collections`,
`copied_from_history_dataset_collection_association`, and adapter `adapting`. An implicit
collection has the same element identifiers in the same order as the collection mapped over
to create it, which is exactly what reading conditions by element position needs.

Only linked collections are consulted. They share one structure and have already passed
`compatible_shape`, so a match on any one of them holds for all — which is why the existing
`..._with_extra_nesting` conditional-subworkflow regression still gets its conditions: that
step has two collections in one match.

Note this is *not* the same as "don't inherit when the step has its own `collection_info`".
A step consuming the collection the subworkflow was mapped over has its own
`collection_info` and still needs the conditions. Alignment is what separates that from a
step that mapped over something unrelated. Shape comparison can't do it either — two
unrelated 2-element lists have identical shape.

**Fail with an explanation instead of guessing.** When a step inside a conditional
subworkflow maps over a collection whose elements don't correspond, the invocation fails:

> This step maps over a collection that cannot be matched up element by element with the
> collection mapped over the conditional subworkflow containing it.

## Tests

- **API** `test_conditional_subworkflow_rejects_independent_child_mapping` — a genuinely
  conditional subworkflow with an unrelated collection mapped inside it, with two- and
  three-element independent collections. Asserts the invocation fails with the message
  above rather than crashing or quietly mismatching.

- **API** `test_invocation_conditional_map_over_inner_collection` — the conditional
  counterpart of the existing `test_invocation_map_over_inner_collection`: a `list:list`
  mapped over a subworkflow that declares a `list` input, so the steps inside map over a
  sub-collection of what the subworkflow was mapped over. Asserts the same output as the
  unconditional sibling when the condition holds, and a skipped output when it doesn't.
  Nothing covered this combination before — every existing conditional-subworkflow test
  maps over a flat list, and every sub-collection mapping test is subworkflow-free.

  Verified red→green against the guard rather than a bug: with `is_aligned_with` forced to
  `False` the invocation fails on `intermediate_step` with the rejection message, so the
  test really does exercise alignment on a legitimate case.

- **Unit** `test/unit/data/dataset_collections/test_matching.py` — four cases over
  `is_aligned_with`: the same collection, an implicit collection created from it, two
  unrelated collections, and symmetry.

## Docs

Extends the Subworkflows section added by #PR1 with how `when` results travel with the
mapping they were computed over.

## Where the correspondence can't be established

Following how a collection was created relies on `implicit_input_collections`, which
`collections.py` records only when the mapped-over input is an HDCA — a dataset collection
element is skipped, with an in-tree comment noting the association is kept "for extracting
workflows currently."

That gap doesn't appear to be reachable from a workflow. A step's mapped-over input comes
from `replacement_for_input`, which resolves to a prior step's output, and those are HDCAs;
elements arrive as a mapped-over input through `meta.py` on the direct tool-execution path,
where a user drags a sub-collection (`src: "dce"`). The guard, meanwhile, only runs inside a
conditional subworkflow that has been mapped over — workflow-only. The two don't meet.

The case with the best claim to reaching it is sub-collection mapping inside a conditional
subworkflow, and `test_invocation_conditional_map_over_inner_collection` confirms it does
not: both steps inside get HDCAs and both align. If that provenance record were missing,
the step would be rejected with the message above — an explicit error, never a quiet
mismatch.

## Not addressed here

`when` results are still kept as a flat list rather than being attached to the collection
elements and jobs they were computed for. This change makes the by-position reading safe to
rely on — carried where the elements correspond, refused where they don't — but it does not
change how the results are stored.
