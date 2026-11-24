Run via Claude Opus at high effort.

## General

- [x] What does the user see when it fails? A workflow step that links an empty list first now fails with "Cannot match collection types." and its step id, where `dev` gave a detail-less `unexpected_failure`.
  <details>

  - **Empty list linked first** (`8559ed3d0be`, `MatchingCollections.__attempt_add_to_linked_match` now tests `self.linked_structure is None`).
    - Now: the non-empty input fails `compatible_shape`, `for_collections` raises `MessageException(CANNOT_MATCH_ERROR_MESSAGE)`, and the step handler in `workflow/run.py` turns it into `FailWorkflowEvaluation(InvocationUnexpectedFailure(reason=unexpected_failure, details=str(e), workflow_step_id=step.id))`.
    - Before: the empty structure was replaced by the next input's, `slice_collections` hit a `KeyError` in `DatasetCollection.__getitem__`, and `__invoke` recorded a bare `unexpected_failure` with no details. The reason code is unchanged; the details and step id are new.
    - Tool form and API: the `build_combos`/`assert_matched_lengths` 400 ("Received N inputs for ... and 0 inputs for ...") still fires before matching (traced in `scope_evaluation.md`, not run).
  - **DCE `default_identifier_source`** (`95f0c816868`, `ExecutionTracker._structure_for_output` goes through `get_collection`). Outputs now take the source's identifiers rather than silently wrong ones. No error before or after. `test_default_identifier_source_from_dce` showed `['p', 'q']` on the parent and `['x', 'y']` after. A source whose shape doesn't match the mapping still falls back silently to the first linked input's identifiers, as on `dev`.
  - **Unenumerated trees** (`32d2a8f6343`). `UninitializedTree.__len__`, `walk_collections`, `compatible_shape` and `Tree.compatible_shape(UninitializedTree)` raise `NotImplementedError("Cannot ... of a collection whose children are not known")`. Before, they raised `Exception("Unknown length")` or `AttributeError`. These are programming errors and no producer path was found. Either type would show up as a bare `unexpected_failure` or a 500.
  - **New asserts** (`MatchingCollections.structure` not a `Leaf`, `slice_collections` has a `linked_structure`, `_child_collection` has a `child_collection`). If an invariant broke, it would show up the same bare way. Traces found no breaking path.

  </details>
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Accepted by John (2026-11-24) with this known gap: `8559ed3d0be`'s `map_over.py` checks are covered only by `test_map_over.py`'s private-helper asserts, and the framework guard's inner `cat` never reaches them.
  <details>

  What each kind of test covers:

  - **Behavioral, through public or near-public entry points with real model objects.**
    - `test_matching.py::test_empty_list_first_does_not_match_non_empty_list` (red on `32d2a8f6343`: `assert False`) and `::test_empty_list_second_does_not_match_non_empty_list` (green on `dev`) go through `MatchingCollections.for_collections` via `assert_cannot_match`.
    - `test_execution.py::test_default_identifier_source_from_dce` (red on `8559ed3d0be`: `['p', 'q'] == ['x', 'y']`) and `::test_default_identifier_source_from_hdca` (green on `dev`) assert `outputB`'s element identifiers.
      - They use real transient HDCAs/DCEs and a real `MatchingCollections`.
      - They enter through the private `ToolExecutionTracker._structure_for_output`, with a `Bunch` trans and `cast(Tool, None)`.
      - No API test for the `src: "dce"` batch path was added.
  - **Structural baselines.** `test_matching.py::test_structure_of_empty_list_is_empty_tree` and `::test_structure_of_unenumerated_collection` assert the class (`Tree`, `UninitializedTree`) and fields of `MatchingCollections.structure`. They pin `dev` behavior that the typing commit has to keep.
  - **Exception contract.** `test_structure.py::test_unenumerated_tree_rejects_element_queries` pins `NotImplementedError` and its message (red on `64fcdcb7531`: `Exception: Unknown length`).
  - **Implementation-literal.** `test/unit/workflows/test_map_over.py`'s two tests are red on `32d2a8f6343` and green after (`[] == ['list']`, `['paired'] == ['list:list']`).
    - They call `MapOverPlanner._reserve_outer_structure` and `_declared_collection_input_types` with `cast(WorkflowProgress, Bunch(subworkflow_structure=<empty list:list Tree>))`.
    - They pin `is None` over truthiness on a path where an empty map-over schedules zero jobs either way.
    - The `Bunch` won't notice if `WorkflowProgress` changes.
  - **Scenario guard.** `lib/galaxy_test/workflow/subworkflow_map_over_empty_list.gxwf.yml` (`bae44125b40`) checks that a subworkflow mapped over `empty_list` output gives an empty `list` and that `count_list` reports `0`.
    - Its inner step is `cat` (`for_workflows/cat.xml`). `input1` there is a plain non-multiple `data` param, so `_find_collections_to_match` takes the early `collections_to_match.add(name, data); continue`.
    - That never reaches `_declared_collection_input_types`, `_reserve_outer_structure` or either `progress.subworkflow_structure is None` / `is not None` check.
    - With one linked collection it also can't tell the `matching.py` `is None` from the old truthiness check. So it guards the scenario, not the change.
  - **Uncovered.** The nameless-step-input skip in `MapOverPlanner._add_when_expression_collections` (`32d2a8f6343`) has no test, which the test-challenges debrief accepted (legacy null-name rows only).
  - **Not behavior checks.** The `assert isinstance(tree, Tree)` lines added to `test_structure.py` are mypy narrowings. The `CollectionTypeDescriptionFactory()` swaps in `5096d8476ec` are setup that the typed signature requires.
  - **Fix, with limits.** Each kind of inner input reaches only some of the four changed checks:
    - a `dataset_collection` input with a declared type reaches the direct-match skip and `_reserve_outer_structure`;
    - the changed line in `_declared_collection_input_types` runs only for a `dataset_collection` input that declares no type;
    - the `elif is_data_param` branch needs `multiple="true"` data.

    An empty map-over schedules zero jobs either way, so no such test would be red before the fix. Inner steps like these would only guard the changed path against crashing. The coverage of this change stays implementation-literal whatever is added.

  </details>
