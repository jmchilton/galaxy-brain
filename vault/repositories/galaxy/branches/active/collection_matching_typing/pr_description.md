Refactor ahead of 🔀 #23676 - bringing subworkflow mapping in line between the workflow editor and the backend.

| Case | `dev` | This PR |
| --- | --- | --- |
| Workflow tool step mapping two linked inputs, the first (by input name) an empty list and the other not | ❌ invocation fails with a bare `unexpected_failure`: no details, no step (a `KeyError` inside slicing) | ✅ fails with "Cannot match collection types." and the step id, as it already does with the inputs the other way round |
| Tool mapped over a `src: "dce"` input named by an output's `default_identifier_source` | ❌ output silently takes the *other* input's element identifiers | ✅ output takes the named input's identifiers |
| `mypy.ini` red list | `dataset_collections.{matching,structure,type_description,registry}` unchecked | ✅ all four fully typed and checked |

The collection matching and structure modules decide how every mapped-over tool and workflow step is sliced into jobs, and #23676 rewrites them. They were untyped and on the mypy red list, so a `Tree`, an unenumerated `UninitializedTree`, `None` and the shared `leaf` singleton were all interchangeable as far as the checker knew. ***Typing them showed two places that test a tree's truthiness or read the wrong collection, and both are user-visible bugs, so this isn't a behavior-neutral typing PR:*** each fix is its own commit with a unit test that fails without it.

- **Empty list linked first.** `MatchingCollections.__attempt_add_to_linked_match` used `if not self.linked_structure:`. An empty list's `Tree` is falsy, so a later linked input silently replaced it and slicing then hit a `KeyError`. It now checks `is None`, as do the four `progress.subworkflow_structure` checks in `workflow/map_over.py`. Those four have no visible effect on their own, because an empty subworkflow map-over schedules zero jobs either way.
- **DCE identifier source.** `ExecutionTracker._structure_for_output` read `source_collection.collection`, which for a `DatasetCollectionElement` is its *parent* collection, so the shape check failed and the output fell back to the first linked input's identifiers. It now goes through `get_collection`, as `sliced_input_collection_structure` above it already does.

***It changes how mapping is typed, not how it's computed: the axes model and the rest of #23676 stay there,*** and #23676 rebases onto this.

<details><summary>What the typing changes</summary>

- `BaseTree` is an abstract base for `Tree` and `UninitializedTree`. Operations that need enumerated children (`__len__`, `walk_collections`, `compatible_shape`) raise `NotImplementedError("... children are not known")` on an `UninitializedTree`, where they raised a bare `Exception` or `AttributeError`. No caller reaches them; it's a programming error either way.
- `Structure = Leaf | BaseTree`, plus `WhenValues`, `CollectionSlice` and `CollectionTypeLike` (`str | CollectionTypeDescription`, the two forms tool inputs and workflow planning pass for a subcollection type) as named aliases.
- `CollectionsToMatch` holds `CollectionToMatch` dataclasses instead of `Bunch`es.
- `MatchingCollections.structure` returns `BaseTree`, not `None`: `for_collections` returns `None` when nothing is mapped, so a match always has a tree. It no longer stamps `when_values` on the shared `leaf` singleton.
- `type_description.py` and `registry.py` are fully annotated; the `hasattr(..., "collection_type")` duck typing behaves as before.
- Dead code removed: `Leaf.sliced_collection_type` (it returned the builtin `input`), `dict_map`, and a no-op branch in `tool_output_to_structure`.
- Call sites in `tools/execute.py` and `workflow/modules.py` narrow values they dereferenced unchecked. The map-over planner skips a step input with no name rather than using `None` as a connection key (only legacy rows with a null name reach it).

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). The user-visible changes are a clearer error for an invocation that already failed, and correct identifiers where they were silently wrong.

<details><summary>Risk Details</summary>

- Outputs of a tool mapped over a `src: "dce"` input named by `default_identifier_source` now get different element identifiers, the ones the tool declares.
- The empty-list-first workflow failure is still an `unexpected_failure`, now with details and a step id.
- `UninitializedTree` raises `NotImplementedError` instead of `Exception`/`AttributeError`; no `except` site catches either.
- New asserts encode invariants (a match has a structure; slicing has a linked structure). Traces found no path that breaks them; if one does, it fails as bare as before.
- Not fixed: a `default_identifier_source` collection that is itself mapped over a subcollection type (e.g. `list:paired` over `paired`) still fails the shape check and falls back silently, as on `dev`.

</details>

<details><summary>Risk Review Advice</summary>

The two fixes are small and separately committed: `8559ed3d0be` (`is None` checks) and `95f0c816868` (`get_collection`). The commit worth reading slowly is the typing commit `32d2a8f6343`, in particular `MatchingCollections.structure` and `walk_collections`/`compatible_shape` in `structure.py`, which were restructured rather than just annotated.

History: baseline tests that pass on `dev` (`bae44125b40`, including a framework test mapping a subworkflow over an empty list), a type-description prep commit (`c2052dbbc51`), dead-code removal (`64fcdcb7531`), the typing (`32d2a8f6343`), the two fixes, then typing `type_description.py` and `registry.py` (`5096d8476ec`).

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

`BaseTree` became abstract with one "children not known" helper; `walk_collections` lost two loop closures and `dict_map`; `compatible_shape` is flat `isinstance` checks; `structure` became non-optional, which removed three asserts in `tools/execute.py`; `CollectionTypeLike` replaced repeated unions. Two declined findings (the truthiness checks and the DCE source) were later fixed via the scope evaluation.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/collection_matching_typing/thermo_nuclear_review/). Run via Claude Opus at high effort.

</details>

### ✅ [John's Agentic Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All items pass; one accepted with a known gap in <code>map_over.py</code> coverage.</summary>

- [x] What does the user see when it fails? A workflow step that links an empty list first fails with "Cannot match collection types." and its step id, where `dev` gave a detail-less `unexpected_failure`.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Accepted with a known gap: the four `map_over.py` `is None` checks are covered only by `test_map_over.py`'s private-helper asserts. The framework guard exercises an empty subworkflow map-over but not those lines, and no test can fail first since zero jobs are scheduled either way.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `bae44125b40` adds only tests, which pass on `dev`; each fix's tests fail on its parent.
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
- Framework: `lib/galaxy_test/workflow/subworkflow_map_over_empty_list.gxwf.yml` maps a subworkflow over an empty list and checks the output is an empty `list`.
- Typing: `make mypy` reports the same errors as `dev`.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
