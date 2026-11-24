Run via Claude Opus at high effort.

## General

- [x] What does the user see when it fails? Empty-list-first workflow steps now fail with "Cannot match collection types." on the step instead of a detail-less `unexpected_failure`.
  <details>

  - **Empty list linked first** (`MatchingCollections.__attempt_add_to_linked_match`, now `is None`). `for_collections` raises `MessageException(CANNOT_MATCH_ERROR_MESSAGE)`, and `run.py` turns that into `FailWorkflowEvaluation(reason=unexpected_failure, details=..., workflow_step_id=step.id)`. On `dev` the empty structure was silently replaced, `slice_collections` raised a `KeyError` from `DatasetCollection.__getitem__`, and `__invoke` recorded `InvocationUnexpectedFailure(reason=unexpected_failure)` with no details. The reason code is the same in both cases. Only the details and the step id are new.
  - **Tool form and API.** These are mostly unchanged. `build_combos`/`assert_matched_lengths` still return their 400 ("Received 2 inputs for ... and 0 inputs for ...") before matching, according to the scope evaluation's trace.
  - **DCE `default_identifier_source`** (`ExecutionTracker._structure_for_output`, now via `get_collection`). There's no error before or after. On `dev` the outputs took `inputA`'s `[p, q]`; now they get the source's `[x, y]` (`test_default_identifier_source_from_dce`).
  - **Unenumerated trees.** `UninitializedTree.__len__`, `walk_collections`, `compatible_shape` and `Tree.compatible_shape(UninitializedTree)` raise `NotImplementedError("Cannot ... of a collection whose children are not known")`. On `dev` they raised `Exception("Unknown length")` or `AttributeError`. That's a programming error with no user path found, and no `except` site catches the old types.
  - **New asserts.** `MatchingCollections.structure` (not a `Leaf`), `slice_collections` (has `linked_structure`) and `_child_collection` (has `child_collection`) would surface as unexpected failures if an invariant broke. The traces found no path that breaks one.

  </details>
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [ ] Are unit tests not just testing the literal implementation? No: `test_map_over.py` drives private `MapOverPlanner` helpers with a `Bunch` progress to pin `is None` on a path with no observable difference.
  <details>

  - **Behavioral.**
    - `test_matching.py::test_empty_list_does_not_match_non_empty_list` goes through the public `for_collections`, via `assert_cannot_match`, in both orders.
    - `test_execution.py::test_default_identifier_source_from_dce`/`_from_hdca` assert `outputB`'s element identifiers. They use real transient model objects and a real `MatchingCollections`.
      - They enter through the private `ToolExecutionTracker._structure_for_output`, with `cast(Tool, None)` and a `Bunch` trans.
      - The API test the scope evaluation recommended wasn't added. That was a copy of `test_tools.py::test_default_identifier_source_map_over` with a `src: "dce"` input.
  - **Implementation-literal.**
    - `test_map_over.py::test_empty_subworkflow_map_over_reserves_outer_structure` and `::test_empty_subworkflow_map_over_declares_outer_collection_type` call `MapOverPlanner._reserve_outer_structure` and `_declared_collection_input_types`. Their progress is `cast(WorkflowProgress, Bunch(subworkflow_structure=...))`.
    - The debrief concedes that an empty subworkflow map-over schedules zero jobs either way. So these tests pin `is None` over truthiness, not behavior.
    - The `Bunch` also won't notice if `WorkflowProgress` changes.
    - The framework test the scope evaluation suggested wasn't added: an empty-list subworkflow map-over in `lib/galaxy_test/workflow/`, modeled on `test_empty_list_mapping`.
  - **Structural, acceptable as baselines.**
    - `test_matching.py::test_structure_of_empty_list_is_empty_tree` and `::test_structure_of_unenumerated_collection` assert the class (`Tree`, `UninitializedTree`) and fields of the public `MatchingCollections.structure`.
    - The scope evaluation found nothing that produces the unenumerated case.
  - **Exception-type pinning.** `test_structure.py::test_unenumerated_tree_rejects_element_queries` pins `NotImplementedError` and its message for calls that are programming errors.
  - **Not behavior checks.** The `assert isinstance(tree, Tree)` lines added to the existing `test_structure.py` tests are mypy narrowings.

  </details>
