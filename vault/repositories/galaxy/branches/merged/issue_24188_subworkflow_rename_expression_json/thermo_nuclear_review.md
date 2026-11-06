# Thermo-nuclear review (re-harden)

Fresh review of head `6d93b8450ed` against `origin/release_26.1`. No blockers, and I made no code changes. The source delta is 2 hunks and +6/-1 lines in `run.py`. Both hunks call the canonical `modules.replace_expression_json_dataset`, and neither one leaves partial state when it delays. The one structural smell is that the subworkflow pre-read reads the file and throws the value away. I checked three ways to remove it, and each one is worse (see below), so the current shape stays.

Not acted on:
- **Read-and-discard pre-read.** Kept. Every way to collapse it is worse; see "Structural verdict".
- **Matching the pre-read guard to the storage line (`and input_subworkflow_step.label`).** Declined. Only an unlabeled native subworkflow input would see a difference, and the inner tool step reads that value itself anyway. The extra condition would add a branch to guard against a case that almost never happens.
- **Trimming the 3-line pre-read comment.** Declined. It explains why the value is read and discarded, which isn't obvious from the code. Trimming it would only be a style preference on a tiny release-branch diff.
- **Test-side duplication.** Already declined, with reasons, in [test_challenges_debrief.md](test_challenges_debrief.md) and [subagents/rescope_review.md](subagents/rescope_review.md). This covers the `pick_text` YAML in the 2 API tests, the `_setup_subworkflow_parameter` session setup, the roughly 25 other `output_collections` lookup sites, and the replacement unit test that overlaps other tests. I'm not re-arguing them here.
- **Mapped-HDCA renames.** This is a follow-up already recorded in index.md, and the same behavior exists on base.

## Structural verdict on the pre-read

`subworkflow_progress` calls `replace_expression_json_dataset(replacement, step)` and discards the result. On the inner input step, `set_outputs_for_input` reads the same file again. A reader has to hold 2 facts: the first read is only there to trigger the delay, and the second read is the one that stores the value. Here are the alternatives:

1. **Resolve in `subworkflow_progress` and pass the primitive down.** This would delete the storage-line hunk. But it changes the recorded inner invocation inputs and parameter-input step outputs from the HDA to the value. The plan rejected this explicitly, and the decision is recorded in index.md.
2. **Seed the child `WorkflowProgress.runtime_replacements` from `subworkflow_progress`.** This needs a new constructor parameter. The storage line still has to change too, because `remaining_steps` → `recover_mapping` → `set_outputs_for_input` runs on every later iteration and would overwrite the seeded value with `str(HDA)`. So it adds plumbing and deletes nothing.
3. **Drop the pre-read.** That is the alt branch (`_alt_original_scope`). Choosing it is a scope decision for John, not a code-quality fix.

Making the pre-read unconditional would also be wrong. The `parameter_input` guard is required: without it, a data input fed by an expression.json dataset would start reading or failing on it. The guard is a single condition next to the connection lookup that already exists, at the only place where the child's inputs are built. That's where this concern belongs.

## Behavior vs base (`origin/release_26.1`)

- `${label}` renames inside a subworkflow now get the expression.json value instead of the HDA repr. This is the fix.
- A labeled subworkflow text input backed by expression.json is now read twice per scheduling iteration: once by the pre-read and once by `set_outputs_for_input`, through execute or recovery. Base never read it at this point. The file is a small JSON file, so the cost doesn't matter.
- If the file is unreadable but its dataset is `ok` (shared-filesystem lag), the whole outer subworkflow step now waits for up to `EXPRESSION_JSON_GRACE_PERIOD_SECONDS` and then fails, attributed to that step. Base never waited and renamed with the repr instead.
- New failure mode: if the expression dataset is purged manually while its subworkflow is still scheduling, the invocation fails. This is the accepted tradeoff recorded in index.md. `DeleteIntermediatesAction` skips active invocations and never purges, so the automatic cleanup path can't trigger it.

## Validation

No code changed, so I didn't re-run the framework and API suites. Their last results are in [implementation_rescope_debrief.md](implementation_rescope_debrief.md) and [test_challenges_debrief.md](test_challenges_debrief.md). I ran these fresh on head:
- unit `test/unit/workflows`: 123 passed, 1 skipped
- `black --check` and `isort --check-only` on `run.py`, `test_workflows.py` and `test/unit/workflows/`: clean
- `cd lib && mypy galaxy/workflow/run.py`: 0 errors in `galaxy/workflow/`. The 11 errors it reports are pre-existing and in other packages.

<details><summary>Full review</summary>

**Delta.** `run.py` +6/-1 (842 lines, under 1k). `modules.py` untouched. Tests: 2 API tests plus the `_invocation_output_collection` helper, 1 framework workflow with its test file, and 2 unit tests. The `expression_json_hda` helper moved into `workflow_support.py`.

1. **Storage line (`set_outputs_for_input`).** Correct layer: it's the single place where `runtime_replacements` gets populated. It raises before `invocation.add_input` and `set_step_outputs`, so a delay leaves no partial state. Primitives, `NO_REPLACEMENT`, non-expression HDAs and HDCAs pass through unchanged, the same as on base. `runtime_replacements` stays `dict[str, str]`. No cast or extra optionality was added.
2. **Pre-read (`subworkflow_progress`).** This is the read-and-discard smell. The alternatives are worse (verdict above). It is attributed to the outer subworkflow step. `subworkflow_progress` has a single caller, `subworkflow_invoker`, from `SubWorkflowModule.execute`, which builds one invoker per step. So a delay here comes before any inner scheduling, and `subworkflow_inputs` is a local dict, so nothing is left half-applied. Earlier, `compute_collection_info` → `replacement_for_input(is_data=False)` already delays on pending datasets and fails on not-ok ones, so the pre-read only ever sees `ok` datasets.
3. **Guard asymmetry (low).** The pre-read guard is `type == "parameter_input"`. The storage line also requires `step.label`. They only differ for an unlabeled native subworkflow input, where the pre-read is just an early read of a value the inner tool step reads anyway. Left as is.
4. **Comment (nit).** 3 lines. It isn't obvious and it states the discard. Left as is.
5. **Tests.** `expression_json_hda` is now shared, with no remaining duplicate. The `_invocation_output_collection` helper has no populator equivalent (searched `populators.py`), is used twice, and is typed. Imports are at module top in every touched file. Remaining duplication was already ruled on in earlier debriefs.
6. **File size.** No file crosses 1k lines because of this branch. `test_workflows.py` was already far past 1k.

No security concerns.
</details>
