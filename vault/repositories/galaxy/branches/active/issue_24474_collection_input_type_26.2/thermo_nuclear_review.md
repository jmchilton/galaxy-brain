Run via Opus 5.5 at low effort.

# Thermo-nuclear code quality review (round 2, after re-scope)

Reviewed the whole branch (`origin/release_26.2..46648602450`) with the strict maintainability prompt (`vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md`). The review focused on what changed since round 1 (`b6791d07a7c..HEAD`). Round 1's debrief is [earlier_drafts/1/thermo_nuclear_review.md](earlier_drafts/1/thermo_nuclear_review.md).

**Acted on:** the scheduling-time rejection in `MapOverPlanner._find_collections_to_match` was a six-conjunct `elif` with inline comments, inside the planner's already busy per-input loop. I moved the policy into a named, typed predicate, `_rejects_incompatible_collection(progress, step, data)`. The loop branch now reads `elif is_data_collection_param and self._rejects_incompatible_collection(...)`, and the docstring explains why each case is exempt. Behavior is unchanged. Commit: `97445bc95ec`.

**Did not act on:**
- `step.type == "tool"` in the shared planner. Moving it into `ToolModule` would mean passing a policy flag into `plan_map_over`, which adds another flag without deleting any complexity. Now that the check sits in one named predicate, it is contained.
- The `try/except IncompatibleCollectionInput` translation in `WorkflowModule.plan_map_over`. It is the right layering: `map_over.py` cannot raise `FailWorkflowEvaluation` without a circular import from `modules.py`. It is also the single entry point used by tool, subworkflow and pick-value steps.
- The `"'a', 'b'"` accepted-types formatting appears twice, once in `IncompatibleCollectionInput` and once in `DataCollectionToolParameter._check_collection_type`. The two messages live in different layers and are worded for different audiences, so sharing one helper would mean a new cross-layer import for a single `join`.
- The `check_param` `allow_map_over` flag plus `isinstance` dispatch. Round 1 already justified keeping it, and nothing has changed since.
- The `basic.py` (3.5k lines) and `modules.py` (3.7k lines) file sizes. Both were already far over 1k. Since round 1 the branch adds 2 net lines to `modules.py` and about 10 to `basic.py`, and `map_over.py` is about 230 lines.
- `LIST_COLLECTION_TEST_DATA` sits between the "Workflow API TODO" comment and `class TestWorkflowsApi`. That comment is a module-level TODO, not a class docstring, so this is cosmetic.

## Details

### 1. Spaghetti growth in the map-over loop (acted on)

`_find_collections_to_match` is the planner's core loop. It already has a nested `if/else` for dataset versus collection params and three outcomes: direct match, mapped, or subworkflow passthrough. The re-scope added a fourth outcome, gated by five conditions that cover three unrelated concerns:

- which step types have exact collection semantics (`step.type == "tool"`, since workflow inputs take deeper collections);
- which values the planner can type-check (`not progress.subworkflow_structure`, and HDCA only);
- whether the step may be skipped (`step.when_expression`, `False in progress.when_values`).

Inline comments explained them, but a reader of the loop had to work through all five to see the actual shape: "otherwise raise". The predicate gives the policy a name and a single docstring, and keeps the loop's shape readable. I looked for a code-judo move that would delete the conditions instead of moving them, and found none on a stable branch:

- Dropping the subworkflow-step exemption is wrong. It is what `test_mapping_and_subcollection_mapping` and related tests rely on.
- Dropping the skip guards reintroduces the re-scope review's HIGH finding: a skipped step would fail the invocation.
- Moving the check to `ToolModule` would need either a flag on `plan_map_over` or a second pass over the inputs. Both duplicate the planner's matching work.

The real simplification is to model workflow-input "prefix" semantics in `HistoryQuery`. That would remove the `step.type` exemption, but it belongs on `dev` (see the re-scope debrief).

### 2. Exception translation layer (not acted on)

`IncompatibleCollectionInput` is a plain domain exception in `map_over.py`. `WorkflowModule.plan_map_over` turns it into `FailWorkflowEvaluation(InvocationFailureWorkflowParameterInvalid)`. That is a clean boundary: the planner stays free of invocation-failure schema, and the translation happens at the one call path every module uses. This is acceptable.

### 3. `_check_collection_type` sample sheet columns (not acted on)

Since round 1, the `collection` local is set for HDCA/DCE values, so the column check can run on the real `DatasetCollection`. Adapters fall through to `value.collection_type` and skip the column check, which is correct because adapters have no columns. The nested `if` in the direct-match branch is small and mirrors `_classify_hdca`. No issues.

### 4. Tests (not acted on)

The new API tests cover the raise for a top-level tool step and for a tool step in an unconditional subworkflow, both skip exemptions (`when` on the step and on the subworkflow), and the run-form sample sheet column rejection. They share `LIST_COLLECTION_TEST_DATA` and `_assert_invocation_failed_on_list_collection`, with no copy-paste sprawl. `_rejects_incompatible_collection` has no unit test, but the four API tests exercise every branch of it end to end.

### Verification

- Lint: ruff, black and isort are clean on `map_over.py`. mypy reports nothing new: the new predicate is fully typed, and the 4 remaining errors in the file are existing untyped helpers.
- Unit: `test/unit/app/tools/test_data_collection_parameters.py` and `test/unit/workflows`: 313 passed, 1 skipped.
- API: `test_workflows.py -k "incompatible or step_parameter or sample_sheet"`: 18 passed.
