# Debrief: job cache ignores element identifier for plain inputs

Source: `job_cache_ignores_element_identifier_for_plain_inputs.md` (repro run on dev 51e0a80a0db with a throwaway API test). Related fix branch: `udt_element_identifier_api_test`.

## Research (reviewer verified on origin/dev 2527d009dfa)
- `_build_stmt_for_hda` adds the `|__identifier__` condition only when the request has an identifier. Otherwise it relies on `require_name_match`, which always holds for the same dataset.
- The parameter comparison and the count check skip `|__identifier__` keys.
- The reverse direction is guarded.
- `DatasetFilenameWrapper.element_identifier` falls back to the dataset name.
- `identifier_single` and `test_search_handle_identifiers` exist.
- No duplicates. #23570, #21676 and #6887 are about the job cache but unrelated.

## Rewrite
- Restyled to GX_ISSUE_DESCRIPTIONS: a table repro, cause in details, context, and Alternatives (allow the hit when the identifier equals the name).
- Reviewer adapted the repro to `TestJobsApi`: `history_id` fixture, `run_tool`, renamed `test_cached_job_plain_run_skips_mapped_job`.
- Reviewer corrected "only turns wrong hits into misses": the guard also loses rare correct hits for tools that ignore `element_identifier`.

## Unresolved
- The adapted test wasn't re-run. The original throwaway version failed on dev as described.
