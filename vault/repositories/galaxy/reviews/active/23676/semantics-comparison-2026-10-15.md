# Architectural comparison: #23676 with #24154 / #24155

Date: 2026-10-15. Reviewed #23676 head `6ece27c39d8dbd3f72dd13ad208762f715095d08` (OPEN draft). **UNPOSTED.** Targeted static architectural assessment, not a full review or merge recommendation. No Galaxy files changed and no tests executed in this assessment.

## Conclusion

#23676 materially improves the model we can point at: mapping a subworkflow establishes coordinates inherited by every executable child step, regardless of data dependencies. It implements shape-preserving conditional behavior for pass-through outputs and Pick Value. It does **not** replace either narrow fix, change whole-collection output filtering, or unify null/default behavior. In particular, it does not resolve the mixed skipped/running + rejecting-filter case discussed for #24154.

## Concrete implementation

- [Callable-boundary contract](https://github.com/galaxyproject/galaxy/blob/6ece27c39d8dbd3f72dd13ad208762f715095d08/doc/source/dev/collection_semantics.md#L1121-L1176): one child invocation, ordered inherited mapping coordinates, linked zip, independent Cartesian products, correctly typed empty outputs, and skipped expression.json leaves at false coordinates. This is actual documentation backed by implementation and tests, not merely the PR body's aspiration.
- [Planner](https://github.com/galaxyproject/galaxy/blob/6ece27c39d8dbd3f72dd13ad208762f715095d08/lib/galaxy/workflow/map_over.py#L129-L166) composes the callable's inherited mapping with local mapping. Example from the contract: call mapped over A=[X,Y], direct collection B=[P,Q,R]. A child tool mapping only B gets six jobs and list[A]:list[B], whereas the old data-dependency-based mapping can run it only three times. Returning B directly now wraps it twice; a false Y coordinate replaces Y's leaves with skipped placeholders instead of exposing B.
- [Pass-through shaping](https://github.com/galaxyproject/galaxy/blob/6ece27c39d8dbd3f72dd13ad208762f715095d08/lib/galaxy/workflow/map_over.py#L833-L924) implements coordinate-preserving outputs; [API assertions](https://github.com/galaxyproject/galaxy/blob/6ece27c39d8dbd3f72dd13ad208762f715095d08/lib/galaxy_test/api/test_workflows.py#L4204-L4232) verify false-branch expression.json leaves and preserved identifiers, including nested collection pass-through.
- [Mapped Pick Value](https://github.com/galaxyproject/galaxy/blob/6ece27c39d8dbd3f72dd13ad208762f715095d08/lib/galaxy/workflow/modules.py#L2285-L2307) now obeys false inherited coordinates rather than evaluating the pick there. In single-value modes it emits a skipped placeholder; all_non_null emits an empty collection at that coordinate. This is an additional behavior change, distinct from filtered tool outputs.

## What it does not solve

- [Output collection precreation](https://github.com/galaxyproject/galaxy/blob/6ece27c39d8dbd3f72dd13ad208762f715095d08/lib/galaxy/tools/execute.py#L683-L699) still evaluates the output filter once using example parameters. [Example selection](https://github.com/galaxyproject/galaxy/blob/6ece27c39d8dbd3f72dd13ad208762f715095d08/lib/galaxy/tools/execute.py#L101-L114) normally takes the first parameter combination. There is no per-coordinate filtered/missing collection-element representation introduced here. The diff to execute.py contains typing/structure plumbing, not a filter-policy change. After composing #24154, its all-skipped bypass would still differ from mixed skipped/running filtering. This composition conclusion is a source-level inference, not an executed combined-branch reproduction.
- Absence stays distinct from skipped leaves: [shape_passthrough_output](https://github.com/galaxyproject/galaxy/blob/6ece27c39d8dbd3f72dd13ad208762f715095d08/lib/galaxy/workflow/map_over.py#L843-L846) immediately returns NO_REPLACEMENT unchanged, and [the unit test](https://github.com/galaxyproject/galaxy/blob/6ece27c39d8dbd3f72dd13ad208762f715095d08/test/unit/workflows/test_modules.py#L976-L989) explicitly pins this. [Recovery test](https://github.com/galaxyproject/galaxy/blob/6ece27c39d8dbd3f72dd13ad208762f715095d08/test/unit/workflows/test_modules.py#L1077-L1105) preserves absence through child output-value persistence. It therefore complements #24155 rather than requiring null substitution.
- Nothing in #23676 changes parameter default application. It does not make an incoming expression-null choose an optional numeric tool default. It does not turn all absent outputs into nulls.
- This is not full CWL equivalence. The shape/coordinate approach agrees with the scattered-skip intuition, but Galaxy output filters remain separate semantics. Its skipped collection pass-through preserves nested shape with null leaves; CWL's direct skipped collection-valued output would be null for that output, not necessarily a recursively null-filled collection. Mapped scalar parameter pass-through is explicitly unsupported in [the contract](https://github.com/galaxyproject/galaxy/blob/6ece27c39d8dbd3f72dd13ad208762f715095d08/doc/source/dev/collection_semantics.md#L1193-L1197).

## Ordinary child tools versus pass-through exports

For an ordinary child tool, inherited coordinates become job slices. [ToolModule](https://github.com/galaxyproject/galaxy/blob/6ece27c39d8dbd3f72dd13ad208762f715095d08/lib/galaxy/workflow/modules.py#L3220-L3256) retains an inherited false condition and writes `__when_value__=False`; [tool execution](https://github.com/galaxyproject/galaxy/blob/6ece27c39d8dbd3f72dd13ad208762f715095d08/lib/galaxy/tools/execute.py#L370-L377) passes that as `skip=True`. This is control-flow skipping, not choosing defaults for the child input. Input resolution still happens before that flag is passed on. The existing tool output creation path decides placeholders and filters, which is why #24154 remains relevant.

A directly exported child input has no producing tool job. The new pass-through code must therefore apply its own false-coordinate overlay to avoid leaking real input values. That overlay is not an implementation of per-element filtered tool outputs.

The new ordered coordinates, conditions, and persistence would help implement a future per-coordinate missing-output policy by supplying reliable positions and lineage. They do not decide that policy or change the tool output creation/implicit collection assembly layers that would need to represent filtered absence. There is no automatic replacement of first-job collection filtering with per-coordinate filtering.

## Effect on the review approach

Keep #24154/#24155 as narrow fixes. Use #23676's callable-boundary contract to frame the longer-term question: a false coordinate retains shape, while a missing declared filtered output currently may remove the whole collection. Do not claim #23676 already supplies a uniform null/missing/default model.

The useful integration test is a mapped subworkflow containing an output-filtering tool: exercise all true, all false, and mixed when values with a rejecting output filter; expose the output directly and through Pick Value / an optional consumer; preserve identifiers; repeat after scheduler recovery. This would identify the unresolved interaction without making it a precondition for unrelated mapping work.

## Risks

#23676 establishes developer-visible workflow semantics and persistent mapping metadata; compatibility and migration risks are materially larger than the two narrow fixes.

- Existing subworkflows with steps independent of the mapped input can gain jobs and extra output dimensions (and therefore runtime/cost changes).
- The new [persisted mapping serializer and recovery](https://github.com/galaxyproject/galaxy/blob/6ece27c39d8dbd3f72dd13ad208762f715095d08/lib/galaxy/workflow/run.py#L672-L792), together with a database column migration, require upgrade/recovery review; axis persistence alone does not encode a null/absence policy.
- Joint filter/condition behavior remains a one-way semantic choice for workflow authors. Shape consistency is a design direction, not evidence that current filters already obey it.
