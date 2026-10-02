# galaxy #23859 — [26.1] Apply max_discovered_files to collection operation tools that multiply inputs

- Author: mvdbeek. Base: `release_26.1`. +178/-4, 6 files, one commit.
- Reviewed at `67839a98b2c` (worktree `~/projects/worktrees/galaxy/pr/23859`, single commit atop current `origin/release_26.1`).
- No prior reviews/comments.

## Summary

Prompted by a user flat-cross-producting two 1092-element lists (~2.3M HDAs in one request). Adds
`DatabaseOperationTool._check_output_count(count)` raising `RequestParameterInvalidException` (400)
when `count > config.max_discovered_files`, and calls it from:

- `CrossProductFlatCollectionTool` / `CrossProductNestedCollectionTool`: `2 * |A| * |B|`, using the
  stored `DatasetCollection.element_count` (fallback `len(elements)`) via new module helper `_element_count`.
- `DuplicateFileToCollectionTool`: `number`.
- `ApplyRulesTool`: via new optional `check_row_count` callback on
  `DatasetCollectionManager.apply_rules`, called on the final row count after `rule_set.apply` and
  before any `handle_dataset` copy.

Workflow path: the `MessageException` becomes `FailWorkflowEvaluation(unexpected_failure, details=...)`
via existing `workflow/run.py:295` handling. Bounded tools (filter/sort/relabel/harmonize/zip/merge...)
deliberately untouched. Docs updated in schema + sample + rst.

## Verdict

**Approve, with one design comment worth raising (non-blocking for a 26.1 fix).** Reuses the right
config knob and the standard `MessageException` path (proper 400, readable workflow message), counts
without loading elements, check runs before any copy. Coverage of single-job multipliers is complete
as far as I can tell (I walked all `DatabaseOperationTool` subclasses: unzip/zip/build_list/
split_paired/extract/merge/filter*/flatten/nest/sort/harmonize/relabel/tag/filter_from_file/
convert_sample_sheet are all bounded by input size or additive). Tests are real integration tests
that would fail without the fix.

## Findings

### Medium — limit is per-job, so map-over in one request bypasses it (reasoned, not run)

`lib/galaxy/tools/__init__.py:4126,4162,5131,4975` — the check is inside `produce_outputs`, i.e. per
execution slice. `__DUPLICATE_FILE_TO_COLLECTION__`'s `input` is `type="data"` and the cross products
take `collection_type="list"`, so all are mappable:

- duplicate mapped over a 1092-element list with `number=10000` → each slice passes (10000 ≤ 10000),
  request creates ~10.9M HDAs;
- cross product mapped over two `list:list` inputs with inner lists of ~70 → each slice ~9.8k, request
  creates `outer × 9.8k`.

That's the same "one request creates millions of datasets" failure the PR description cites. It is
consistent with how `max_discovered_files` already works (per job), so defensible, but the PR's stated
motivation is per-request.

Natural layer already exists: `execute.py:347-360` runs `tool_action.check_inputs_ready(...)` over
**every** `param_combination` before any job is created or implicit collections are populated, and
`ModelOperationToolAction.check_inputs_ready` (`actions/model_operations.py:45`) already has
`inp_data`/`inp_dataset_collections` in hand. A `DatabaseOperationTool.expected_output_count(incoming,
inp_dataset_collections) -> int` hook (0 by default; cross products/duplicate override) summed across
combinations in that pre-pass would (a) enforce a per-request total, (b) fail before
`_new_job_for_session`, (c) keep the per-tool formulas in one declarative place instead of
`produce_outputs` call sites. Apply rules would stay in `produce_outputs` (needs the rules run), which
is fine. Reasonable as a follow-up on dev rather than blocking the 26.1 fix.

### Low — check fires after the Job is created (reasoned, pre-existing pattern)

`actions/model_operations.py:120` `_new_job_for_session` runs before `produce_outputs` raises. Direct
API: nothing commits, fine. Workflow scheduling: `run.py:105-120` catches, fails the invocation and
adds it to the session with no rollback, so the half-built job (added via its history/session
association) can plausibly get committed in state `new`. Same thing already happens for
`RulesDSLError` → `MessageException` in apply_rules, so not introduced here; the pre-pass in the
medium finding would avoid it for cross product/duplicate.

### Nit — `check_row_count` callback vs. a value

`managers/collections.py:763,773` — a `max_elements: Optional[int]` argument (manager raises) would
be simpler than a callback, but then the manager has to own the message/exception. Callback is fine;
only mention if discussing the hook refactor.

### Nit — `_element_count` could live on the model

`tools/__init__.py:3981` — a `DatasetCollection` property (e.g. `element_count_or_load`) would be
reusable; `agents/history_tools.py:195` does its own `element_count or 0`. Very minor; skip in comment.

### Tests — good

