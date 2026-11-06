Run via claude-opus-5-5 at high effort.

- [x] What does the user see when it fails? A rerun whose source is unknown, inaccessible or an invocation of a different workflow is rejected with "Workflow submission failed: …"; links the viewer can't access are hidden, not broken.
<details><summary>Failure modes, from the diff at <code>d66dcdb412b</code></summary>

- **Unknown source id on invoke.** `invoke_workflow` resolves the source with `WorkflowsManager.get_invocation` before any run config is built, so the whole request fails and nothing is created. `test_workflow_invocation_rerun_invalid_source` pins both cases: a malformed id is a 400, and a well-formed id for a missing invocation is a 404 (`USER_OBJECT_NOT_FOUND`, `'<id>' is not a valid workflow invocation id`). It also asserts that neither request created an invocation.
- **Inaccessible source on invoke.** 403 from `check_security` on the source's history (`test_workflow_invocation_rerun_access`, which publishes the workflow so the 403 comes from the source invocation, not the workflow). The message is `History is not accessible to the current user`, which names a history, not the invocation. In the UI both run forms surface it in WorkflowRun's existing "Workflow submission failed: …" alert. A UI user only reaches this if access is revoked between opening the rerun page (which itself needs access) and submitting. The rerun is refused rather than run without lineage.
- **Source from a different workflow on invoke.** 400 (`RequestParameterInvalidException`, "A rerun must run the same workflow as the invocation it reruns.") when the source invocation's top-level stored workflow isn't the one being invoked. An identical copy or an imported copy of a published workflow counts as a different workflow; any version of the same stored workflow is accepted (`test_workflow_invocation_rerun_same_workflow` covers both, and asserts the rejected request leaves the source without a rerun link). The access check runs first, so an inaccessible source is a 403 regardless of its workflow. The UI rerun page invokes the source's own stored workflow at the source's version, so UI users don't reach this.
- **Inaccessible lineage links on view.** `rerun_of_invocation_id` / `latest_rerun_invocation_id` come back `null`; `WorkflowInvocationLineage.vue` renders nothing for a null link. `is_rerun` stays `true`, so the card badge still marks it as a rerun while the detail page shows no banner and an expanded grid row shows no link. A newer private rerun falls back to the newest accessible one (API and unit tests cover both).
- **Source row deleted.** `ON DELETE SET NULL` clears the link, and because `is_rerun` is derived from the column, the invocation stops being marked as a rerun.
- **Migration on existing data.** Adds a nullable column, FK and index with no backfill. Existing invocations read `is_rerun: false` with no links, and earlier reruns aren't reconstructed. Measured on PostgreSQL 16 with 3M rows: about 1.4 s of DDL, with a short write block while the index builds. The SQLite round-trip test covers pre-existing rows, FK enforcement, `SET NULL` and a downgrade that drops the column (and the lineage with it).
- **Imports and request exports.** A model-store import drops lineage (`rerun_of_invocation_id` is never exported, and a planted value is ignored). The `/request` export leaves out lineage, so replaying it creates an independent run.

</details>
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They check access semantics through the public serializer and against `check_security`, and the migration and model-store behavior against real DDL and real imports.
<details><summary>Differential test and one implementation-coupled assertion</summary>

`test_sql_access_clause_matches_check_security` imports the private `_accessible_invocation_clause`, but asserts only that the rows it admits are the ones `WorkflowsManager.check_security` allows. It covers owner, other user, sharee, admin and anonymous viewers on private, importable and shared histories, so it tests the outcome rather than the clause's shape. Ownerless histories are deliberately left out. There, the Python check would let an anonymous viewer in and the SQL clause wouldn't. That's the stricter direction (a link is hidden, never exposed), and invocations can't be created in ownerless histories anyway.

`test_lineage_query_count_is_independent_of_batch_size_and_fanout` calls the private `_invocation_lineage` and asserts `counts == [2, 2]`. That pins the exact query count, not just independence from batch size and fan-out. It's an intentional performance guard. Asserting `counts[0] == counts[1]` with a small bound would hold up better under refactoring. `test_latest_rerun_is_latest_accessible` goes through `serialize_workflow_invocation`; the debrief says it also passed against the earlier `check_security`-based implementation.

</details>
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. The one reshaping of dev code is the leading no-behavior-change commit `9bf74e3ee40`, which existing invocation API tests cover. Everything else is new feature code.
<details><summary>Commit structure</summary>

