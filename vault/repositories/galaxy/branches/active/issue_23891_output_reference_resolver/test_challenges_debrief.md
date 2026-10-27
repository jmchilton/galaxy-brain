# Test challenges debrief (round 3, post-rescope)

Top line: no changes. New `test_outputs_metadata_source` holds up; earlier tests unchanged since round 2 and still pass. HEAD unchanged at `886d8ffd327`.

## New since previous round

- **`test_outputs_metadata_source`** (`test/unit/tool_util/test_tool_linters.py`): one fixture, six outputs covering missing ref, non-data (collection) target, unqualified warn, selector on non-collection, discovered-unqualified error, and a clean qualified ref. Standard linter message pattern, no mocks. Linter is XML-only, so no API/framework layer fits better. Kept.
  - Red check: restored `linters/output.py` from `HEAD~1`; test fails at its first assertion (only an XSD message present), not on import. Good.
- **`test_list_linters`** row for `OutputsMetadataSourceReference`: required registry update. Kept.

## Rest of branch

Re-challenged per round 2 debrief (`earlier_drafts/2/test_challenges_debrief.md`); conclusions stand. No mocks/SimpleNamespace, API test uses populators, no E2E surface.

## Not acted on

- No test for `metadata_source` selector on a collection input (format_source-only collection-selector branch is skipped for metadata_source; `output_reference_problem` covers it). Minor; left.
- Shadowed-legacy discovered case only tested for format_source; shared code path. Left.

Verified: linter (metadata/format_source, list_linters) + both `test_output_references.py` files: 17 passed.
