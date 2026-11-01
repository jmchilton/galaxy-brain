Run via Opus 5.5 at low effort.

# Scope evaluation (round 2, after re-scope): issue_24474_collection_input_type_26.2

**Recommendation: keep as implemented.** The branch now covers the issue's six cases on every tool entry point, applies the dropdown's full rule including sample sheet `column_definitions` (D), and fails tool steps fed an incompatible collection at scheduling time rather than at job preparation (narrowed B). That covers the related bugs in touched code that round 1 asked for. The one remaining expansion, checking typed workflow collection inputs (C, now with a "prefix" rule for deeper collections), would mean writing down for the first time which collections workflow inputs accept. Nothing in `accepts()`, `can_map_over()` or the type algebra defines that rule yet, and the first attempt broke three existing workflow tests. That makes it a design change aimed at `dev`, not a modest generalization. Contracting is not worth it either. The user-visible behaviour change John should weigh (a workflow that feeds a `list` into a `paired` tool input now fails, as `rename_based_on_input_collection.gxwf-tests.yml` did) comes from the core tool-parameter fix the issue asks for, not from the expansion. Dropping B or D would leave that change in place and only make the failure later and less clear.

## Possible Decompositions

The branch is about 110 lines of production code plus about 440 lines of tests and test data. The history still contains C being added and then removed (`0595e98bba3`, part of `c3f93b1ee0b`, `66e7474a571`), so any split should squash those commits away. Possible pieces, in landing order:

1. **Baseline tests** (`b50680eaf60`): the accept matrix and `test_build_map_over_collection_input_has_no_error`. These pass on `release_26.2`.
2. **Tool parameter check**:
   - `394b2bfb762`, `c3b8ee63b09`, `50b6778afb6`, `0e98bc2e8a3`, `6ab5e05134f`, `b6791d07a7c`;
   - `1d93e24ec1b`, the gxwf test data fix.

   It contains the `HistoryQuery` `*_type` variants, `_check_collection_type`, the batch exemption, `allow_map_over` for runtime step values, and the tool and step-parameter rejection tests. This is the issue proper, identical to the alt branch. The runtime map-over allowance has to land with it.
3. **Sample sheet columns (D)**: `ac225f311ab` and the sample sheet API test from `2f2a381e7a7`. It is a few lines in `_check_collection_type` and depends on 2.
4. **Scheduling-time rejection (B)**:
   - `map_over.py` `IncompatibleCollectionInput` and `_rejects_incompatible_collection`;
   - the `plan_map_over` translation in `modules.py`;
   - the four invocation-failure and skip tests (`0ab58d1ebb1`, the B parts of `c3f93b1ee0b`/`66e7474a571`, `2f2a381e7a7`, `46648602450`, `97445bc95ec`).

   It depends on 2, because it only moves a failure that 2 creates earlier.

Ways to group them:

