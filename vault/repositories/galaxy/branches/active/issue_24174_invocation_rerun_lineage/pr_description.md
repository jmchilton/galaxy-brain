Implement 🎯 #24174 - Galaxy records which invocation a workflow rerun came from, and links the two.

Since 🔀 #20032, users iterate on an analysis by clicking **Rerun** on an invocation, changing something and submitting. After a few rounds, nothing tells them which run came from which. The rerun page knows its source (`/workflows/rerun?invocation_id=I`), but that link was dropped before submission. With this PR, the source is sent and stored, and the invocation page links both ways:

![Invocation J, a rerun of I that was itself rerun as K: one banner reads "This invocation is a rerun of an earlier invocation. View source invocation", a second reads "A newer rerun of this invocation exists. View latest rerun"](screenshots/workflow_rerun_lineage_source_3.png)

| Invocation cards                                                                                                                        | Invocations grid                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ![The invocation card list: both reruns carry a Rerun badge, the original has none](screenshots/workflow_rerun_lineage_list_marker.png) | ![An expanded row in the invocations grid: under the "Last updated" line, one line reads "Rerun of an earlier invocation: View source · Newer rerun exists: View latest"](screenshots/workflow_rerun_lineage_grid_expanded.png) |

These come from the new E2E test, which runs I → J through the simple run form and J → K through the expanded one, and reloads each rerun page so the links are shown to persist. The API gets the same link: the invoke payload takes `rerun_of_invocation_id`, so a parameter-sweep script can record lineage too, and the invocation view returns it.

***This uses the issue's listed alternative, a nullable, indexed `workflow_invocation.rerun_of_invocation_id` foreign key with a migration, rather than its migration-free meta-parameter proposal. With a meta parameter, the "newer rerun" link would mean filtering unindexed text across every invocation's request parameters, and the list markers would mean loading each row's request parameters. The column serves both from the invocation row and an index.***

***Lineage here is direct links only: J links to its source I, and I links to its newest rerun. Galaxy doesn't group a whole lineage together in lists, link I straight to K, or record which step was edited.***

***Each link appears only when the viewer could already open the linked invocation. A newer private rerun by someone else is skipped, not revealed. List views add no queries; a single invocation view adds at most two.***

***A rerun must run the same workflow as its source, in any version, so rerunning after editing the workflow keeps the link. The server rejects a source from a different workflow, including an identical copy, with a 400. Reruns from the UI always run the source's own workflow.***

***Invoking a workflow is unchanged unless the caller sends `rerun_of_invocation_id`. Existing invocations are not backfilled. `GET /api/invocations/{id}/request` stays a clean template, so replaying J's request doesn't label the new run a rerun of I. History and invocation imports drop lineage rather than carry a database id that means something else on another server.***

<details><summary>What a viewer sees, and what they don't</summary>

