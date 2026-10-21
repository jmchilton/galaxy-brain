# Test challenges review — galaxy#24284

- Profile: gx_test_challenger
- Model: Opus 5.5 (claude-opus-5-5), low effort (release-branch fix)
- Reviewed commit: 7399ba875a9ac05778d177b36b39eabf30cbb9c1 (vs origin/release_25.1)
- Process: GX_PROCESS_CHALLENGE_TESTS.md, REVIEW_DIRECTORY mode. Details are in [test_challenges_debrief.md](test_challenges_debrief.md). Tests were not run locally.

## Summary

The tests sit at the right layers: API plus integration, no unit tests to challenge, and no UI, so no E2E is needed. The fetched-list path is covered under public and private defaults. The dynamic-discovery path (`discover.py`) is covered by an integration test. By reasoning, all three new tests should fail without the fix. The gaps are small.

## Findings

### P2 1: Job-finish permission loop change in `jobs/__init__.py` has no targeted test

The loop now skips `hdas_by_id`, re-queries discovered HDAs, and dedupes by `Dataset` ("Copied HDAs share a Dataset"). No new test covers a job with a precreated output plus discovered outputs, or discovered HDAs that share a Dataset. A regression here would go uncaught, for example precreated outputs losing permissions or the dedup skipping a needed HDA. Suggested fix: add a private-default integration case that runs a framework tool with both a regular output and `discover_datasets` outputs (e.g. `all_output_types.xml` if suitable), then call `_assert_history_datasets_private` with the expected count.

### P3 1: Repeated `GET datasets/{id}` → permissions; add a populator helper

This call appears in the new API test and the new integration helper. It already appeared in `test_extended_metadata.py:112` and `test_datasets.py:319`. Add `DatasetPopulator.get_dataset_permissions(dataset_id)` and use it in the new tests.

### P3 2: API test is weaker than, and overlaps, the integration fetched-list test

`test_fetched_list_elements_get_default_permissions` in `test_dataset_collections.py` covers the same path as the integration test of the same name. The only difference is the default-private config, and the API test checks only `elements`. Either assert the history-wide dataset count, as the integration helper does, or drop the API test in favor of the integration pair.
