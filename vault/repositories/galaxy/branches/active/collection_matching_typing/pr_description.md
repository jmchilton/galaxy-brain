Refactor ahead of 🔀 #23676 - bringing subworkflow mapping in line between the workflow editor and the backend.

| Case | `dev` | This PR |
| --- | --- | --- |
| Workflow step mapping two linked inputs, the first (by input name) an empty list and the other not | ❌ invocation fails with a bare `unexpected_failure`: no details, no step (a `KeyError` inside slicing) | ✅ fails with "Cannot match collection types." and the step id, as it already does with the inputs the other way round (both orders now pinned by an API test) |
| Tool mapped over a `src: "dce"` input named by an output's `default_identifier_source`, which sorts after another linked input | ❌ output silently takes the first linked input's element identifiers | ✅ output takes the named input's identifiers |
| `mypy.ini` red list | `matching`, `structure`, `registry` unchecked; `type_description` partly typed | ✅ all four fully typed, off the red list |

The collection matching and structure modules decide how every mapped-over tool and workflow step is sliced into jobs, and #23676 rewrites them. They were untyped and on the mypy red list, so a `Tree`, an unenumerated `UninitializedTree`, `None` and the shared `leaf` singleton were all interchangeable as far as the checker knew. ***Typing them turned up two places that test a tree's truthiness or read the wrong collection, and both are user-visible bugs, so this isn't a behavior-neutral typing PR:*** each fix is its own commit with unit and API tests that fail without it.

- **Empty list linked first.** `MatchingCollections.__attempt_add_to_linked_match` used `if not self.linked_structure:`. An empty list's `Tree` is falsy, so a later linked input silently replaced it and slicing then hit a `KeyError`. It now checks `is None`, as do the four `progress.subworkflow_structure` checks in `workflow/map_over.py`. Those four have no visible effect on their own, because an empty subworkflow map-over schedules zero jobs either way. Direct tool and API runs are unaffected: they already reject mismatched lengths with a 400 before matching.
- **DCE identifier source.** `ExecutionTracker._structure_for_output` read `source_collection.collection`, which for a `DatasetCollectionElement` is its *parent* collection, so the shape check failed and the output fell back to the first linked input's identifiers. It now goes through `get_collection`, as `sliced_input_collection_structure` above it already does.

***Beyond those two fixes, it changes how mapping is typed, not how it's computed: the axes model and the rest of #23676 stay there, and #23676 rebases onto this in place of its own interleaved typing commits.***

<details><summary>What the typing changes</summary>

- `BaseTree` is an abstract base for `Tree` and `UninitializedTree`. Operations that need enumerated children (`__len__`, `walk_collections`, `compatible_shape`, including `Tree.compatible_shape` given an `UninitializedTree`) raise `NotImplementedError("... children are not known")`, where they raised a bare `Exception`, an `AttributeError` or, for that last case, sometimes returned `False`. No caller reaches them; it's a programming error either way.
- `walk_collections` builds each element dict directly, dropping two loop closures and the `dict_map` helper; `compatible_shape` is three flat `isinstance` checks.
- `Structure = Leaf | BaseTree`, plus `WhenValues`, `CollectionSlice` and `CollectionTypeLike` (`str | CollectionTypeDescription`, the two forms tool inputs and workflow planning pass for a subcollection type) as named aliases.
- `CollectionsToMatch` holds `CollectionToMatch` dataclasses instead of `Bunch`es.
- `MatchingCollections.structure` returns `BaseTree`, not `None`: `for_collections` returns `None` when nothing is mapped, so a match always has a tree. It no longer stamps `when_values` on the shared `leaf` singleton.
- `type_description.py` and `registry.py` are fully annotated; the `hasattr(..., "collection_type")` duck typing behaves as before.
- Dead code removed: `Leaf.sliced_collection_type` (it returned the builtin `input`) and a no-op branch in `tool_output_to_structure`.
- `workflow/modules.py` narrows values it dereferenced unchecked, and drops an inner `if when_value is not False:` in `ToolModule.execute` that its enclosing `if step.when_expression and when_value is not False:` already guarantees. `tools/execute.py` calls `Tree.for_dataset_collection` on the class rather than through an instance.
- The map-over planner skips a step input with no name rather than using `None` as a connection key; `WorkflowStepInput.name` is nullable, and current code always sets it.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). The user-visible changes are a clearer error for an invocation that already failed, and correct identifiers where they were silently wrong.

<details><summary>Risk Details</summary>

- Outputs of a tool mapped over a `src: "dce"` input named by `default_identifier_source` now get different element identifiers, the ones the tool declares.
- The empty-list-first workflow failure is still an `unexpected_failure`, now with details and a step id.
- `UninitializedTree` raises `NotImplementedError` instead of `Exception`/`AttributeError`; no `except` site catches either.
- New asserts encode invariants (a match has a structure; slicing has a linked structure; a DCE being walked has a child collection). Traces found no path that breaks them; if one does, it fails as bare as before.
- Not fixed: a `default_identifier_source` collection that is itself mapped over a subcollection type (e.g. `list:paired` over `paired`) still fails the shape check and falls back silently, as on `dev`.

</details>

<details><summary>Risk Review Advice</summary>