- **Access.** Each link is shown only when the viewer can access the linked invocation, using the usual invocation rule (the invocation's history is owned by the viewer, importable, or shared with them, or the viewer is an admin). A rerun can target a different history from its source, so each side is checked separately.
- **"Latest rerun".** This is the newest direct rerun the viewer can access. When the newest is private to someone else, the link falls back to the next accessible one.
- **Markers.** `is_rerun` is on every invocation view and drives the card badge. It stays `true` when the source has become inaccessible to the viewer: the badge still shows, but the detail page has no source banner.
- **Invocation grids.** Collapsed rows show no rerun marker. Expanding a row in any of the four invocation grids shows the links as one compact line, because the expanded row is where the invocation's element view is loaded. A link the viewer can't access is left out of that line.
- **Deleted sources.** The foreign key is `ON DELETE SET NULL`: deleting a source's row clears its reruns' links.
- **Submitting.** On invoke, the server loads the source with the normal invocation access check before building any run config. A malformed id fails the whole request with 400, a missing invocation with 404, an inaccessible one with 403, and a source from a different workflow with 400. Both run forms show these errors in their existing "Workflow submission failed" alert. A batch invoke gives every invocation it creates the same source.

</details>

<details><summary>Cost</summary>

Collection views, which back the grid, the card list and every other client list, add no queries. Element views resolve lineage for the whole batch in at most two queries, one for accessible sources and one ranked query for the newest accessible rerun of each invocation. The history access rule is applied in SQL rather than loaded per related invocation. A first, per-invocation version cost 611 statements to show a published invocation that 200 other users had rerun; this one costs 10, against 8 without lineage. On PostgreSQL 16 with 3M invocations the lineage queries take 0.1–0.3 ms, and the migration's DDL took about 1.4 s.

</details>

<details><summary>How the branch is organised</summary>

Fourteen commits:

1. Refactor: `serialize_workflow_invocations` holds the serialization loop and `serialize_workflow_invocation` delegates to it. No behavior change on `dev`.
2. Model, migration, invoke payload, source validation, run-config propagation, the element-view lineage fields, API, migration and model-store tests.
3. Client: both run forms submit the source, plus the lineage banners, the card badge and the grid column.
4. to 8. Review, test and E2E follow-ups, plus CI typing fixes.
9. Batched lineage resolution, with the access rule in SQL, plus unit tests for access semantics and query counts.
10. Typing fixes for 9.
11. A differential test of the SQL access clause against `check_security`, and separate 400 and 404 tests for invalid sources.
12. The same-workflow rule for rerun sources, with its API test.
13. Replaces the grid column from 3 with a compact lineage line in the expanded row, with unit tests and E2E coverage of its links.
14. Drops the migration test from 2 and the lineage unit tests from 9 and 11.

</details>

## Risks

The one-way doors are the new `workflow_invocation.rerun_of_invocation_id` column and four API fields: `rerun_of_invocation_id` on the invoke payload, and `is_rerun`, `rerun_of_invocation_id` and `latest_rerun_invocation_id` on invocation responses. Once scripts and stored invocations rely on them, their names and meaning have to be kept.

<details><summary>Risk Details</summary>

- The migration adds a nullable column, a self foreign key (`ON DELETE SET NULL`) and an index to `workflow_invocation`, with no backfill. Removing it later drops recorded lineage. The index is built without `CONCURRENTLY`, as is usual for Galaxy migrations, so very large servers get a short write pause (about 0.8 s per 3M rows measured locally).
- `latest_rerun_invocation_id` means "newest direct rerun this viewer can access". Widening it later to transitive lineage or grouping would change what the field means.
- The SQL access clause (`_accessible_invocation_clause` in `services/invocations.py`) is a second copy of the history access rule in `security_check`, and no test compares the two, so a change to one has to be made in the other by hand. `test_workflow_invocation_rerun_access` covers inaccessible links through the API. The one deliberate gap is an anonymous viewer and an ownerless history, which `security_check` allows. Workflows can't be run anonymously, so no invocation lives in such a history.
- A rerun whose source becomes inaccessible between opening the rerun page and submitting is refused, rather than run without lineage.
- Lineage doesn't survive history or invocation export and import.

</details>

<details><summary>Risk Review Advice</summary>

Review the data and API contract first: the migration and model column, the three response fields and the payload field in `schema/invocation.py` and `schema/workflows.py`, and whether a direct self-reference is the shape Galaxy wants to keep. `test_workflow_invocation_rerun_lineage`, `test_workflow_invocation_rerun_access`, `test_workflow_invocation_rerun_same_workflow` and `test_workflow_invocation_rerun_invalid_source` in `test_workflows.py` pin the API behavior.

Then read `_accessible_invocation_clause` against `managers/base.py::security_check`, which it mirrors, and the ranked query in `_invocation_lineage`.

</details>

## Context

Follow-up to 🔀 #20032 (fixing 🎯 #11340), which rebuilds a rerun's request from an earlier invocation but kept no link to it. 🔀 #20960's landing-request link is the closest precedent for recording where an invocation came from. Related to 🎯 #18696 and 🎯 #10039, which ask for smoother rerun iteration and for comparing runs across invocations. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [John's Agentic Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All general and workflow-related items pass.</summary>

- [x] What does the user see when it fails? A rerun with an inaccessible, unknown or different-workflow source is rejected with "Workflow submission failed: …". Links the viewer can't access are hidden, not broken.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The model-store test checks lineage against real imports. Access semantics are covered by API tests.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. The one reshaping of dev code is the leading no-behavior-change commit, which existing invocation API tests cover.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? Invoking is unchanged unless the caller sends `rerun_of_invocation_id`. Reruns from either run form now record lineage. A source must be accessible and an invocation of the same workflow.
- [x] Who hits this in practice and what is the evidence? Users who iterate with the workflow Rerun button (🔀 #20032), and API parameter-sweep scripts. The issue traces where the rerun page drops the source link, and 🎯 #18696 and 🎯 #10039 ask for the run history this link makes possible.
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes. These were all rejected in favor of an indexed nullable self foreign key:
  - the issue's own migration-free meta-parameter proposal, because reverse lookups would filter unindexed text and list markers would load each row's request parameters;
  - an association table, because an invocation has at most one source;
  - a client-only URL parameter, because it is lost on reload and invisible to the API.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24174_invocation_rerun_lineage/pr_checklist/). Run via claude-opus-5-5 at high effort.

</details>

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the direct-lineage scope: persistent source links, accessible newer-rerun hints, markers and both run forms.</summary>

The indexed self foreign key is one of the issue's named alternatives and suits the reverse lookups. Transitive grouping, edited-step metadata and import remapping were weighed and left out. For I → J → K, K links to J and J links to I; following the links exposes the chain, but I doesn't link straight to K.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24174_invocation_rerun_lineage/scope_evaluation/).

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No blockers; request context is now required for both invocation serializers.</summary>

