# issue_23891_output_reference_resolver — polish debrief (2026-10-06)

Polished at `b73007851cd` (was `6d6548ee962`; base `dev`, parent #23919 merged).

## CI
- Fork CI on `6d6548ee962` was still queued at start. The only branch-related red from the prior run (mypy `output_collect.py`, `default_format: str | None`) was already fixed and verified locally. The other prior reds were unrelated (cache eviction, Mulled, packages, release script). Fork CI on `b73007851cd` is pending.

## Checklist (GENERAL + WORKFLOW_RELATED)
WORKFLOW_RELATED was included because a dropped reference changes what the workflow editor advertises for a dataset output (`modules.py`). There were no hard fails. Findings:
- The pre-26.2 warning didn't say the reference becomes a load error. **Fixed:** it now ends "Ignoring it; tools with profile 26.2 or newer fail to load."
- The API test variable `pair` was really a list. **Fixed:** renamed to `forward_reverse`.
- Duplicate legacy qualifiers. `qualify_legacy_data_input_reference` (already on dev, used for `type_source`) overlaps `InputReferences`. Left for John; it widens scope.
- `metadata_source` isn't linted. Left for John (open since the parent's polish).

## Strengthening round (one round)
Applied:
- YAML-tool unit test (`test_yaml_tool_references_resolved`): red with the load hook disabled, green with it.
- XSD wording now includes `hidden_data`, matching `OUTPUT_REFERENCE_PARAM_TYPES`.
- API test comment no longer implies `format_source="input"` is blocked.
- Description:
  - The sweep claim is scoped to the swept repos.
  - New bold line: legacy aliases still work at 26.2, #23902 requires qualified names, and `structured_like`/`type_source`/`change_format` are untouched.
  - Admin load warnings for the 22 drops.
  - The test-failure claim is narrowed. The `tool_util` unit tests hit the moved resolver directly, so they don't count as red-on-dev.
  - The editor side effect now says "dataset output".

Left over:
- An end-to-end `metadata_source` collision test (framework/API). Today it's covered only at the unit level (rewritten value).

Checks: 185 unit tests (output references, linters, collect_primary_datasets) pass. mypy is clean on the changed modules. ruff/black/isort and pre-commit pass. The checklist subagent wasn't re-run; the only answer the changes touched (failure text) was updated in the description directly.

## Questions for John
- Lint `metadata_source` before 26.2 makes a bad one a load error?
- ~~Fold `type_source`'s `qualify_legacy_data_input_reference` onto `InputReferences`?~~ Done at `ca3890d94e0` (John asked): the check moved into `_resolve_output_references` and shares its `InputReferences`; the helper is deleted; an ambiguous alias lists every candidate. 180 unit tests pass. `issue_23902` was rebased onto it (two mechanical conflicts: test additions, XSD `metadata_source` sentence), now `435099bdf8c`, with 200 unit tests passing.
- Cover `structured_like`/`change_format` with the same resolution (follow-up)?
- Add an end-to-end `metadata_source` collision test before opening?