- [x] Are baseline tests in their own leading commits (if applicable)? Yes: `bae44125b40` adds only tests, its 4 unit tests pass on base Python, and each fix commit's new tests fail on that commit's parent.
  <details>

  - **Leading commit.** `git diff 7dd58b00674 bae44125b40 -- lib` touches only the two `lib/galaxy_test/workflow/subworkflow_map_over_empty_list.gxwf*.yml` files, so the Python under `lib/` is `dev`'s.
    - At `bae44125b40` these pass, run from a `git worktree` in scratch with its own `pytest.ini`, and `galaxy` imports confirmed from that copy's `lib`: `test_empty_list_second_does_not_match_non_empty_list`, `test_structure_of_empty_list_is_empty_tree`, `test_structure_of_unenumerated_collection` and `test_default_identifier_source_from_hdca`.
    - The framework guard wasn't run here, since this task excludes framework tests. Fork CI on `5096d8476ec` is still queued or in progress.
  - **Red on parent**, with each commit's test files overlaid on its parent:
    - `32d2a8f6343` on `64fcdcb7531`: `test_unenumerated_tree_rejects_element_queries` fails (1 failed, 9 passed).
    - `8559ed3d0be` on `32d2a8f6343`: `test_empty_list_first_does_not_match_non_empty_list` and both `test_map_over.py` tests fail (3 failed, 18 passed).
    - `95f0c816868` on `8559ed3d0be`: `test_default_identifier_source_from_dce` fails (1 failed, 10 passed).
  - **Not baselines.** `5096d8476ec`'s test edits (`CollectionTypeDescriptionFactory(None)` to `()`) pass on `95f0c816868` (21 passed) and add no assertions. `c2052dbbc51` and `64fcdcb7531` touch no tests.
  - **Every commit green.** The run covered `test/unit/data/dataset_collections/`, `test/unit/workflows/`, `test/unit/app/tools/test_execution.py` and `test_meta_expansion.py`.

    | commit | passed (1 skipped each) |
    | --- | --- |
    | `7dd58b00674` (base) | 446 |
    | `bae44125b40`, `c2052dbbc51`, `64fcdcb7531` | 450 |
    | `32d2a8f6343` | 451 |
    | `8559ed3d0be` | 454 |
    | `95f0c816868`, `5096d8476ec` | 455 |

  </details>