The element-view lineage fields depend on the viewer, and the serializers had accepted `trans=None` and silently left lineage out in that mode. Both now require `trans`, and no caller lacked it. The review found the self-reference the minimal model and the existing modules cohesive enough to need no decomposition.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24174_invocation_rerun_lineage/thermo_nuclear_review/).

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Thin mocked wiring tests replaced by real browser coverage; migration and model-store tests kept and strengthened.</summary>

- A mocked component test for the banner and a mocked rerun case in `WorkflowRunForm.test.ts` were dropped. The E2E test covers that wiring through a real browser and server, across both run forms, and adds assertions on the links in the grid's expanded row.
- The migration test was kept, because an API test on an already-migrated server can't check pre-existing rows, the foreign key and index, `SET NULL` or the downgrade.
- The model-store test now checks that exports omit the lineage id and that imports discard a planted one.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24174_invocation_rerun_lineage/test_challenges_debrief/).

</details>

### ✅ [N.O.T. M.A.R.I.U.S. Performance Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_PERFORMANCE.md)

<details><summary>Fixed an N+1: element-view lineage now takes at most two queries per batch (611 → 10 statements for a heavily rerun invocation).</summary>

The first version checked access on each related invocation in Python, loading its history, owner and shares. Lineage is now resolved per batch, with the history access rule in SQL. Collection views add no queries. On PostgreSQL 16 with 3M invocations the reverse lookup uses the new index, at 0.1–0.3 ms per show or 50-row page. A composite index and `CONCURRENTLY` were considered and not needed.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24174_invocation_rerun_lineage/performance_challenges_debrief/). Run via claude-opus-5-5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>No defects found.</summary>

Codex reviewed the full diff, the invocation service and run request modules, and the security check.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24174_invocation_rerun_lineage/codex_review/). Run via gpt-6.1-sol.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>One leading refactor commit: the batch serialization path, with no behavior change on <code>dev</code>.</summary>

`serialize_workflow_invocation` now delegates to `serialize_workflow_invocations`, which holds the loop. Existing invocation API tests pass on that commit alone. The feature commits were replayed on top, with the final tree unchanged.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24174_invocation_rerun_lineage/baseline_refactor/). Run via claude-opus-5-5 at high effort.

</details>

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- API (`lib/galaxy_test/api/test_workflows.py`): `test_workflow_invocation_rerun_lineage` covers persistence, list and element views, batch runs, latest-rerun ordering and request-export independence. `test_workflow_invocation_rerun_access` covers inaccessible sources and links. `test_workflow_invocation_rerun_same_workflow` checks that a copy of the workflow is rejected and a newer version accepted. `test_workflow_invocation_rerun_invalid_source` checks that a malformed source id gets a 400 and a missing invocation a 404, and that neither creates an invocation.
- Client: `WorkflowInvocationLineage.test.ts` covers the banners and the compact line, and `WorkflowInvocationState.test.ts` checks that only non-full-page views are compact.
- Unit: `test/unit/data/model/test_model_store.py` (imports drop lineage).
- E2E: `lib/galaxy_test/selenium/test_workflow_rerun.py::TestWorkflowRun::test_workflow_rerun_lineage` (both run forms, both link directions, card badges, links in the grid's expanded row).

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
