
We're working on /Users/jxc755/projects/repositories/galaxy-brain/vault/projects/history_markdown/EXTRACT_BY_ID_PLAN.md. The final state from the other mode is:

⏺

After studying the model further, I want to pause here before committing to the implicit-map design. Step 2 needs careful navigation of

DatasetCollectionElement

↔ parent

HDCA

(no direct back-link in the model — requires reverse query), and the implicit-map cases need real-DB validation. Pushing further without testing on real data is risky.

Final state for this session

Branch

history_notebook_extract

, 6 new commits:

1787213de2 extract: support hdca_ids inputs in extract_steps_by_ids fd9f63fd71 extract: implement extract_steps_by_ids skeleton (HDA inputs) a0ecf5312e extract: drop eager sa_session capture in BaseWorkflowSummary f0ded11559 extract: scaffold ID-based workflow extraction endpoint df4339e966 extract: lift WorkflowSummary helpers to BaseWorkflowSummary

Plan progress:

- ✅ Step 0:

BaseWorkflowSummary

lift (helpers + warnings only — narrow lift per plan §3a) - ✅ Step 0b: Schema

WorkflowExtractionByIdsPayload

, stubs,

POST /api/workflow/extract

registered,

WorkflowsService.extract_by_ids

- ✅ Step 1 (partially): HDA + HDCA input handling in

extract_steps_by_ids

, 6 unit tests in

test/unit/workflows/test_extract_by_ids.py

(all pass; 97 total workflow unit tests green) - ❌ Step 1 remaining: tool-job branch (joining via

id_to_output_pair

) - ⏸ Steps 2–9: pending

Key open questions for next session:

1. Walk

DatasetCollectionElement

→ parent

HDCA

: model has no direct back-ref. Plan §2 says try without it first; fall back to

JobToInputDatasetCollectionAssociation

. Worth deciding before writing the cleanup walker. 2. Implicit-map representative-job logic in ID path: jobs share

ImplicitCollectionJobs

. New payload may pass any participating job_id — need to detect and look up output HDCA. Plan §4. 3. The plan calls unit tests #1, #3, #4 "unit" but #2 (collection-through-tool), #5 (implicit-map), #6 (copy) are most natural at API/integration level given their DB dependencies. Worth reconciling before writing tests #2/#5 with brittle mocks.






We're working on /Users/jxc755/projects/repositories/galaxy-brain/vault/projects/history_markdown/EXTRACT_BY_ID_PLAN.md. The final state from the other agent is:

-

#6c

—

test_extract_dce_as_data_param_flows_through_as_leaf_hda

✅ DCE → leaf HDA, no HDCA in workflow -

#14

—

test_extract_with_cached_job_cross_history

✅ cached B-side job extracts cleanly -

#15

—

test_roundtrip_basic_by_ids

✅ extract → invoke on fresh history, output verified

11/11

by-ids API tests passing.

On #15b (subworkflow roundtrip):

I held off — couldn't find an existing subworkflow extraction test to port, and subworkflow-ness lives on the

invocation

, not on resulting jobs/datasets, so extraction sees a flat post-run history regardless. I think this can be punted to a follow-up unless you specifically want me to construct the scenario from scratch.

Remaining from plan:

- Step 8 — Vue form: switch to

hda_ids

/

hdca_ids

payload, swap to

extractWorkflowByIds

, update

WorkflowExtractionForm.test.ts

- Step 9 — Selenium roundtrip + back-compat sanity (existing HID suite already green from earlier full run) - #15b subworkflow if wanted


I think dropping subworkflow stuff makes sense for now (update the plan to reflect this please). After that can you continue working on this project.