Run via Claude Opus 5.5 at high effort.

# Scope evaluation: wes_run_state_executor_error_26_0

**Recommendation: keep as implemented, on `release_26.0`, with no expansion.** The rule stays: a `completed` invocation whose completion summary counts any job in `error`, `failed` or `paused` reports `EXECUTOR_ERROR`. On the demo evidence, D3's narrower output rule does no better. It catches the same two of the four `COMPLETE`-but-failed cases (failed+paused jobs, and the uid failure, which has the same shape). No candidate rule catches the other two (lost discovered outputs, 4 of 12 jobs), because in those every job and every output is `ok`; they are runner and Pulsar bugs, fixed on the Pulsar stack and by D9. D3's only gain is keeping some filter-failed runs `COMPLETE`, and only when the workflow labels nothing upstream of the filter. Of 134 IWC workflows, 8 use filter-failed, and 4 of those label the exact collection they filter, so D3 still gives `EXECUTOR_ERROR` there. For that gain, D3 adds output queries on every failed run and live, not snapshot, semantics. It also needs a fallback for workflows with no labelled outputs and still misses failures in unlabelled branches. Paused-only misses a failing last step: MultiQC itself erroring would read `COMPLETE`. Dropping the change leaves the investigation's top "state you can't trust" finding in place. None of the expansions earn a place. Galaxy's `failed` invocation mostly means data or tool failures, not WES `SYSTEM_ERROR`. The thermo step's "RUNNING forever" case doesn't happen on the workflow path, because the same exception fails the invocation. If John still wants filter-failed workflows to read `COMPLETE`, the reason he gave in the 26.0 docs, build D3 with a job-rule fallback on `dev`; "What would change" below lists the work.

Branch at `ec656e83ae7`: `525361a1b32` (behavior-preserving `_invocation_wes_state` helper) plus `ec656e83ae7` (the rule, `joinedload(WorkflowInvocation.completion)` in `list_runs`, docs, three API tests, one unit query-count test). +177/−25 over 4 files against the parent `67305c6d0a1`.

## The evidence, rule by rule

The project synthesis (`vault/projects/ga4gh_wes_tes/WES_TES_VS_GALAXY_APIS.md`, "State you can't trust") lists four kinds of failed run that WES reported `COMPLETE`. I checked each against the demo's run artifacts.

| Case (demo evidence) | What Galaxy holds at `completed` | As implemented | D3 (outputs in `error`/`paused`) | Paused-only | Drop |
| --- | --- | --- | --- | --- | --- |
| fastp `error` + MultiQC `paused` (`runs/setup/wes-probes/probe-I-*`, demo bug 5) | jobs `{error, paused}`; output "MultiQC HTML report" dataset `paused`; fastp JSON collection has an `error` element | `EXECUTOR_ERROR` | `EXECUTOR_ERROR` | `EXECUTOR_ERROR` | `COMPLETE` |
| uid mismatch on direct Pulsar (`runs/tesp-probes/direct-pulsar/01-uid-mismatch/`) | same shape: task `5.0 fastp` exit 1, task `6 MultiQC` exit `null` (never ran), MultiQC output never served by DRS | `EXECUTOR_ERROR` | `EXECUTOR_ERROR` | `EXECUTOR_ERROR` | `COMPLETE` |
| Lost discovered outputs, staging image `0.15.0.2` (`runs/gaps/discovered-outputs/`) | job `ok`; `pieces` collection `ok` with **0 elements**; discovered primary dataset missing (and not a workflow output) | `COMPLETE` | `COMPLETE` | `COMPLETE` | `COMPLETE` |
| 4 of 12 jobs, design B on tesp-api (`runs/acceptance/20261115T044628Z-tesp-native/`) | 4 jobs, all `ok`; `fasplit`'s discovered `output_list` `ok` with **0 elements** (tesp-api has no DIRECTORY outputs), so the map-over created no jobs | `COMPLETE` | `COMPLETE` | `COMPLETE` | `COMPLETE` |

