# Subworkflow collection mapping and `when` state

Handoff recorded 2026-08-23 for a fresh work session.

## Repository and branch

- Galaxy worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/workflow_semantics`
- Branch: `subworkflow_mapping_per_step`
- HEAD: `950bd75e35b62ccb9330e82e7f3d2730cc93cdf4` — `Pin subworkflow mapping to per-step collection matching`
- Tracking comparison at handoff: 1 commit ahead of and 31 commits behind `origin/dev`
- Merge base with the current `origin/dev`: `8983c37e45568c1e0c8225ac8036e7a5737c9fe9`
- The same HEAD is also advertised locally by `jmchilton/subworkflow_mapping_per_step` and `jmchilton-https/subworkflow_mapping_per_step`.

Nothing from the investigation after HEAD has been committed yet.

## What HEAD currently contains

HEAD adds a subworkflow collection-mapping semantics example and a framework workflow test:

- `lib/galaxy_test/workflow/subworkflow_mapping_per_step.gxwf.yml`
- `lib/galaxy_test/workflow/subworkflow_mapping_per_step.gxwf-tests.yml`
- `lib/galaxy/model/dataset_collections/types/collection_semantics.yml`
- generated `doc/source/dev/collection_semantics.md`

The original example uses two independent two-element collections. One is connected to a subworkflow input declared as a dataset, so the subworkflow step is mapped over it. The other is connected to a subworkflow input declared as a list collection and is consumed by a different child tool step. The intended result is two independent flat outputs rather than a nested 2×2 output.

That clarification is directionally reasonable, but the original equal 2×2 cardinalities accidentally hide a runtime bookkeeping bug. The committed prose also overstates the model with language such as “mapping axes attach per step.” Galaxy does not normally use “axis” here, and conditional subworkflows show that inherited collection mapping can matter to child steps that do not directly consume the original collection.

## The concrete data flow

Both collections are independent top-level workflow inputs. Neither is produced from the other, and there is no workflow edge connecting them.

```text
outer_mapping_source A = [X, Y]
            |
            | connected to child input declared `data`
            v
      mapped subworkflow step
            |
            +--> child cat(A) --> inherited_mapping_output = [X, Y]

inner_mapping_source B = [P, Q, R]
            |
            | passed whole through child input declared `collection<list>`
            v
            +--> child cat(B) --> local_mapping_output = [P, Q, R]