The two fixes are small and separately committed: `efd89d36c85` (`is None` checks) and `81857737d90` (`get_collection`). The commit worth reading slowly is the typing commit `32d2a8f6343`, in particular `MatchingCollections.structure` and `walk_collections`/`compatible_shape` in `structure.py`, which were restructured rather than just annotated.

History: baseline tests that pass on `dev` (`bae44125b40`, including a framework test mapping a subworkflow over an empty list), a type-description prep commit (`c2052dbbc51`), dead-code removal (`64fcdcb7531`), the typing (`32d2a8f6343`), the two fixes, then typing `type_description.py` and `registry.py` (`7fc6c4d3317`).

</details>

## Context

Part of 🔀 #23676, used to type the matching and structure code its axes model rewrites; extracted so it can be reviewed on its own. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Modest expansion, taken: both latent bugs fixed and two neighbor modules typed.</summary>

The first pass covered only `matching` and `structure`. The evaluation reproduced both bugs with real model objects and recommended fixing them in the code the branch already rewrites, plus typing `type_description.py` and `registry.py`. Left out because #23676 redesigns them: passing `when_values` into the walk, removing the `is_leaf`/`children_known` flags, caching `structure`. No contraction: the small behavior changes are each pinned by a test or required by the types.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/collection_matching_typing/scope_evaluation/). Run via Claude Opus at high effort.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Baseline tests, a prep commit and dead-code removal lead; the typing follows as one commit.</summary>

Tests that pass on `dev` come first, then the `CollectionTypeLike` alias and return types, then dead-code removal, each standing alone on `dev` with unchanged mypy errors. Review fixups were folded into the typing commit; the tree was unchanged by the reorder.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/collection_matching_typing/baseline_refactor/). Run via Claude Opus at high effort.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Caught a regression in the first typing pass; tests added for it and for the new exception contract.</summary>

The first pass wrote `self.linked_structure or leaf`, which made mapping over an empty list produce no structure and an unenumerated one raise. It never reached `dev`; the explicit `None` check is back and two baseline tests pin `dev`'s behavior. `test_unenumerated_tree_rejects_element_queries` pins `NotImplementedError`. Nothing reads `when_values` off the leaf, and no `except` site caught the old exception types.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/collection_matching_typing/test_challenges_debrief/). Run via Claude Opus at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>Two passes; no findings, then one finding refuted.</summary>

The second pass read the removed inner `if when_value is not False:` in `ToolModule.execute` as making the when-expression evaluation unconditional. It's still inside `if step.when_expression and when_value is not False:` and nothing between the two reassigns `when_value`.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/collection_matching_typing/codex_review/). Run via gpt-6-sol at medium effort.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Six findings acted on; the rest are behavior changes or #23676's territory.</summary>

`BaseTree` became abstract with one "children not known" helper; `walk_collections` lost two loop closures and `dict_map`; `compatible_shape` is flat `isinstance` checks; `structure` became non-optional, so `tools/execute.py` needs no new `None` asserts; `CollectionTypeLike` replaced repeated unions. Two declined findings (the truthiness checks and the DCE source) were later fixed via the scope evaluation.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/collection_matching_typing/thermo_nuclear_review/). Run via Claude Opus at high effort.

</details>

### ✅ [John's Agentic Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All items pass; one accepted with a known gap in <code>map_over.py</code> coverage.</summary>

- [x] What does the user see when it fails? A workflow step that links an empty list first fails with "Cannot match collection types." and its step id, where `dev` gave a detail-less `unexpected_failure`.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Accepted with a known gap: of the four `map_over.py` `is None` checks, the two in `_declared_collection_input_types` and `_reserve_outer_structure` are covered only by `test_map_over.py`'s private-helper asserts (red without the fix), and the two in the plan loop have no test. The framework guard exercises an empty subworkflow map-over but not those lines, and no end-to-end test can fail first since zero jobs are scheduled either way.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `bae44125b40` adds only tests, which pass on `dev`; each fix's tests fail on its parent, except the non-empty-first case of the parametrized empty-list API test, kept beside its red twin.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/collection_matching_typing/pr_checklist/). Run via Claude Opus at high effort.

</details>

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- Unit:
  - `test/unit/data/dataset_collections/test_matching.py`: empty list matched first and second, structure of empty and unenumerated collections.
  - `test_structure.py`: `UninitializedTree` element queries raise `NotImplementedError`.
  - `test/unit/app/tools/test_execution.py`: `default_identifier_source` from an HDCA and from a DCE.
  - `test/unit/workflows/test_map_over.py`: planner helpers with an empty subworkflow structure.
- API:
  - `test_workflows.py::TestWorkflowsApi::test_empty_list_linked_with_nonempty_list_fails_to_match` (both orders): invocation fails with details "Cannot match collection types." and the step id. Without the fix the empty-first case has no details (`KeyError` in the log).
  - `test_tools.py::TestToolsApi::test_default_identifier_source_map_over_dce`: `outputB` takes the DCE's `[x, y]`. Without the fix it gets `inputA`'s `[p, q]`.
- Framework: `lib/galaxy_test/workflow/subworkflow_map_over_empty_list.gxwf.yml` maps a subworkflow over an empty list and checks the output is an empty `list`.
- Typing: `make mypy` reports the same errors as `dev`.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
