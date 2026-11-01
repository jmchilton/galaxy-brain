# Normal review 2 (re-scope)

Run via Opus 5.5 (general-purpose subagent) at default effort, over the re-scope commits `b6791d07a7c..0595e98bba3`.

I acted on all the findings. The full workflow API suite then exposed a problem the review did not catch, and that changed the outcome for C. Its top finding was a regression in B: a conditional step that would have been skipped failed the whole invocation. Fixed by not raising at scheduling time for steps with a `when` expression or inside a conditional mapped subworkflow. Job preparation still rejects the collection if the step actually runs. `test_skipped_step_with_incompatible_collection_does_not_fail_invocation` covers it.

The suite problem: workflow collection inputs take collections deeper than their declared type. A `list` input accepts a `list:paired` (`test_mapping_and_subcollection_mapping`, `test_change_datatype_collection_map_over`, `test_workflow_resume_with_mapped_over_collection_input`). Neither `accepts()` nor `can_map_over()` models that. So I dropped the request-time check of typed workflow inputs (C) entirely, along with its URL and sample sheet column follow-ups. I also limited B to tool steps: subworkflow steps feed workflow input steps, which have the same deeper-collection semantics. The subworkflow rejection test is therefore gone. The positive test `test_typed_collection_input_maps_over_nested_collection` stays.

- **D, a sample sheet with no columns into a parameter that declares columns:** added the unit test.
- **D, columns checked for every directly matched type:** not changed. It mirrors the tool form's `_classify_hdca`, and no shipped tool declares columns alongside non-sample-sheet types.
- **Unit test for `MapOverPlanner` raising:** not added. The API tests cover the raise and the skip conditions end to end.

<details><summary>Full review</summary>

- **HIGH:** B fires before `when` evaluation, so a would-be-skipped conditional step fails the invocation. Before this change such steps became skipped jobs and were never prepared. Fix: don't raise when `step.when_expression` or `progress.when_values` is set.
- **MEDIUM:** B adds an untested rejection for subworkflow steps: an outer HDCA that neither matches the inner typed input nor can be mapped over it. Suggested negative and positive tests.
- **MEDIUM/LOW:** C misses `DataRequestCollectionUri` (URL collections). Its type is known from the request. `src: dce` is not an entry point.
- **LOW:** C ignores sample sheet columns, while the run form (D) checks them.
- **LOW:** D checks columns for every direct match when the parameter declares columns. This mirrors `_classify_hdca`.
- **Tests:** missing a no-columns sample sheet unit test, a `MapOverPlanner` unit test, and a positive C test (typed `paired` input given `list:paired`).
- **Verified fine:**
  - Untyped inputs never raise.
  - gxformat2 untyped inputs store no `collection_type`.
  - DCE, mapped subworkflow, optional and non-implicit-mapping data are skipped.
  - `paired_or_unpaired`/`single_datasets` go through `can_map_over` first.
  - For tool steps outside subworkflow structure, B only rejects what job preparation already rejected.
  - Error translation uses `step.id` inside `execute`.
  - No schema or API changes.

</details>
