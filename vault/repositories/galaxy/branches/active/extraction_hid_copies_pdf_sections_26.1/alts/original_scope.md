# Alt: original_scope

Branch `extraction_hid_copies_pdf_sections_26.1_alt_original_scope`, head `6189791f58c`, pushed to the `jmchilton` remote.

The branch as hardened before the scope expansion. 4 commits on `origin/release_26.1` (`19281d57645`):

1. `aa07cf68c2f` Baseline tests: hid extraction connects an implicitly converted input
2. `5c8c0d23489` Route by-ids extraction test helpers through `_extract_by_ids[_raw]`
3. `40125f461e5` Expand `invocation_inputs`/`invocation_outputs` to object ids so PDF export renders them
4. `6189791f58c` Extraction: copies of one original are one input; 400 for unparallel names (plus the per-row `custom_tool_inaccessible` summary flag)

Differs from the expanded branch: no summary-card change. `HistoriesService.create_workflow_extraction_summary` still gives each job-less copy its own input card and lists a copied collection's source HDCA once per copy, so the 26.1 form sends duplicate `hdca_ids` (400) or a source id the user may not reach. `test_extract_with_two_copies_of_one_collection_makes_one_input` and `test_copies_of_job_less_dataset_list_one_input` assert only extraction, not the summary card, and the alt lacks `test_copies_from_a_history_no_longer_shared_extract_by_local_ids` and `test_multi_file_upload_lists_one_input_per_file`.

The expanded branch is this alt plus one commit, `902573855de`.
