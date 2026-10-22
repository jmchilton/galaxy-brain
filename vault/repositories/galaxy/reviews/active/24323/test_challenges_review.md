# Test challenges review: galaxy#24323

- Profile: gx_test_challenger
- Model: Claude Opus 5.5, low effort
- Reviewed commit: `306cec00874` (diff vs `git merge-base origin/release_26.1 HEAD`)
- Tests not run (no .venv).

Verdict: coverage is solid for a release-branch fix. Loading/merge, filter-before-resolve, first-match `get_field`, reload, and dropdown collapse each have red-to-green-style unit coverage using real `ToolDataTableManager` + temp loc files rather than mocks. Findings are minor.

## P2 1: No API-layer check that tool build payload collapses duplicate choices

The PR explicitly changes tool form/build and workflow editor/run API payloads, but collapse is only asserted via `SelectToolParameter.to_dict` in a unit test. An API test (tool build endpoint on a test tool backed by a data table with duplicate-value rows, e.g. via existing `test/functional/tool-data` fixtures) would lock in the user-visible contract. Optional given release-branch scope; `to_dict` is the single code path feeding those payloads.

## P3 1: `test_static_dropdown_is_unchanged` tests XML parsing, not this change

Its own comment says static option parsing already dedupes, so the new `tool_data_table_name` guard is never exercised by it. Either drop it or rewrite so it fails if the guard were removed (e.g. static options that genuinely survive with duplicate values, if that is possible). As written it's low value.

## P3 2: `test_table_dropdown_keeps_dataset_choices` monkeypatches `get_user_options`

Acceptable, but a real user data-bundle HDA fixture would avoid coupling to the private row shape (`[..., hda]`). Nit; fine to keep.

## P3 3: Heavy parametrization in `test_table_dropdown_collapses_after_filters`

2x3 params x reload loop asserting five things each; failures will be hard to read. Consider splitting the alias/wrapper-warning assertions into a separate test. Nit.
