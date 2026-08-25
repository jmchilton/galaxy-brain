# Keep subworkflow `when` values with the collection they describe

## What's wrong

When a collection is mapped over a data input of a subworkflow step, Galaxy does not run the
subworkflow once per element of that collection. The child workflow runs as a single invocation
with the whole collection handed to its input step, and each step inside it then maps over whatever
collections are connected to its own inputs.

`MatchingCollections.when_values` is a flat list read by element position — `_walk_collections`
does `when_value = self.when_values[index]` as it walks the collection. Those values mean something
only for the collection they were computed over.

`WorkflowModule.compute_collection_info` copied the subworkflow's list onto every step inside it,
including steps that had mapped over some entirely different collection. Reading one collection's
conditions at another collection's element positions gives:

- **same number of elements** → every element silently gets the wrong condition
- **different number of elements** → `IndexError` out of `_walk_collections`

Separately, `SubWorkflowModule.execute` built one `None` per mapped element even when the
subworkflow step had no `when` expression at all. An all-`None` list is still truthy, so a
completely unconditional mapped subworkflow started reading conditions by position and failed as
soon as a step inside it mapped over a longer collection.

## What this changes

1. **No condition means no condition.** `SubWorkflowModule.execute` collapses an all-`None` list to
   `None`, so a subworkflow with no `when` expression carries no condition state at all instead of a
   placeholder per mapped element.

2. **Conditions only follow collections whose elements correspond.** New
   `MatchingCollections.is_aligned_with` asks whether two matches share a collection they were
   mapped from — the same collection, or one that an implicit collection was created from, followed
   through `implicit_input_collections`, `copied_from_history_dataset_collection_association`, and
   adapter `adapting`. An implicit collection has the same element identifiers in the same order as
   the collection mapped over to create it, which is exactly what reading conditions by element
   position needs.

   Only linked collections are consulted. They share one structure and have already passed
   `compatible_shape`, so a match on any one of them holds for all of them — which is why the
   existing `..._with_extra_nesting` conditional-subworkflow regression still gets its conditions:
   that step has two collections in one match.

3. **Fail with an explanation instead of guessing.** When a step inside a conditional subworkflow
   maps over a collection whose elements don't correspond, the invocation fails:

   > This step maps over a collection that cannot be matched up element by element with the
   > collection mapped over the conditional subworkflow containing it.

## Tests

- **Framework workflow** `subworkflow_mapping_per_step` — one subworkflow with two unrelated
  collections mapped inside it: a step reading the data input the subworkflow was mapped over
  (2 elements) and a sibling reading the subworkflow's own collection input (3 elements). Both
  outputs are exported and asserted flat at 2 and 3 elements, so the test fails if the two are
  multiplied together or matched up element by element. Verified red→green: it fails against the
  pre-fix `modules.py` and passes at HEAD.

  The differing element counts are the point. An earlier 2-and-2 version of this test passed even
  with the bug present, because `[None, None]` read harmlessly against a 2-element collection.

- **API** `test_conditional_subworkflow_rejects_independent_child_mapping` — a genuinely conditional
  subworkflow with an unrelated collection mapped inside it, tested with two- and three-element
  independent collections. It asserts that the invocation fails with the message above rather than
  crashing or quietly mismatching.

- **API** `test_invocation_conditional_map_over_inner_collection` — the conditional counterpart of
  the existing `test_invocation_map_over_inner_collection`: a `list:list` mapped over a subworkflow
  that declares a `list` input, so the steps inside map over a sub-collection of what the
  subworkflow was mapped over. Asserts the same output as the unconditional sibling when the
  condition holds, and a skipped output when it doesn't. Nothing covered this combination before —
  every existing conditional-subworkflow test maps over a flat list, and every sub-collection
  mapping test is subworkflow-free.

  Verified red→green against the guard rather than the original bug: with `is_aligned_with` forced
  to `False` the invocation fails on `intermediate_step` with the rejection message, so the test
  really does exercise alignment on a legitimate case.

- **Unit** `test/unit/data/dataset_collections/test_matching.py` — four cases over
  `is_aligned_with`: the same collection, an implicit collection created from it, two unrelated
  collections, and symmetry.

## Docs

Registers the rule in `collection_semantics.yml`, which had no subworkflow examples at all, as
`UNCONDITIONAL_SUBWORKFLOW_INDEPENDENT_LOCAL_MAPPING`, along with prose for the Subworkflows section
covering how mapping resolves per step inside a subworkflow and how `when` results travel with it.

Regenerating `doc/source/dev/collection_semantics.md` also picks up the **Type Compatibility
Algebra** section, which was added to the YAML in `39597b3366` without regenerating the doc — that's
why the generated-doc diff is larger than the new prose alone.

## Where the correspondence can't be established

Following how a collection was created relies on `implicit_input_collections`, which
`collections.py` records only when the mapped-over input is an HDCA — a dataset collection element
is skipped, with an in-tree comment noting the association is kept "for extracting workflows
currently."

That gap doesn't appear to be reachable from a workflow. A step's mapped-over input comes from
`replacement_for_input`, which resolves to a prior step's output, and those are HDCAs; elements
arrive as a mapped-over input through `meta.py` on the direct tool-execution path, where a user drags
a sub-collection (`src: "dce"`). The guard, meanwhile, only runs inside a conditional subworkflow
that has been mapped over — workflow-only. The two don't meet.

The case with the best claim to reaching it is sub-collection mapping inside a conditional
subworkflow, and `test_invocation_conditional_map_over_inner_collection` confirms it does not: both
steps inside get HDCAs and both align. If that provenance record were missing, the step would be
rejected with the message above — an explicit error, never a quiet mismatch.

## Not addressed here

`when` results are still kept as a flat list rather than being attached to the collection elements
and jobs they were computed for. This change makes the by-position reading safe to rely on —
carried where the elements correspond, refused where they don't — but it does not change how the
results are stored.