`test/integration/test_max_discovered_files.py` new class with `max_discovered_files=5`:
flat/nested/duplicate/apply-rules rejection tests all produce >5 outputs and would return 200 without
the fix (red-to-green holds). `within_limit` and `filter_on_large_collection` are guards for the
intentional "bounded tools untouched" decision — worthwhile, not trivial. Workflow test asserts the
invocation message reason/details. No map-over test (ties to the medium finding). Imports at top; no
obvious comments (the one comment explains a non-obvious upload cap). Not run locally (integration;
CI covers it).

## CI

57 SUCCESS, 1 SKIPPED at `67839a98b2c`. All green.

## Draft PR comment

> *Posted by Claude (AI assistant) on behalf of jmchilton — not written by them personally.*
>
> Looks good to me — right config knob, a proper 400 / readable invocation message, counts from
> `element_count` without loading elements, and the check runs before any copy. I walked the other
> `DatabaseOperationTool`s and agree they're all bounded or additive. Tests would fail without the fix.
>
> One thought, fine as a dev follow-up rather than for 26.1: the check is per execution slice, so
> map-over in a single request still multiplies past the limit — e.g. Duplicate file to collection
> mapped over a 1092-element list with `number=10000` passes every slice and creates ~10.9M datasets;
> same for cross product mapped over two `list:list`s. `execute.py` already runs
> `tool_action.check_inputs_ready` over every param combination before any job is created, and
> `ModelOperationToolAction.check_inputs_ready` already has the collected inputs. A
> `DatabaseOperationTool.expected_output_count(...)` hook (default 0, overridden by cross products and
> duplicate) summed in that pre-pass would cap the whole request, fail before `_new_job_for_session`
> (so a failed workflow step doesn't leave a `new` job behind), and keep the per-tool formulas out of
> `produce_outputs`. Apply rules would stay where it is since it needs the rules evaluated.

## Finding 1 verification

Verdict: **CONFIRMED** (by code reading at `67839a98b2c`, matches PR head after fetch; not run).

- Check site: `tools/__init__.py:4126` (flat), `:4162` (nested), `:5131` (duplicate), `:4975` (apply rules, via
  `managers/collections.py:773`). All inside `produce_outputs`, called from `ModelOperationToolAction.execute`
  (`actions/model_operations.py:121,160`), which runs once per execution slice via `execute_single_job` ->
  `handle_single_execution` in the `execute.py:370` loop. So per param combination, not per request.
- Example holds: `duplicate_file_to_collection.xml:15` `input` is `type="data"` (mappable over any list);
  `cross_product_*.xml` inputs are `collection_type="list"` (mappable over `list:list`). Default
  `max_discovered_files` is 10000 (`config_schema.yml:3167`). Duplicate over a 1092-element list,
  `number=10000` -> 1092 slices each `10000 <= 10000` -> ~10.9M HDAs, no error. Flat cross product over two
  `list:list` (outer 100, inner 70 each) -> 100 slices × 2·70·70 = 9800 each -> 980k HDAs, no error.
- No aggregate guard: `max_num_jobs` (`execute.py:371`) is only set from workflow
  `maximum_workflow_jobs_per_scheduling_iteration` (default 1000, `workflow/modules.py:3004`,
  `run.py:419`); it spreads a step over iterations, does not bound the total, and is `None` for direct
  tool API requests (`execute.py:272` asserts it implies an invocation step). Nothing in `meta.py` caps
  map-over expansion size. Existing `max_discovered_files` use (`__init__.py:877,2977`) is per-job discovery.
- Fix location holds: `execute.py:347-360` loops over **all** `execution_tracker.param_combinations` calling
  `ModelOperationToolAction.check_inputs_ready` before `ensure_implicit_collections_populated` (`:362`) and
  before any job is created. That method already has `tool`, `inp_data`, `inp_dataset_collections`
  (`model_operations.py:45-54`), so element counts are available. Caveat: summing needs an accumulator across
  the loop (the hook is called per combination), and the loop only catches `ToolInputsNotOKException`, so a
  `MessageException` raised there aborts the whole request — which is the desired behavior. In the
  workflow path the pre-pass re-runs each scheduling iteration over the step's combinations; fine for a cap.

## Draft comment — finding 1 (non-blocking, user-requested)

> 🤖 *Posted by Claude (AI assistant) on behalf of jmchilton.*

This looks good and I don't think it should block 26.1 - but one gap worth considering here or in a dev follow-up: the limit is enforced per job, inside `produce_outputs`, so mapping over a collection sidesteps it. E.g. Duplicate file to collection mapped over a 1092-element list with `number=10000` passes every job's check and still creates ~10.9M datasets in one request; cross product mapped over two `list:list` inputs (100 outer × 70 inner) gives ~980k with no error. Nothing else caps the total - `max_num_jobs` only paces workflow scheduling and is `None` for direct tool requests.

`execute.py` already loops over every param combination (`check_inputs_ready`, ~L347) before any job is created, so an `expected_output_count`-style hook on the collection operation tools, summed across that loop, could cap the whole request up front and keep the per-tool formulas in one place. Happy for that to be a separate PR against dev.
