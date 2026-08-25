# Workflow Semantics: Fact Review & Open Questions

## 1. Fact Corrections

Only one issue found after spot-checking facts against the codebase:

**IMPRECISE — Step skipping / hidden outputs (modules.py:2599-2604)**
- **Stated:** "When a step is completely skipped (when_values == [False], no collection mapping), its outputs are marked invisible."
- **Issue:** "no collection mapping" is misleading. The actual code checks `not progress.subworkflow_collection_info`, and this block is *inside* a `if collection_info:` branch — so collection mapping IS happening. The condition prevents hiding outputs when in a subworkflow collection context.
- **Correction:** "When a step is completely skipped (when_values == [False]) and not executing in a subworkflow collection context, its outputs are marked invisible."

All other facts verified correct (line numbers, behavioral claims, test references).

---

## 2. Additional Facts Not In Original Set

These are new facts discovered that are directly relevant to workflow evaluation semantics.

- test: lib/galaxy/workflow/steps.py (lines 15-31)
  fact: Workflow steps are topologically ordered at import time. Self-connections and circular dependencies are detected (has_cycles flag) and prevent execution.
  context: Foundation for all scheduling — establishes that step ordering is a DAG guarantee.

- test: lib/galaxy/workflow/run.py (lines 102-119)
  fact: Three failure pathways exist at the invoker level — CancelWorkflowEvaluation triggers cancel(), FailWorkflowEvaluation marks as failed, unexpected exceptions cause failure with "unexpected_failure" reason. Each attaches a message to the invocation.
  context: Core failure taxonomy — essential for documenting how workflows terminate abnormally.