`9bf74e3ee40` (batch serialization path, no behavior change; `test_workflows.py -k "invocation or cancel"` passed, 33 tests) leads the other twelve commits (thirteen in all). `a16df27f2a7` rewrites the branch's own per-invocation lineage code into batched SQL and adds its access and query-count unit tests in the same commit. `9df72d8d97a` is test-only: the differential access-clause test and the split-out invalid-source API test. `9a8bf84c5ab` adds the same-workflow check to `invoke_workflow` together with its API test and the adjusted access test. The last commit, `d66dcdb412b`, replaces the grid column with the expanded row's compact lineage line and its tests. All of these guard code that exists only on this branch, so the baseline rule doesn't strictly apply. Splitting `test_latest_rerun_is_latest_accessible` into a commit before `a16df27f2a7` would let the history show the commit message's claim that the tests "pass against the previous implementation".

</details>
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? Workflow invocation itself is unchanged unless the caller sends `rerun_of_invocation_id`. Reruns from either run form now record lineage and are refused if the source is inaccessible at submission. An API rerun whose source is an invocation of a different stored workflow (including a copy) is refused with a 400; any version of the same stored workflow is accepted.
<details><summary>Other visible changes</summary>

- Invocation API responses add `is_rerun` (collection and element views). Element views (show, cancel, `?view=element` lists, store import) add `rerun_of_invocation_id` and `latest_rerun_invocation_id`, at a cost of at most two extra queries per batch. Collection views add no queries.
- Expanded rows in all four invocation grids gain a compact line of source and latest-rerun links; collapsed rows don't change. Invocation cards get a "Rerun" badge, and the invocation page gets source and latest-rerun banners.
- No change to scheduling, the job cache, `/request` exports, batch semantics (every batch member gets the same source) or model-store import (lineage is dropped).

</details>
- [x] Who hits this in practice and what is the evidence? Users who iterate with the workflow Rerun button (#20032), and API parameter-sweep scripts. The evidence is the RFC's analysis, not user reports.
<details><summary>Evidence</summary>

#24174 was filed by jmchilton as an RFC (agent-drafted); it has no comments or reactions. The demand behind it is indirect. #11340, "Rerun option for workflows" (simonbray, +2), led to #20032 (ahmedhamidawan, +1, 12 comments). Related open requests: #18696, smoother rerun with cached jobs (ahmedhamidawan, +1); #10039, see outputs of previous invocations (hexylena); and #22144's per-step edit-and-rerun. The issue shows that the source id is known at click time (`/workflows/rerun?invocation_id=…`) and dropped before submission. No user has reported losing track of reruns.

</details>
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes. The issue's own migration-free meta-parameter proposal, an association table and a client-only URL parameter were all rejected in favor of an indexed nullable self-FK.
<details><summary>Alternatives and trade-offs</summary>

- **Meta parameter on `WorkflowRequestInputParameter`** (the RFC's proposal, no migration). Rejected because finding the reruns of an invocation would filter unindexed text, and list markers would need each row's request parameters. The issue's own alternative section prefers the column when reverse lookups are needed, and they are needed here.
- **Association table** (the #20960 landing pattern). An invocation has at most one source, so a nullable column is simpler.
- **Client-only `?rerun_of=` URL parameter, or API-only.** Lost on reload, invisible to the API and lists, or leaves UI reruns without lineage.
- **Per-invocation `check_security` for links.** This was the simpler first implementation. It cost about three queries for each newer foreign rerun (611 statements to show a popular published invocation), so it was replaced with an SQL form of the history access rule (`_accessible_invocation_clause`). The trade-off is a second copy of the access rule. A differential unit test (`test_sql_access_clause_matches_check_security`) compares it with `check_security` across viewer and history-sharing cases, so drift in either copy fails a test. The test doesn't cover access paths it doesn't enumerate, such as a future rule added only to `security_check`.
- **Accept any accessible invocation as the source.** This was the branch's behavior before `9a8bf84c5ab`. It let a rerun link relate runs of unrelated workflows, so the source must now be an invocation of the same stored workflow. Requiring the exact version was also rejected, because a rerun with an edited workflow would lose its lineage.
- **Deferred:** transitive grouping, edited-step metadata and import remapping ([scope evaluation](scope_evaluation.md)).

</details>