The last two are a job reporting success after its outputs vanished. No job-state or output-state rule can see that, because Galaxy records nothing as failed. An "empty collection ⇒ error" rule would misfire on legitimately empty outputs. Those cases are fixed where the data is lost: the Pulsar coexecution stack ("directory outputs fail", `coexecution_stage_out_failures`), a current staging image (D9), and design B's tesp-api limitation. None of them is WES scope.

Where the rules do differ, outside the four cases:

| Situation | As implemented | D3 | Paused-only |
| --- | --- | --- | --- |
| Last step fails (e.g. MultiQC itself errors), nothing downstream | `EXECUTOR_ERROR` | `EXECUTOR_ERROR` if its output is labelled | **`COMPLETE`** |
| Filter-failed workflow, one element fails, only post-filter outputs labelled (4 of 134 IWC workflows) | `EXECUTOR_ERROR` | `COMPLETE` | `COMPLETE` |
| Filter-failed workflow, one element fails, the filtered collection itself labelled (4 of 134 IWC workflows: both SARS-CoV-2 ARTIC, pox half-genome, Nanopore pre-processing) | `EXECUTOR_ERROR` | `EXECUTOR_ERROR` | `COMPLETE` |
| Failure in an unlabelled side branch | `EXECUTOR_ERROR` | `COMPLETE` (unless "any paused job" is added) | `COMPLETE` unless something downstream paused |
| Workflow with no labelled outputs (common in ad hoc WES submissions; all of `test_wes.py`'s new workflows but one) | `EXECUTOR_ERROR` | `COMPLETE` without a fallback | depends on pauses |
| User resumes a paused job afterwards and it succeeds | stays `EXECUTOR_ERROR` (snapshot) | flips to `COMPLETE` (live) | stays `EXECUTOR_ERROR` |
| Extra queries | none beyond the joinedload | 2 + one per output collection, per failed completed run | none |

IWC counts come from scanning `~/projects/repositories/iwc` (134 `.ga` files): 8 contain `__FILTER_FAILED_DATASETS__`. In 4 of them, the output feeding the filter is itself a `workflow_outputs` entry. In none of the 8 does another step consume that filtered output directly, so it causes no pauses.

## Possible Decompositions

The branch is 177 added lines, so these are the ways it could split. This is not a recommendation to split it.

1. **Two PRs, as committed.**
   - (a) `525361a1b32`: the `_invocation_wes_state` helper. Behavior-preserving; it could ride in the parent `wes_api_fixes_26_0` PR or land alone on `release_26.0`.
   - (b) `ec656e83ae7`: the rule, the joinedload, the docs and the tests, on top.

   (a) stays valid whatever John decides about (b).
2. **Three PRs by controversy.**
   - (a) The helper.
   - (b) Paused jobs ⇒ `EXECUTOR_ERROR`, plus `test_wes_state_mapping_paused_job` and the joinedload with its unit test, on `release_26.0`. This is the least contested part, because WES has no terminal state for a run that is waiting on a user.
   - (c) Errored jobs ⇒ `EXECUTOR_ERROR`, the `failed_job` and `failed_job_in_subworkflow` tests, and the docs reversal of "a failed job does not make the run unsuccessful", on `release_26.0` or `dev`.

   Splitting the docs this way means (b) has to document an intermediate rule.
3. **Docs first, then the rule.** A docs-only PR on `release_26.0` that keeps today's behavior but makes the gotcha prominent ("`COMPLETE` does not mean every job succeeded; read `/api/invocations/{id}/completion`"), then (1b) or D3 on `dev`.

## Scopes considered

### 1. As implemented (recommended)

A `completed` invocation whose `WorkflowInvocationCompletion.job_state_summary` (which includes subworkflow jobs) counts any `error`, `failed` or `paused` job maps to `EXECUTOR_ERROR`. Otherwise it maps to `COMPLETE`. Targets `release_26.0`.

| Pros | Cons |
| --- | --- |
| Catches both catchable evidence cases and a failing last step, which paused-only misses. | Filter-failed runs where an element fails become `EXECUTOR_ERROR`, reversing John's 26.0 doc ("intentional and important"). |
| Literal to the spec: `EXECUTOR_ERROR` is "a tool returned non-zero exit code"; `COMPLETE` is "executors have exited without error". | A client that gives up on `EXECUTOR_ERROR` skips usable outputs of a mostly successful batch. |
| No per-request queries: the summary is precomputed once at completion, and `list_runs` is pinned at one statement by the unit test. | It's a snapshot: resuming a paused job later doesn't move the run back to `COMPLETE`. Galaxy doesn't revisit `completed` either. |
| Works for workflows with no labelled outputs, which is how most ad hoc WES submissions look. | Can't catch silent data loss (cases 3 and 4). No rule here can. |
| Already hardened: tests, mutation checks, Codex, thermo and performance reviews. | Reverses documented behavior on a release branch. |

<details>
<summary>Why release_26.0 is defensible</summary>

WES is new in 26.0, and the old mapping makes a spec-defined terminal state report the opposite of what happened. The project counts that as the most serious honesty bug. Galaxy is liberal about release-branch bug fixes, and the process guidance overrides "targets a release branch" as a reason to narrow. The documented behavior was John's own choice (`1981c78e8459`, 2026-06-08), so reversing it is his call, not a reviewer's surprise. WES files are behaviorally identical from v26.1.2 to `dev`, so the forward merge is mechanical. If reviewers push back on reversing a release-branch doc, retarget (1b) to `dev` unchanged.

</details>

### 2. D3: EXECUTOR_ERROR only when a workflow output is in error, or the run is paused

`EXECUTOR_ERROR` when a labelled workflow output is unsuccessful, optionally also when any job is paused; `COMPLETE` otherwise. D3 targets `dev`.

| Pros | Cons |
| --- | --- |
| Keeps filter-failed runs `COMPLETE` when only post-filter outputs are labelled, honoring the 26.0 doc's reason. | Catches no evidence case that scope 1 misses; it differs only by reporting `COMPLETE` more often. |
| Closest to the spec's "output files have been successfully uploaded" clause. | Half of IWC's filter-failed workflows label the pre-filter collection, so they still read `EXECUTOR_ERROR`. |
| Live evaluation: a resumed and successful paused job moves the run to `COMPLETE`. | Blind for workflows with no labelled outputs, and for failures in unlabelled branches, unless a job-rule fallback is added (making the rule a hybrid that is harder to document). |
| | 2 + one-per-output-collection queries per failed completed run (gated; see details), more code, and a terminal state that can change. |
| | Changes documented behavior too, just less. D3 itself recommends `dev`. |

<details>
<summary>What "workflow output in error" and "run is paused" mean in Galaxy's model</summary>

**Workflow outputs.** Only labelled outputs are recorded. `WorkflowProgress.set_step_outputs` (`lib/galaxy/workflow/run.py`) calls `add_output` only for `step.workflow_outputs`, giving three relationships on `WorkflowInvocation`:

- `output_datasets` → `WorkflowInvocationOutputDatasetAssociation.dataset` (an HDA). Unsuccessful means `Dataset.state` in (`error`, `paused`). A paused job sets its outputs' `Dataset.state` to `paused` (`jobs/__init__.py` `pause`, `jobs/handler.py`). `HDA._state` only carries `failed_metadata`/`setting_metadata`, which should not count.
- `output_dataset_collections` → `WorkflowInvocationOutputDatasetCollectionAssociation.dataset_collection` (an HDCA). Unsuccessful means `collection.populated_state` is `failed`, **or** still `new` (a discovered collection whose job was paused or errored never populates), **or** any nested element dataset is `error`/`paused`. The element check is `DatasetCollection.dataset_states_and_extensions_summary.states`: one nested query per collection, at any depth. A mapped step's implicit collection is `populated_state=ok` with per-element states, so the element walk is what catches a failed sample.
- `output_values` → `WorkflowInvocationOutputValue`: parameters, no state. Ignore.

Subworkflow outputs that the outer workflow labels are recorded on the outer invocation too, because `set_step_outputs` runs for the subworkflow step. Only the outer invocation's outputs should be judged.

**"Run is paused."** Galaxy has no paused invocation state: an invocation with paused jobs is `completed`, because `paused` is in `Job.settled_states`. So "the run is paused" can only mean "the completion summary counts a `paused` job", which is scope 3's predicate. D3's own text says outputs "in `error` or `paused`". The brief's reading adds any paused job. The difference is a paused job in an unlabelled branch. Adding it costs nothing (it reads the summary) and doesn't hurt the 8 IWC filter-failed workflows, since none of them pauses on the filtered output.

**Filter-failed.** `FilterFailedDatasetsTool` sets `require_terminal_states=True` and `require_dataset_ok=False`, so it waits for the mapped jobs and drops failed elements without pausing anything. Its output collection is `ok`. The upstream implicit collection keeps its `error` elements, so D3 reads `COMPLETE` only when that upstream collection isn't labelled. If every element fails, the filtered output is an empty `ok` collection and D3 reads `COMPLETE` for a run that produced nothing.

**Query cost.** Gate on the existing summary first: only evaluate outputs when the summary counts `error` or `paused`. Successful runs, the common case, then cost nothing beyond today's joinedload. For a gated run:

- one `EXISTS` over `workflow_invocation_output_dataset_association ⋈ history_dataset_association ⋈ dataset` with `dataset.state IN ('error','paused')`;
- one query loading the output HDCAs with their collections (`populated_state`);
- one `dataset_states_and_extensions_summary` query per output collection.

On a `list_runs` page with *f* failed runs that is about *f*·(2 + *c*) extra statements, unless the dataset check is batched across the page with `workflow_invocation_id IN (...)`. The gate is sound as long as outputs can't be `error`/`paused` without an `error`/`paused` job; if it ever isn't, the run reads `COMPLETE`, the same as today. Storing an output verdict at completion time instead would need a column and migration, which doesn't fit a release branch, and would lose the live behavior.

**Workflows without labelled outputs.** WES submissions often have none. Two of the branch's three new API test workflows have no `outputs:`. Without a fallback, D3 reports `COMPLETE` for any failure in them. With the fallback "no workflow outputs ⇒ judge by jobs (scope 1)", it doesn't.

</details>

### 3. Paused-only narrowing

Count `paused` jobs and ignore `error`. A paused job is one Galaxy won't run without a user, usually because an upstream job failed.

| Pros | Cons |
| --- | --- |
| Catches both catchable evidence cases (each had a paused MultiQC). | A failing last step, or any failure with nothing downstream, reads `COMPLETE`, so a client trusts a run whose final report errored. |
| Keeps all 8 IWC filter-failed workflows `COMPLETE`, since filter-failed never pauses. | The rule is defined by an indirect symptom, so it is hard to explain to WES clients ("errors don't count unless something was waiting on them"). |
| Same zero query cost; a one-line change to the tuple; `test_wes_state_mapping_paused_job` already pins it. | Still reverses part of the 26.0 doc. |
| The least contested piece: WES `PAUSED` is non-terminal, so a client would otherwise have no correct state for such a run. | |

### 4. Drop it (keep the documented behavior), possibly docs only

Keep `completed` ⇒ `COMPLETE`. Optionally sharpen the docs: put "`COMPLETE` does not mean every job succeeded" at the top of the state section and point clients at `/api/invocations/{id}/completion` or the tasks endpoint.

| Pros | Cons |
| --- | --- |
| No behavior change; honors John's 26.0 decision exactly. | Leaves the bug the investigation ranks first ("A client that trusts `COMPLETE` accepts failed runs"). |
| A docs-only PR is trivially release-safe. | Generic WES clients (the point of WES) won't read Galaxy-specific docs or call the native API. WES tasks carry no job state, so a client can't tell a paused job from one not yet started. |
| | The helper refactor `525361a1b32` would have no consumer, so it should be dropped too or folded into the parent. |
| | Contradicts D3 and D14, which both say to land a state fix. |

### 5. Expansions considered

#### 5a. Galaxy `failed` invocation ⇒ WES `SYSTEM_ERROR`

Map Galaxy's scheduling-failure state to `SYSTEM_ERROR` ("not from an Executor") instead of `EXECUTOR_ERROR`. Raised in the implementation debrief and left alone there.

| Pros | Cons |
| --- | --- |
| `SYSTEM_ERROR` sounds closer to "the engine couldn't schedule it". | Most `FailureReason`s are data or workflow failures: `dataset_failed`, `collection_failed`, `job_failed`, `output_not_found`, `when_not_boolean`, `workflow_parameter_invalid`, `step_input_deleted`. Those aren't system errors. |
| | Even `unexpected_failure` wraps user-caused `ToolExecutionError`s (`workflow/run.py` turns any `MessageException` into it), so a reason-based mapping would mislabel those too. |
| | Needs a messages query per failed run; every client treats both states as terminal failure anyway. |

#### 5b. "An invocation with a `failed` job never completes, so WES shows RUNNING forever" (thermo step)

The thermo step proposed this as a Galaxy-core follow-up. Not an expansion of this branch.

| Pros | Cons |
| --- | --- |
| True as a model fact: `failed` is not in `Job.settled_states`, so `is_complete` never holds. | On the workflow path it doesn't happen: `Job.mark_failed` is only called from `Tool.handle_single_execution` on `ToolExecutionError`, which re-raises. The scheduler then turns the `MessageException` into `FailWorkflowEvaluation(unexpected_failure)` and fails the invocation, which WES already reports as `EXECUTOR_ERROR`. |
| | No demo run showed it. A fix would belong in `Job.settled_states`/the completion monitor on `dev`, not in WES. |

Consequence for this branch: the `failed` entry in `UNSUCCESSFUL_JOB_STATES` is unreachable today. The thermo step kept it as a correct classification, and that remains fine.

#### 5c. Shared "did this invocation succeed" predicate in the model

`WorkflowInvocationCompletion.unsuccessful_job_count` or similar, used by WES, the completion API and the client. The thermo step deferred it to `dev`.

| Pros | Cons |
| --- | --- |
| One definition, where the client's two `ERROR_STATES` lists disagree today. | Only one consumer; it would move a WES-specific policy (paused counts as failure) into the model. The thermo review's reasoning holds. |
| | Would have to be redone if John picks D3. |

#### 5d. Target `dev` instead of `release_26.0`

Same code, different base. D3 recommends `dev` for any rule that changes documented behavior.

| Pros | Cons |
| --- | --- |
| No reversal of a documented behavior inside a release series. | 26.0, 26.1 and 26.2 deployments keep reporting failed runs as `COMPLETE` until 27.0. |
| | The parent PR targets `release_26.0`, so the stack would split across bases; the helper commit would have to go with the parent or be duplicated. |
| | The process guidance overrides "release branch" as a reason to narrow, and WES is new in 26.0. |

#### 5e. Smaller items from the debriefs (not scope)

- **Skipped-job success test** (test step). A baseline test: it passes before and after. Worth adding if the rule is reworked (D3), because a rule that reads outputs must not count a skipped step's outputs.
- **Unused `WES_TO_GALAXY_STATE`** (thermo, parent finding). A one-line `dev` cleanup, outside this diff.
- **History lazy-load in `_get_invocation`** (performance, parent finding). Parent code.

## What would change (if John picks D3)

This section isn't the recommendation. It is the work list if John chooses the D3 rule.

- **Code (`services/wes.py`).** `_invocation_wes_state` keeps its signature and its `completed` branch.
  - Gate: if `job_state_summary` counts no `error`/`paused`, return `COMPLETE`.
  - Fallback: if the invocation has no `output_datasets` and no `output_dataset_collections`, return `EXECUTOR_ERROR` (the job rule).
  - Otherwise: return `EXECUTOR_ERROR` if any output dataset's `Dataset.state` is in (`error`, `paused`), or any output collection is unpopulated or failed, or has an `error`/`paused` element; also if the summary counts a `paused` job (the "run is paused" clause).

  The helper needs a session, either from `object_session(invocation)` or by passing `trans.sa_session`; it moves from a pure function to a small query helper (about 30 to 40 lines). `UNSUCCESSFUL_JOB_STATES` shrinks to the gate's (`error`, `paused`). The `list_runs` joinedload stays. Optionally batch the dataset `EXISTS` across the page with `workflow_invocation_id IN (...)` for the gated runs.
- **Tests.**
  - `test_wes_state_mapping_failed_job` and `test_wes_state_mapping_failed_job_in_subworkflow` keep passing unchanged through the no-outputs fallback. Add a labelled output to one so it exercises the output path.
  - `test_wes_state_mapping_paused_job` keeps passing (`wf_output_1` is a collection with a `paused` element).
  - New API tests:
    - a filter-failed workflow (reuse `test_filter_failed_mapping`'s `exit_code_from_file` + `__FILTER_FAILED_DATASETS__` + `cat1` shape) with only the post-filter output labelled ⇒ `COMPLETE`;
    - a failed job in an unlabelled branch while the labelled outputs are `ok` ⇒ `COMPLETE`;
    - a success run with a skipped step ⇒ `COMPLETE`.
  - Unit test: keep the one-statement assertion for pages without failures; add a bound for a page with a failed run.
- **Docs (`doc/source/dev/ga4gh_wes.md`).** Rewrite the state table's `completed` rows, the "Failed and paused jobs" section and the gotchas bullet. New content: outputs decide the state, the fallback for workflows without labelled outputs, the paused-job clause, filter-failed runs reading `COMPLETE` only when the pre-filter collection isn't labelled, and that the state can move to `COMPLETE` after a paused job is resumed.
- **Target.** `dev`, per D3. The helper commit `525361a1b32` would then go with the parent PR on `release_26.0`, or be re-created on `dev`.
- **What from this pass still applies.**
  - The helper refactor, unchanged.
  - The `list_runs` joinedload and its unit test: the gate still reads the completion.
  - All three API tests and the `_assert_wes_run_state` helper.
  - The Codex docs fix, superseded by the rewrite.
  - Thermo's `Job.states` members and the mypy-clean unit test.
  - Performance's analysis of the completion join. Its "no per-request queries" conclusion would no longer hold for failed runs.
- **Validation remaining.**
  - Run the new API tests one at a time, each confirmed failing on the current rule where it should.
  - Run a mutation check on each clause (drop the fallback, drop collection elements, drop paused).
  - Re-measure statement counts with the performance step's script for a page mixing failed and successful runs.
  - Do a thermo or Codex pass on the new helper, since it now queries.
  - Optionally, a live demo rerun of probe I against the D3 build.

## Sources

- Branch debriefs in this directory: `implementation_debrief.md`, `test_challenges_debrief.md`, `performance_challenges_debrief.md`, `codex_review.md`, `thermo_nuclear_review.md`, `baseline_refactor.md`.
- `vault/projects/ga4gh_wes_tes/WES_TES_VS_GALAXY_APIS.md` (D3, D14, "State you can't trust") and `vault/projects/wes_tesp_api/BUGS_AND_ENHANCEMENTS.md` (item 10, D3).
- Demo runs under `~/projects/repositories/galaxy-wes-tes/runs/`: `tesp-probes/direct-pulsar/01-uid-mismatch/`, `gaps/discovered-outputs/` with `docs/gap-tests.md` test 1, `acceptance/20261115T044628Z-tesp-native/iwc-hyphy/`, and `docs/troubleshooting.md` §5.
- Galaxy at the branch head: `lib/galaxy/model/__init__.py` (`Job.settled_states`, `WorkflowInvocation.is_complete`, the output associations, `DatasetCollection.dataset_states_and_extensions_summary`), `lib/galaxy/workflow/run.py` (`set_step_outputs`, failure handling), `lib/galaxy/jobs/handler.py` (pausing), `lib/galaxy/tools/__init__.py` (`FilterFailedDatasetsTool`, `mark_failed`), `lib/galaxy/schema/invocation.py` (`FailureReason`).
