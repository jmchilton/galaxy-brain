# Thermo review — PR #24770

Profile: thermo_review (`_shared/reviewers/thermo_review.md`). Model: Claude Opus 5.5, low effort. Reviewed commit: `8ec2452c3bb` vs `origin/release_26.2`. Code not run.

Verdict: the extraction of `SchedulingDependency` & co. out of `modules.py` is a good move, and the readiness-snapshot idea is a reasonable small abstraction. Two structural issues worth fixing even on a release branch; nothing here warrants a follow-up refactor issue.

### P2 1: Snapshot query duplicated in scheduling monitor

`WorkflowRequestMonitor` (`lib/galaxy/workflow/scheduling_manager.py`) hand-builds the same `coalesce(HDA._state, Dataset.state)` / `extension` / `deleted` / `coalesce(Dataset.deleted, False)` projection that `blocking_dataset()` builds in `lib/galaxy/model/dataset_collections/readiness.py`, then reassembles `ReadinessSnapshot` positionally. The definition of "what a readiness snapshot is" now lives in three places (`dataset_readiness`, `blocking_dataset`, the monitor). Adding a field to the NamedTuple silently breaks equality in only some of them. The 500-ID batching loop and the change-detection also inflate an already long method.

Fix: add `readiness_snapshots(session, hda_ids) -> dict[int, ReadinessSnapshot]` (batching included) to `readiness.py`, share one column-expression helper with `blocking_dataset`, and reduce the monitor block to a comparison loop.

### P2 2: `galaxy.tools` now depends on `galaxy.workflow`

`lib/galaxy/tools/__init__.py`, `tools/actions/__init__.py`, `tools/execute.py` and `tools/parameters/meta.py` gain top-level imports from `galaxy.workflow.scheduling_dependencies`, and `galaxy.exceptions` gains a TYPE_CHECKING import of it. Before, none of these tool modules imported `galaxy.workflow`. Tool input readiness is a tool/model concept that the workflow layer consumes, so the dependency points the wrong way and invites import cycles (`galaxy.workflow.modules` already imports `galaxy.tools`).

Fix: put `DependencyType`/`SchedulingDependency`/the two builder helpers next to `readiness.py` (e.g. `galaxy.model.dataset_collections.readiness` or a small `galaxy.model.scheduling_dependencies`), and keep `galaxy.workflow.scheduling_dependencies` only for `SchedulingDependencies` (or as a re-export). `exceptions` can then reference a model-level type.

### P3 1: `input_readiness_dependencies(value: Any)` isinstance ladder

`lib/galaxy/workflow/scheduling_dependencies.py` dispatches on six runtime types and recurses, with a second loop path for adapters/collections. A persisted `DatasetCollection` goes to SQL while an unpersisted one walks elements in Python, so the same argument types follow two strategies. Type the parameter as a union of what callers actually pass (HDA, DatasetCollection, DCE, CollectionAdapter), and split the SQL path and the in-memory path into named helpers so the recursion only covers the in-memory case.

### P3 2: Unrelated drive-by in `ToolInputsNotOKException`

`id: str` -> `id: int` in `lib/galaxy/exceptions/__init__.py` is correct but out of scope for a release-branch fix; mention it in the PR body or drop it.

### Note for the bug checker (not hunted)

`DatabaseOperationTool.check_inputs_ready` no longer checks collection member states from `dataset_states_and_extensions_summary`. It relies on the new comment saying collection members are already flattened into `input_datasets`. If that holds for every caller (including `require_dataset_ok` -> `ToolInputsNotOKException` for collection members), fine; otherwise this is a behavior change.