- [ ] Are baseline tests in their own leading commits (if applicable)? No: `test_default_identifier_source_from_hdca` passes on `dev` but lands in fix commit `0333e0800eb`, not a leading commit.
  <details>

  - **Leads correctly.** `4657945a682` leads with the dev-pinning `structure` tests.
  - **Weaker case.** The non-empty-first half of `test_empty_list_does_not_match_non_empty_list` also passes on `dev`. It shares a two-line function with its red half in `0c80649c55d`.

  - **On `7dd58b00674`** (HEAD's `test_execution.py` and `test_matching.py` run against `git archive 7dd58b00674 lib` in a scratch directory).
    - Pass: `test_default_identifier_source_from_hdca`, `test_structure_of_empty_list_is_empty_tree`, `test_structure_of_unenumerated_collection`, and `assert_cannot_match(list_instance(), list_instance(ids=[]))` on its own.
    - Fail, red-to-green with their fixes: `test_default_identifier_source_from_dce` (`['p', 'q'] != ['x', 'y']`) and the empty-first `assert_cannot_match`.
  - **Fix.** Move the HDCA control and the non-empty-first assertion into `4657945a682` or a new leading commit. Leave the DCE and empty-first assertions with their fixes.
  - **Correctly placed.**
    - `test_unenumerated_tree_rejects_element_queries` fails on `dev` (`Exception: Unknown length`), so it belongs with `ec8bf9af8a0`.
    - Both `test_map_over.py` tests fail on `dev` (`[] != ['list']`, `['paired'] != ['list:list']`), so they belong with `0c80649c55d`.

  </details>
- [x] Are the comments free of excess archeology? Yes.
  <details>

  - The new comments state current contracts: `WhenValues`, `CollectionSlice`, `Structure`, `CollectionTypeLike`, `# A dataset never matches a nested collection.` and the `BaseTree` docstring. The history is in the commit messages.
  - The `CollectionsToMatch` docstring drops the stale "(possibly workflows in the future as well)".
  - **Nit, pre-existing.** `CollectionTypeDescriptionFactory.__init__` still says "taking in type_registry though not using it". `rank_type_plugin` uses it, and the branch typed the parameter directly under that comment.
  - **Nit.** `e401dcd9ae0` left the paired TODO in `tool_output_to_structure` above `return tree`, without the `children_known`/`paired` condition it was attached to.

  </details>
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## Workflow-related

Includes everything in General above, plus:

- [x] Which existing workflows change behavior (if any)? Steps linking an empty list (first by input name) with a non-empty collection now fail with "Cannot match collection types."; `default_identifier_source` tools fed a DCE now take the source's identifiers.
  <details>

  - **Empty list first.** For example, `paste1`'s `input1` fed by `__FILTER_EMPTY_DATASETS__` or `__FILTER_FAILED_DATASETS__` after every element was filtered out (scope evaluation trace). With the input names the other way round, `dev` already failed cleanly.
  - **DCE identifier source.** The change is visible only when `default_identifier_source` names a linked input that isn't first in sorted order. When it is first, the old fallback already gave the same identifiers. A DCE reaches `_find_collections_to_match` when a mapped subworkflow passes elements to an inner tool. The only in-repo user is `identifier_source.xml`, so the reach is mostly third-party tools. The workflow path isn't probed end to end.
  - **Empty subworkflow map-over.** The `map_over.py` `is None` checks route it through `_consume_outer_structure`. It schedules zero jobs either way.
  - **Nameless `WorkflowStepInput`.** Only legacy rows with a null `name` have one. For conditional steps, `_add_when_expression_collections` now skips it. On `dev` the `None` key reached `CollectionsToMatch` and `sorted()` raised a `TypeError`.
  - **Removed inner `when_value is not False` in `ToolModule.execute`.** No change: the enclosing `if step.when_expression and when_value is not False` already guarantees it. Codex raised it as a finding, which was refuted.

  </details>
- [x] Who hits this in practice and what is the evidence? Mostly Galaxy developers: four `model.dataset_collections` modules leave the `mypy.ini` red list. The evidence for the two fixes is local probes, code traces and red-to-green unit tests. No issue or user report is linked.
  <details>

  - **Empty-first.** A probe with transient model objects reproduced the `KeyError` from `slice_collections`. The run-time path through `run.py` was traced, not run.
  - **DCE.** A probe and `test_default_identifier_source_from_dce`. The tool API accepts `{"batch": true, "values": [{"src": "dce", ...}]}` through `_load_batch_collection`. The tool form sending one as a map-over is unconfirmed.

  </details>
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes: `scope_evaluation.md` weighed splits and contractions; both fixes reuse existing helpers (`get_collection`, `is None`).
  <details>

  - **Weighed in `scope_evaluation.md`.**
    - One PR against split PRs.
    - Keeping `structure` as `BaseTree | None`, which brings back three call-site asserts.
    - Passing `when_values` into the walk, dropping `is_leaf`/`children_known` and caching `structure`. `subworkflow_mapping` redesigns all three.
  - **Reuse.** The DCE fix uses the existing `get_collection` rather than adding a resolver.
  - **Tried and dropped.** `isinstance` in `CollectionTypeDescription.compatible()` gave way to a `cast`, because `isinstance` would raise for a duck-typed `DatasetCollection` argument.

  - **Deferred.** Building `_structure_for_output`'s source structure with `get_structure(..., leaf_subcollection_type=...)`. A source that is itself mapped over a subcollection type (e.g. `list:paired` over `paired`) still falls back to the first linked input's identifiers.

  </details>
