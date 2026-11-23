Profile gx_risk_assessment, Claude Opus 5.5, low effort, reviewed commit 8ec2452c3bb.

Risks are mostly two-way: the change is internal to workflow scheduling (no API, schema, or workflow-format change), but it lands on release_26.2 and changes when delayed invocations are re-evaluated, so a mistake shows up as stalled invocations in production rather than as a test failure.

<details><summary>Risk Details</summary>

- An invocation now sleeps until one chosen blocking HDA's (state, extension, deleted, dataset deleted) snapshot changes. Any readiness-relevant change outside that tuple (e.g. another member failing, metadata finishing without a state change) is not noticed until the blocker moves, so a step can wait longer than before. The PR description acknowledges this for failures.
- `DatabaseOperationTool.check_inputs_ready` no longer reads collection state summaries. It relies on collection members already being flattened into `input_datasets`. If any caller passes collections without flattened members, `require_dataset_ok` / pending checks for those collections are silently skipped and the tool runs on non-ready inputs.
- The auto/_sniff_ extension check now asks for a member in a non-ready or paused state with the unresolved extension, instead of any non-ready member. A collection whose unresolved members are all terminal now proceeds to the datatype lookup instead of waiting. The semantics change, not only the tracking.
- `ToolInputsNotReadyException` raised without `dependencies` (other tools, other call sites) still becomes an untracked delay retried every pass. Behavior there is unchanged, but the busy-loop fix only covers the call sites this PR touched.
- `SchedulingDependency` and friends move from `galaxy.workflow.modules` to `galaxy.workflow.scheduling_dependencies`, with no re-export. Out-of-tree importers (scheduler plugins) break on a point release.
- `ToolInputsNotOKException` `id` annotation changes from `str` to `int`. Type-only, but it is on an exception that reaches API error payloads.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should focus on `scheduling_manager.py`'s new readiness polling and the `input_readiness_dependencies` / `blocking_dataset` pair: confirm every way a blocked step can become runnable (or fail) changes the snapshot of the selected HDA, and that a missing row (purged/deleted HDA) correctly wakes the invocation. A wrong answer here stalls invocations indefinitely instead of failing them.

Also confirm that every path into `DatabaseOperationTool.check_inputs_ready` flattens collection members into `input_datasets`, and that the change to the `auto`/`_sniff_` extension check (only non-ready or paused members with that extension block) is intended for a release-branch fix. Because this targets 26.2, the module move without a compatibility re-export is worth a deliberate decision.

</details>