- [x] Are the comments free of excess archeology? Yes.
  <details>

  - New comments state current contracts: `WhenValues`, `CollectionSlice`, `Structure`, `CollectionTypeLike`, the `BaseTree`/`CollectionToMatch`/`slice_collections` docstrings and `# A dataset never matches a nested collection.`. History stays in the commit messages.
  - `64fcdcb7531`'s reworded TODO (`# TODO: build a paired Tree for paired outputs instead of an UninitializedTree.`) stands alone above `return tree` in `tool_output_to_structure` and matches the code.
  - `CollectionsToMatch`'s docstring drops the stale "(possibly workflows in the future as well)".
  - Nit, pre-existing: "taking in type_registry though not using it" sits right above the parameter that `5096d8476ec` typed in `CollectionTypeDescriptionFactory.__init__`, but `rank_type_plugin` uses it.
  - Nit (fixed in `bae44125b40`): the `_identifiers_for_output_b` docstring named `identifier_source.xml`, which the test never loads.

  </details>
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## Workflow-related

- [x] Which existing workflows change behavior (if any)? Two kinds of step change: one that links an empty list (first by input name) with a non-empty collection now fails cleanly, and a `default_identifier_source` tool fed a DCE source now takes that source's identifiers.
  <details>

  - **Empty list first.** A realistic trigger, traced in `scope_evaluation.md`: a two-input tool such as `paste1` whose `input1` comes from `__FILTER_EMPTY_DATASETS__` or `__FILTER_FAILED_DATASETS__`, with every element filtered out. With the input names reversed, `dev` already failed cleanly.
  - **DCE identifier source.** Only visible when `default_identifier_source` names a linked input other than the first in sorted order. Otherwise the old fallback gave the same identifiers. `_find_collections_to_match` accepts a `DatasetCollectionElement` replacement, but the workflow path wasn't probed end to end. The only in-repo user is `test/functional/tools/identifier_source.xml`.
  - **Empty subworkflow map-over.** The `map_over.py` `is None` checks send it through `_consume_outer_structure` and can add a data input to the match. It schedules zero jobs either way (scope evaluation), and the framework guard pins the empty-list result.
  - **Nameless `WorkflowStepInput`.** Only legacy rows with a null `name` have one. `_add_when_expression_collections` now skips it. On `dev` the `None` key reached `CollectionsToMatch` and `sorted()` raised a `TypeError`.
  - **Removed inner `when_value is not False`** in `ToolModule.execute`: no change. The enclosing `if step.when_expression and when_value is not False` already guarantees it (Codex finding refuted in `codex_review.md`).

  </details>
- [x] Who hits this in practice and what is the evidence? Mostly Galaxy developers: four `model.dataset_collections` modules leave the `mypy.ini` red list.
  <details>

  - **Fixes.** They rest on local probes, code traces and red-to-green unit tests. No issue or user report is linked.
  - **Typing.** `mypy.ini` drops `matching` and `structure` (`32d2a8f6343`), then `registry` and `type_description` (`5096d8476ec`). `implementation_rescope_debrief.md` reports full `make mypy` with an identical error set to base (35 errors in 20 files). That run was on the pre-rebuild `f45e16e607d`, and it wasn't re-run here.
  - **Empty first.** A transient-model probe reproduced the `KeyError` from `slice_collections`. The `run.py` path was traced, not run.
  - **DCE.** Probe plus `test_default_identifier_source_from_dce`. The tool API accepts `{"batch": true, "values": [{"src": "dce", ...}]}` via `_load_batch_collection`. Whether the tool form sends one as a map-over is unconfirmed.

  </details>
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes: `scope_evaluation.md` weighed split PRs and contractions, and both fixes reuse existing helpers (`get_collection`, `is None`).
  <details>

  - **Weighed in `scope_evaluation.md`.**
    - One PR against several split decompositions.
    - Keeping `MatchingCollections.structure` as `BaseTree | None`, which brings back three `execute.py` asserts.
    - Passing `when_values` into the walk, dropping `is_leaf`/`children_known` and caching `structure`. All three were left out because `subworkflow_mapping` redesigns them.
  - **Reuse.** `95f0c816868` uses `get_collection`, as `sliced_input_collection_structure` already does, rather than a new resolver.
  - **Tried and dropped** (`implementation_rescope_debrief.md`). `isinstance` in `CollectionTypeDescription.compatible()` gave way to a `cast`, because `isinstance` would break duck-typed callers that pass an object with `collection_type`.
  - **Deferred.** `_structure_for_output` still builds the source with `Tree.for_dataset_collection`, not `get_structure(..., leaf_subcollection_type=...)`. A source mapped over a subcollection type (e.g. `list:paired` over `paired`) still falls back to the first linked input's identifiers.

  </details>