- test: lib/galaxy/schema/invocation.py (lines 333-350)
  fact: WorkflowInvocation states are NEW -> READY -> SCHEDULED -> COMPLETED/FAILED/CANCELLED. InvocationStep states are NEW -> READY -> SCHEDULED (steps don't expose terminal states).
  context: State machine definition — prerequisite for understanding scheduling and failure semantics.

- test: lib/galaxy/workflow/run.py (lines 502-591)
  fact: When a step output is referenced but not yet produced, the step is marked STEP_OUTPUT_DELAYED and DelayedWorkflowEvaluation is raised. Downstream steps are also delayed (cascade).
  context: Documents dependency delay propagation — different from failure propagation.

- test: lib/galaxy/workflow/run.py (lines 535-553)
  fact: Dataset collections that fail to populate (not waiting and not populated) cause FailWorkflowEvaluation with InvocationFailureCollectionFailed reason. This is a hard failure, not a delay.
  context: Distinguishes collection population failure from delay.

- test: lib/galaxy/workflow/run.py (lines 560-589)
  fact: Non-data parameter inputs that use a dataset/collection from a step have stricter requirements — dataset must be ready and ok. Pending = delay, failed/purged = FailWorkflowEvaluation with InvocationFailureDatasetFailed.
  context: Documents that expression inputs have stricter readiness requirements than data flow inputs.

- test: test_workflows.py::test_workflow_pause (lines 5525-5546)
  fact: Pause steps block workflow scheduling. Approving (action=true) continues. Rejecting (action=false) cancels with cancelled_on_review reason.
  context: Pause is a user-in-the-loop mechanism with binary outcome.

- test: test_workflows.py::test_cancel_workflow_invocation (lines 5607-5634)
  fact: Deleting a workflow invocation while running transitions to cancelled with user_request reason and deletes all associated jobs.
  context: User cancellation semantics and cleanup behavior.

- test: test_workflows.py::test_cancel_new_workflow_when_history_deleted
  fact: Deleting the target history cancels all non-terminal invocations with history_deleted reason. Works for both NEW and SCHEDULED states.
  context: External resource deletion triggers workflow cancellation.

- test: test_workflows.py::test_filter_failed_mapping (lines 4378-4426)
  fact: __FILTER_FAILED_DATASETS__ removes failed datasets from a mapped collection, reducing collection size for downstream steps.
  context: Failure filtering is a first-class collection operation — distinct from filter_null.

- test: test_workflows.py::test_keep_success_mapping_paused (lines 4448-4520)
  fact: __KEEP_SUCCESS_DATASETS__ filters mapped collections at execution time, keeping only successful datasets. Paused datasets don't propagate downstream when filtered.
  context: Interaction between paused state, mapping, and output filtering.

- test: lib/galaxy/workflow/run.py (lines 785-812)
  fact: Subworkflows with disconnected required inputs fail at invocation time with output_not_found reason ONLY if the input has no default value. Disconnected + default automatically uses the default.
  context: Clarifies the subworkflow wiring validation contract — defaults bypass connection requirements.

- test: lib/galaxy/schema/invocation.py (lines 101-108)
  fact: Expected failure reasons (dataset_failed, collection_failed, job_failed, output_not_found, when_not_boolean, step_input_deleted) are exposed to users. Unexpected failures (expression_evaluation_failed, unexpected_failure) are logged but details hidden to avoid leaking secrets.
  context: Security model for failure reporting — some details intentionally redacted.

- test: test_workflows.py::test_workflow_resume_from_failed_step (lines 2560-2611)
  fact: When a failed step is resumed via rerun_remap_job_id, dependent steps that were paused due to the failure transition to ok and continue execution.
  context: Failure recovery semantics — distinct from initial execution and re-invocation.

- test: lib/galaxy/workflow/modules.py (lines 604-700)
  fact: Implicit collection matching uses matching.CollectionsToMatch to find collections needing mapping. The algorithm respects direct_match, can_map_over, and subcollection_type to determine mapping depth.
  context: Core matching algorithm — bridges collection_semantics.yml concepts to workflow runtime.

---

## 3. Open Semantic Questions

Questions that the current facts cannot answer, organized by priority.

### Critical (core behavioral contracts)

**Q1: How does job failure propagate to downstream steps?** *(ANSWERED)*
When an upstream job fails, are downstream steps immediately failed, delayed first, or left in limbo?
*Answer:* Two distinct failure paths depending on connection type:
1. **Non-data connections** (parameters): `__check_implicitly_dependent_step()` (run.py:333-362) checks job.state before step inputs are evaluated. If `job.state != OK`, raises `FailWorkflowEvaluation` with `InvocationFailureJobFailed` → entire workflow fails.
2. **Data connections only**: Job state check never runs. Instead, downstream step fails when `replacement_for_connection()` finds the dataset in ERROR state → `InvocationFailureDatasetFailed`.
Key distinction: non-data connections fail on *job* state, data connections fail on *dataset* state. Both result in workflow failure, but via different code paths and different failure reasons.

**Q2: What are the pause step implicit dependency semantics?** *(ANSWERED)*
Do subsequent steps implicitly depend on pause completion even if not connected?
*Answer:* No. Pause steps do NOT create implicit dependencies. The implicit dependency check (run.py:323-332) only checks `non_data_connection` inputs. Pause steps have data connections (dataset in, dataset out), so they're not checked. Instead, downstream steps that consume the pause step's output are blocked because `replacement_for_connection()` finds `STEP_OUTPUT_DELAYED` and raises `DelayedWorkflowEvaluation`. Steps NOT connected to the pause step run immediately. The TODO at line 345 is about job state checking for pause steps (which have no jobs), not about adding new implicit dependencies.

**Q3: What happens when a workflow output sources from a conditionally-skipped step (no pick_value)?** *(ANSWERED)*
Is the output absent, null, or an error?
*Tests:* `skipped_step_output.gxwf-tests.yml` (2 cases), `skipped_mapped_output.gxwf-tests.yml` (1 case). **DIRECT**.
*Answer:* Workflow succeeds. Skipped step output is a hidden (visible=false) expression.json dataset with content "null". When the same workflow runs with when=true, output is a real visible dataset. For mapped conditionals with mixed skip/run, the output collection preserves element ordering — executed elements have real content, skipped elements are expression.json null placeholders.

**Q4: What is the null propagation chain through multiple steps?** *(ANSWERED)*
When expression.json output is null (from skipped step) and flows through multiple downstream steps before pick_value, what is behavior at each intermediate step?
*Tests:* `null_propagation_three_step_chain.gxwf-tests.yml`, `null_propagation_data_chain_pick_value.gxwf-tests.yml`, `null_propagation_param_chain.gxwf-tests.yml`. **DIRECT**.
*Answer:* Skip/null propagates indefinitely through both data-input chains and parameter chains. Data-input tools receiving expression.json null do NOT process it literally — they also produce expression.json null. pick_value correctly recognizes propagated nulls and selects fallbacks. For parameter chains, null is preserved as a JSON value through expression evaluation at each hop.

**Q5: What happens to PJAs when their target step was skipped?** *(ANSWERED)*
Silent no-op, or invocation failure?
*Closest test:* `test_workflows.py::test_run_rename_based_on_input_conditional` (lines 7812-7853) — **TANGENTIAL** for the skip case.
*Answer:* Neither silent no-op nor error. PJAs DO execute on skipped steps' placeholder datasets (job_callback fires unconditionally). Most PJAs operate harmlessly on the null placeholders. Only `ChangeDatatypeAction` has explicit skip-awareness and returns early to preserve expression.json. See evidence-based fact in `workflow_semantics_facts.yml`.

**Q6: What does a multi-data tool actually receive when optional input is omitted?**
Empty array? Single NO_REPLACEMENT sentinel? Something else?
*Likely answer in:* `modules.py` lines 2460-2480
*Closest test:* `test_workflows.py::test_run_with_optional_data_unspecified_to_multi_data` (lines 6293-6299) — Tests multi_data_optional tool receiving "No input selected" text output when optional input is omitted. **DIRECT** — tests this exact behavior (question may actually be answerable from this test's output).

**Q7: What is the resume-from-failed vs rerun semantic difference?** *(ANSWERED)*
Are intermediate outputs preserved differently? Is state initialization different?
*Answer:* Fundamentally different mechanisms. **Resume** is an implicit side effect of re-running a failed tool with `rerun_remap_job_id` on `/api/tools`. Same invocation continues (same ID). `_remap_job_on_rerun()` creates new job, hides old failed outputs, remaps downstream job parameters to new outputs, calls `job.resume()` (PAUSED→NEW, recursive through full dependency chain). Downstream jobs re-execute with remapped inputs. Successful intermediate steps are preserved via `recover_mapping()`. **Rerun** creates a new invocation (new ID, fresh state). All steps execute from scratch or use cached jobs. No relationship to previous invocation. The two are orthogonal: resume fixes failure in-place, rerun starts fresh.

### Important (type system and coercion)

**Q8: What are the full when-expression type coercion rules?** *(ANSWERED)*
Beyond string "false" vs boolean False — what about None, 0, empty string, empty list in boolean context?
*Answer:* Strict `isinstance(result, bool)` — NO coercion. Any non-boolean type fails with `when_not_boolean` reporting the actual type name. None, 0, "", [] would all fail. The `from_cwl()` passthrough preserves JavaScript types unchanged. Only tested case is string "false" → fails as "Type is: str".

**Q9: What are the general parameter type coercion rules for connections?** *(ANSWERED)*
The facts show integer->data_column. What's the full type compatibility matrix?
*Answer:* There IS no type matrix — parameter connections have no type validation or coercion. Values flow through unchanged. The `from_json()` methods (which do coerce) are NOT called for connected values. Cross-type connections are untested. This means the same tool input behaves differently depending on whether its value comes from a connection (raw passthrough) vs step state (from_json coercion).

**Q10: Can a subworkflow declare its own map_over source on top of parent mapping?** *(ANSWERED)*
What are the nesting/combining rules?
*Test:* `subworkflow_mapping_combination.gxwf-tests.yml`. **DIRECT**.
*Answer:* No independent stacking. When parent maps list over subworkflow (data input gets list → 1 mapping axis) and subworkflow internally maps over a different list (list input gets list → direct match, 0 axes), the output is a flat list, not list:list. Consistent with collection_semantics.yml — implicit mapping resolves the gap between provided and expected depth across all inputs simultaneously, not per-input independently. Subworkflows behave like tools. Two inputs don't contribute independent mapping axes.

**Q11: What variables are available in the expression evaluation context?** *(ANSWERED)*
Strictly tool-input-driven, or derived/computed values too?
*Answer:* Context is CWL-based JavaScript via Node.js. Available globals: `$job` (aliased as `inputs` — all connected step inputs converted via to_cwl()), `$self` (current output context), `$runtime`/`$tmpdir`/`$outdir` (environment). Inputs include File objects (with .path, .basename, .nameroot, .nameext, .format), deserialized expression.json, collections as arrays/dicts, and primitives. See `COMPONENT_GALAXY_WORKFLOW_EXPRESSION_CONTEXT.md` for full details.

**Q12: Does format_source require exact format match, or does Galaxy attempt implicit conversion?** *(ANSWERED)*
*Answer:* No validation. `format_source` silently overrides the declared `format` with the source dataset's extension via `get_ext_or_implicit_ext()` (respects implicit conversions). If lookup fails, silently falls back to declared format. See evidence-based fact in `workflow_semantics_facts.yml`.

### Operational (scheduling, state, timeouts)

**Q13: What happens when maximum_workflow_invocation_duration is exceeded?** *(ANSWERED)*
Invocation fails — but are in-flight jobs cancelled or allowed to finish?
*Test:* `test/integration/test_workflow_scheduling_options.py::TestMaximumWorkflowInvocationDuration::test` — confirms "failed" state transition.
*Answer:* In-flight jobs are left running. Timeout calls `set_state(FAILED)` directly (Fail pathway) without calling `cancel_invocation_steps()`, as do all other failure pathways. This is asymmetric with user cancellation, which does call `cancel_invocation_steps()` to set jobs to DELETING — and the asymmetry is intentional: cancelling is an explicit request to stop, failing is not, and results from unaffected branches may still be wanted. See `RESEARCH_GAPS_MEDIUM_PRIORITY.md` Q13 and, if the policy is ever revisited, the prototype branch [`jmchilton:invocation_failure_cancels_jobs`](https://github.com/jmchilton/galaxy/tree/invocation_failure_cancels_jobs).

**Q14: What state is persisted vs recomputed across scheduling iterations?** *(ANSWERED)*
When a delayed workflow is rescheduled, are parameter evaluations re-executed?
*Answer:* Hybrid approach. **Persisted in DB:** InvocationStep records (state, job_id), step outputs (dataset/collection associations), workflow inputs, parameter inputs, tool input runtime state as JSON. **Recomputed fresh each iteration:** WorkflowProgress instance (created new), `self.outputs` dict (empty, recovered from DB via `recover_mapping()`), tool info (`inject_all()`), runtime state (`compute_runtime_state()` from persisted JSON). Parameter evaluations are effectively recomputed — `param_map` is the raw invocation dict, and `compute_runtime_state()` runs fresh. Step outputs from completed steps are recovered from DB, not recomputed.

**Q15: What happens with maximum_workflow_jobs_per_scheduling_iteration limits?** *(ANSWERED)*
If limit is reached mid-workflow, what's the invocation state? Can remaining steps resume next iteration?
*Likely answer in:* `run.py` lines 192-196, 234-237, 310-313
*Closest test:* `test/integration/test_workflow_scheduling_options.py::TestMaximumWorkflowJobsPerSchedulingIteration` — Two tests confirm that with limit=1, multi-step workflows (including collection ops and dynamic collections) complete successfully across multiple scheduling rounds. **DIRECT**.
*Answer:* The limit throttles jobs per iteration but remaining steps resume in subsequent iterations. Workflow completes normally — this is a throttle, not a cap.

**Q16: How are error messages propagated through deeply nested subworkflows?** *(ANSWERED)*
Is there a stack of workflow_step_index_path values for tracing?
*Answer:* Yes. `workflow_step_index_path` (list of step order_index values) is built at `run.py:288-296` — when `FailWorkflowEvaluation` is caught and current step is a subworkflow, the step's order_index is appended. Persisted as JSON in `WorkflowInvocationMessage`. Schema supports it via `InvocationMessageBase.workflow_step_index_path: Optional[list[int]]`. Mechanism exists but has no integration test for deep (3+) nesting.

### Edge Cases

**Q17: When conditional mapping produces mixed skip/run results, what is the output collection structure?** *(ANSWERED)*
Is element ordering preserved? Do skipped elements leave gaps or null placeholders?
*Tests:* `skipped_mapped_output.gxwf-tests.yml`, `test_run_workflow_conditional_step_map_over_expression_tool_pick_value`. **DIRECT**.
*Answer:* Element ordering preserved. Skipped elements become expression.json null placeholders at their original positions — no gaps, no removed elements. Collection retains full size with real datasets at executed positions and null placeholders at skipped positions.

**Q18: When pick_value selects from mixed visible/hidden outputs, is the result visible or hidden?** *(ANSWERED)*
*Test:* `test_pick_value_output_visible_with_hidden_inputs` (lines 9700-9750). **DIRECT**.
*Answer:* pick_value output is always visible regardless of input visibility. It does not inherit hidden state from skipped inputs. pick_value effectively "launders" visibility — the selected result appears in history even when sourced from hidden inputs.

**Q19: How does cached job validation interact with changed inputs?** *(ANSWERED)*
What invalidates a cached job?
*Answer:* DB-based parameter hash matching. Cache hit requires exact match on: tool ID+version, user ID, job state (OK), input dataset IDs, and all non-ignored tool parameters (JSON-serialized, sorted keys, byte-for-byte). No explicit invalidation — entries are immutable DB records. Only way to get a cache miss is to change an input parameter or dataset. Ignored params: `__use_cached_job__`, `__workflow_invocation_uuid__`, `__when_value__`, `__input_ext`, `chromInfo`, `dbkey`, `*|__identifier__`.

**Q20: What is the scope/depth limit for runtime parameter substitution in nested subworkflows?** *(ANSWERED)*
If parameter defined in parent, referenced in PJA of nested-nested-subworkflow — does substitution resolve?
*Test:* `replacement_parameters_nested_two_levels.gxwf-tests.yml`. **DIRECT**.
*Answer:* Yes, substitution works through two subworkflow boundaries. Parent passes "my_prefix" → level1 → level2 where PJA rename produces "my_prefix deep_output". No depth limit observed — parameters are passed explicitly at each boundary.

**Q21: Does "ready" for dataset state checking before expression evaluation have a precise definition?** *(ANSWERED)*
Specific state value, or implicit contract?
*Answer:* Yes, precise two-tier definition. Tier 1: `Dataset.in_ready_state()` = NOT in {NEW, UPLOAD, QUEUED, RUNNING, SETTING_METADATA}. Ready states include OK, EMPTY, ERROR, PAUSED, FAILED_METADATA, DEFERRED, DISCARDED. Tier 2: `is_ok` requires state == OK specifically. In to_cwl(): not-ready → DelayedWorkflowEvaluation (retry later), ready-but-not-ok → FailWorkflowEvaluation (hard fail), purged → FailWorkflowEvaluation. "Ready" = "stop waiting," "ok" = "the answer is good." See evidence-based fact in `workflow_semantics_facts.yml`.