```

The child graph runs as one workflow invocation. The subworkflow carries the mapping structure arising from A into that invocation. Each executable child step then resolves collection mapping for its own inputs. The child step consuming B has a local mapping structure from B. A and B must not be multiplied together or matched by element position.

## The demonstrated bug

The problem is in conditional-state bookkeeping, not in the basic fact that the child step may map over B independently.

While executing a mapped subworkflow with no `when` expression, `SubWorkflowModule.execute()` nevertheless builds one placeholder value per element of A:

```text
A has two elements
inherited when_values = [None, None]
```

Later, `WorkflowModule.compute_collection_info()` lets the child step correctly compute local collection mapping for B, but then blindly copies the inherited `when_values` onto B's mapping structure. Collection walking indexes those values by B's element position.

```text
B[0] = P --> when_values[0] = None
B[1] = Q --> when_values[1] = None
B[2] = R --> when_values[2] = IndexError
```

Changing the original test from 2×2 to 2×3 reproduced:

```text
IndexError: list index out of range
```

The failure occurs while the child `cat` step walks B in `structure.py`, not because Galaxy is trying to produce a Cartesian product. The equal 2×2 fixture passed only because the unrelated positional lists happened to have the same length.

## The deeper design issue

The narrow crash is caused by an unconditional subworkflow representing “no condition” as `[None, None]`. Normalizing that to `None` is independently correct and prevents valid unconditional workflows from crashing.

There is nevertheless a deeper unresolved issue: real per-element `when` results are stored as a positional list on collection mapping information without sufficient provenance saying which mapped-over collection elements or derived jobs those results belong to.

With a real inherited value such as `[True, False]`, blindly attaching it to an unrelated child collection can produce either:

- an obvious failure when B has a different length, or
- a worse silent positional association when B also has two elements (`P -> True`, `Q -> False`) even though P/Q have no relationship to X/Y.

Therefore the narrow fix must not be presented as a full solution to conditional subworkflow mapping. It removes invalid placeholder state and makes the unconditional semantics test honest; it does not prove that genuine condition state is propagated safely.

## The broader fix that was tried and reverted

An apparently broader guard was prototyped: inherit `when_values` only when the child and parent collection-matching information reference the same collection identity.

That made the independent A/B case work, but it broke the existing legitimate regression:

```text
test_run_workflow_conditional_subworkflow_step_map_over_expression_tool_with_extra_nesting
```

In that workflow, a conditional subworkflow is mapped over a boolean input collection. A child expression step creates a new implicit collection while running under that inherited mapped work. A later child step needs the outer structure and per-element condition state to remain associated with the derived implicit collection. The derived collection is a new database collection, so raw collection identity is different even though it corresponds element-for-element to the original mapped work.

That experiment was fully backed out. `matching.py` and its unit tests are not modified in the present worktree.

A complete solution likely needs per-element `when` results to remain associated with the mapped-over collection elements and the implicit collection jobs for which they were calculated. It must allow condition state to follow a legitimately derived implicit collection while refusing to attach it to an unrelated collection merely because positions or cardinalities happen to match.

## Uncommitted worktree changes

Five tracked files are modified:

1. `lib/galaxy/workflow/modules.py`
   - Adds the narrow normalization:
     ```python
     conditional_values = when_values if any(value is not None for value in when_values) else None
     ```
   - Passes `conditional_values`, rather than an all-`None` vector, into the child invocation and collection information.

2. `lib/galaxy_test/workflow/subworkflow_mapping_per_step.gxwf.yml`
   - Renames inputs, child steps, and outputs to describe their roles.
   - Removes “axis” terminology.
   - Describes inherited and local mapping structures more carefully.

3. `lib/galaxy_test/workflow/subworkflow_mapping_per_step.gxwf-tests.yml`
   - Strengthens the fixture from two independent 2-element collections to A with 2 elements and B with 3.
   - Asserts flat outputs with cardinalities 2 and 3.

4. `lib/galaxy/model/dataset_collections/types/collection_semantics.yml`
   - Rewrites the semantics around Galaxy's implementation term “mapping structure.”
   - Explicitly scopes this example to the unconditional case.
   - Explains that a child step's local mapping structure is not automatically multiplied by or positionally matched with the inherited structure.

5. `doc/source/dev/collection_semantics.md`
   - Regenerated/updated prose matching the YAML semantics source.

Current diff summary: 112 insertions and 90 deletions across those five files.

The repository also has these untracked research notes. They pre-existed this focused change and should not be added or removed casually:

- `COMPONENT_GALAXY_WORKFLOW_EXPRESSION_CONTEXT.md`
- `MEDIUM_PRIORITY_TEST_PLAN.md`
- `NULL_CHAIN_AND_MAPPING_COMBINATION_TESTS.md`
- `RESEARCH_GAPS_HIGH_PRIORITY.md`
- `RESEARCH_GAPS_MEDIUM_PRIORITY.md`
- `WF_SEMANTICS_FACT_QUESTIONS.md`
- `WORKFLOW_SEMANTICS_STATUS.md`
- `workflow_semantics_facts.yml`

## Verification already completed

The following passed with the current narrow fix and strengthened fixture:

- Framework workflow test:
  ```sh
  env UV_CACHE_DIR=/private/tmp/uv-cache-workflow-semantics ./run_tests.sh -framework-workflows -id subworkflow_mapping_per_step
  ```
  Result: `1 passed, 80 deselected`.

- Existing conditional/nested regression:
  ```sh
  ./run_tests.sh -api lib/galaxy_test/api/test_workflows.py::TestWorkflowsApi::test_run_workflow_conditional_subworkflow_step_map_over_expression_tool_with_extra_nesting
  ```
  Result: `1 passed`.

- Collection semantics unit suite: 61 passed.
- Black check for `lib/galaxy/workflow/modules.py`: passed (with only the environment's Python-target warning).
- `git diff --check`: clean.

The 2×3 fixture was also run before applying the narrow fix and failed with the expected `IndexError`, which establishes that the revised test detects the bug rather than merely documenting an already-working case.

## Recommended next steps

1. **Keep the narrow unconditional fix, but name its scope honestly.** An all-`None` list is not real condition state. Removing it fixes a valuable, independently incorrect bookkeeping state. Do not claim it resolves genuine conditional-state provenance.

2. **Rename the semantics label to make the scope unmistakable.** For example, change `SUBWORKFLOW_LOCAL_MAPPING_TAKES_PRECEDENCE` to something including `UNCONDITIONAL`. “Takes precedence” may also be stronger than the runtime model warrants; a label describing independent local collection mapping would be safer.

3. **Add focused characterization for real condition state plus an unrelated child collection.** Cover both:
   - 2×3, which exposes out-of-range indexing; and
   - 2×2 with distinct element identifiers, which exposes silent positional association.

   Do not encode the current crash or accidental filtering as desired semantics. Until the intended contract is settled, make these explicit research-gap or expected-failure tests, or assert a minimum invariant such as “no raw `IndexError`; either provenance-aware execution or a clear domain-specific rejection.” Check Galaxy's established expected-failure style before adding one.

4. **Trace provenance through the legitimate conditional case.** Follow the boolean input collection, the expression step's implicit output collection, and the implicit collection jobs. Identify the stable relationship that proves the new collection is derived from the same per-element mapped work. Raw database collection identity is known to be insufficient.

5. **Design the broader rule around that relationship.** Per-element `when` results should follow derived mapped work, but never an unrelated local collection merely because it has the same number of elements. Acceptable outcomes are provenance-aware propagation or an intentional, Galaxy-specific validation error for an unsupported composition.

6. **Rebase/update carefully.** The branch is 31 commits behind `origin/dev`. Preserve the five tracked worktree edits and unrelated untracked notes, then rebase or otherwise update according to the desired branch workflow. Rerun the focused tests after resolving any drift.

7. **Before committing, review the generated documentation diff.** HEAD originally brought in unrelated generated Type Compatibility Algebra material because the Markdown had been stale. Decide whether that generated addition belongs in this commit or should be separated; do not hand-edit generated prose inconsistently with `collection_semantics.yml`.

## Suggested first commands tomorrow

```sh
cd /Users/jxc755/projects/worktrees/galaxy/branch/workflow_semantics
git status --short --branch
git diff -- lib/galaxy/workflow/modules.py \
  lib/galaxy/model/dataset_collections/types/collection_semantics.yml \
  doc/source/dev/collection_semantics.md \
  lib/galaxy_test/workflow/subworkflow_mapping_per_step.gxwf.yml \
  lib/galaxy_test/workflow/subworkflow_mapping_per_step.gxwf-tests.yml
```

Then inspect these runtime paths together:

- `SubWorkflowModule.execute()` in `lib/galaxy/workflow/modules.py`
- `WorkflowModule.compute_collection_info()` in the same file
- `Tree._walk_collections()` in `lib/galaxy/model/dataset_collections/structure.py`
- the existing conditional extra-nesting API regression in `lib/galaxy_test/api/test_workflows.py`

## One-paragraph restart summary

HEAD attempts to document that independent collection mapping inside one subworkflow invocation produces flat per-step outputs, but its 2×2 fixture masks a real bug. An unconditional mapped subworkflow creates `[None, None]` as if it had per-element condition state; that list is later copied onto an unrelated child step's local collection mapping and a 2×3 collection crashes by positional indexing. The current uncommitted narrow fix represents an all-`None` vector as no condition state, and the strengthened 2×3 test passes while the existing legitimate conditional/nested regression remains green. Keep that correction, but treat real `[True, False]` propagation as unresolved design debt: condition results need provenance tied to the mapped elements/jobs they came from so they can follow derived implicit collections without leaking onto unrelated collections.
