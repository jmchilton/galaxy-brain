# Workflow refactor API builds the workflow three times per request

Source: follow-up from dannon's review of #23799 ("every refactor now does about three builds and exports, dry runs included, which might be noticeable on big nested workflows -- not a blocker"). #23799 = refactor API skips no-op saves (#23762) and stops rewriting the source version (#23885); branch `workflow_refactor_detached_executor` on the `jmchilton` fork. Line refs below are against `722d8f2d09f` on that branch, `lib/galaxy/managers/workflows.py`.

## Problem

`WorkflowContentsManager.do_refactor` (`:2477`) now does this for every `PUT /api/workflows/{id}/refactor`, including dry runs:

1. Export the source version for comparison: `_refactor_comparison_dict` → `_workflow_to_dict_export(internal=True)` (`:2485`).
2. Export the source version again with `allow_upgrade=True` as the executor's description, then `copy.deepcopy` it (`:2489`).
3. **Build 1**: `_build_detached` (dry-run `update_workflow_from_raw_description`, deep copy of the description) for the executor's scratch workflow (`:2503`). It used to be handed the stored source version, which it mutated (#23885).
4. Run the executor.
5. **Build 2**: `_build_detached` again from the refactored description, so the comparison and the dry-run response come from an unmutated build (`:2510`).
6. Export build 2 for comparison (`:2514`).
7. Non-dry-run, changed (or older version): **build 3**, the real `update_workflow_from_raw_description` (`:2521`).

On `dev` before #23799 it was one export plus one build. Each build resolves tools, recomputes tool state, and loads subworkflows by `content_id`. Each export walks every step, nested subworkflows included. On big nested workflows (IWC-sized, many steps, `planemo autoupdate` loops over many of them) this may be noticeable. **Nobody has measured it.**

## Proposed direction

Measure first, then pick:

- **Benchmark.** Time `do_refactor` on `dev` and on the branch for a large nested IWC workflow, with `upgrade_all_steps` and a no-op `update_name`. If the overhead is small next to the total request, close this as not worth it.
- **Persist build 2 instead of rebuilding (build 3).** mvdbeek suggested this in #23799's review: separate object construction from persistence. Build the full graph detached (steps, inputs, outputs, PJAs, annotations, connections), and attach that same graph to the session only when saving. That removes build 3 and the growing expunge list in `__module_from_dict` (`:2248`). Bigger change: `update_workflow_from_raw_description` / `_workflow_from_raw_description` interleave construction with `sa_session.add`, `ensure_object_added_to_session` calls in `modules.py`, and `PostJobAction.__init__`.
- **Merge the two source exports (1 and 2).** They differ only by `allow_upgrade`. You could export once with `allow_upgrade=True` and detect pending load-time tool substitutions another way. Smaller saving, and riskier, since #23799 relies on `allow_upgrade=False` for the comparison so a pending substitution counts as a change (`test_refactor_noop_saves_pending_tool_substitution`).
- **Reuse build 1 for the comparison.** This doesn't work as is, because the executor mutates build 1's steps as scratch space. It would only work if the executor stopped writing to model steps.

## Things to check while implementing

- Keep all #23799 tests green: `lib/galaxy_test/api/test_workflows.py -k refactor` (15) and `test/integration/test_workflow_refactoring.py` (32), especially `test_refactor_saves_only_the_new_version`, `test_refactor_of_annotated_subworkflow_step_saves_no_orphan_annotations` and the `_dry_run` helper's "nothing written" checks.
- If you persist the detached graph, make sure nothing from the source version is shared (JSON columns such as `position` were shared before, hence the deep copies). Nested subworkflows resolved by `content_id` are existing persistent objects and must not be copied or re-saved.
- Red-to-green for any restructuring: a test asserting the number of `update_workflow_from_raw_description` calls (or a timing/count probe) before changing the code.