- **One PR** (1-4).
- **Two PRs:** 1+2+3 (the issue plus the dropdown's full rule), then 4 (workflow scheduling).
- **Three PRs:** 1+2, then 3, then 4. Item 1 could also be its own PR in front of any of these.

## Scopes considered

### A. As implemented

`DataCollectionToolParameter.from_json` rejects collections that neither match the declared type nor (for workflow runtime values) can be mapped over, and it applies sample sheet `column_definitions` on a direct match. `MapOverPlanner` fails the invocation with `workflow_parameter_invalid` when a tool step outside mapped subworkflow structure gets an HDCA it can neither take nor map over. It skips that check for conditional steps and for steps of skipped subworkflows.

| Pros | Cons |
| --- | --- |
| <ul><li>Closes the issue on legacy, tool-request, form and job-prep paths with one `HistoryQuery` rule</li><li>Run-time rule now equals the dropdown rule (`_classify_hdca`), columns included</li><li>Workflow edges fail as a step-level invocation error with no job created</li><li>Round 2 reviews (normal, Codex, thermo-nuclear, test challenges) found no remaining defects; the subworkflow guard bug was fixed and tested</li></ul> | <ul><li>Real workflows that relied on the bug (such as `list` into `paired`) now fail. This is a release-branch behaviour change, which comes from the core fix</li><li>Typed workflow collection inputs still take any type at request time</li><li>`workflow_parameter_invalid` wording is slightly off for a tool-step edge</li><li>Five-condition skip policy in the planner (named, but still policy in the shared planner)</li></ul> |

### B. Contract to the original scope (the `_alt_original_scope` branch)

Drop D and the scheduling check. Keep only the tool-parameter check, so incompatible workflow edges fail at job preparation.

| Pros | Cons |
| --- | --- |
| <ul><li>About 60 production lines, all in the tool parameter layer</li><li>No planner changes, so no conditional or subworkflow edge cases to reason about</li><li>Already pushed as an alt, so it can be adopted cheaply</li></ul> | <ul><li>The same workflows break as in A, only with a worse failure (a red dataset with `misc_info`, while the invocation still "completes")</li><li>The run-time rule again disagrees with the dropdown on sample sheet columns</li><li>Reverses round 1's expansion without new evidence against B or D</li></ul> |

### C. Contract: drop only the scheduling check (keep D)

Keep the tool-parameter check and D, and drop the `map_over.py` change.

| Pros | Cons |
| --- | --- |
| <ul><li>Removes the scope piece with the most edge cases (`when`, `when_values`, subworkflow structure)</li><li>The job-prep check stays as the backstop, so correctness is unchanged</li></ul> | <ul><li>Same late-failure UX as B for every incompatible edge</li><li>The skip-guard problems are already found, fixed and tested, so dropping it saves little risk now</li></ul> |

### D. Expand: request-time check of typed workflow collection inputs with a "prefix" rule (not recommended here)

Reintroduce C. A typed `data_collection_input` accepts a collection that matches its type, can be mapped over by it, or extends it with more levels (a `list` input takes `list:paired`). Then extend the scheduling check to subworkflow steps using the same rule.

| Pros | Cons |
| --- | --- |
| <ul><li>Closes the other way an undeclared type enters a workflow</li><li>Would let B drop its `step.type == "tool"` exemption (the "real simplification" the thermo-nuclear review names)</li><li>Request-time 400 instead of a scheduling failure</li></ul> | <ul><li>The prefix rule exists today only as behaviour the tests depend on, not as a definition in `HistoryQuery` or `type_description`. Writing it down means deciding what `sample_sheet`, `paired_or_unpaired` and `record` mean as prefixes</li><li>The first attempt broke three existing tests, so the hidden contract is wider than the issue suggests</li><li>The client terminals have their own workflow-input rules. A server rule would need to agree with them, which means a cross-stack change</li><li>Better as a `dev` follow-up issue</li></ul> |

<details><summary>Details</summary>

A rule of "match, or can map over, or the declared type is a `:`-prefix of the supplied type" would reject only unrelated types, such as a `list` into a `paired` input. That is cheap to code. The risk is in the details, not the line count. Is `sample_sheet:paired` a prefix-extension of `list`? Does a `paired_or_unpaired` input take `paired:list`? Do `record` inputs have prefixes at all? Each answer becomes a compatibility promise for every saved workflow. Under the re-scope rules, recommending it would also park the branch on a user decision, for an entry point the issue never named. This is the one expansion worth filing as a separate issue (via `GX_QUEUING_ISSUE_CREATION.md`). It would also cover URL-sourced collections (`DataRequestCollectionUri`) and the sample sheet columns on workflow inputs that review 2 flagged.

</details>

### E. Expand: dedicated `FailureReason` for collection type mismatches (not recommended)

Add a `collection_type_mismatch` invocation failure instead of reusing `workflow_parameter_invalid`.

| Pros | Cons |
| --- | --- |
| <ul><li>Accurate wording in the invocation view</li></ul> | <ul><li>Touches `schema/invocation.py`, the OpenAPI schema and the client message components on a release branch</li><li>The `details` string already names the input, the supplied type and the accepted types</li></ul> |

### F. Expand: reject dataset-only DCEs, match record `fields`, server-side editor validation (not recommended; unchanged from round 1)

Round 1's E, F and G.

| Pros | Cons |
| --- | --- |
| <ul><li>Would close the last unchecked branches of `from_json` and record inputs</li></ul> | <ul><li>Nothing new since round 1. There are no reported symptoms for bare DCEs, no existing rule for `fields`, and the client already checks typed edges</li><li>Each is new behaviour, not a fix in touched code</li></ul> |

### G. Contract: soften enforcement at job preparation for workflow edges (not recommended)

Warn instead of failing when an incompatible collection reaches a tool through a workflow edge, so that existing workflows like the rename test keep running.

| Pros | Cons |
| --- | --- |
| <ul><li>Avoids breaking real workflows on the release branch</li></ul> | <ul><li>Keeps running tools on structures they didn't declare, which is the bug itself</li><li>Needs a request-time versus job-prep flag through `from_json`, which adds complexity</li><li>If John wants this, retargeting to `dev` is a cleaner way to limit the impact</li></ul> |
