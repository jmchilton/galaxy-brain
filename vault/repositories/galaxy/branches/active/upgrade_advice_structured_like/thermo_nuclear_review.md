# Thermo-nuclear review debrief

Acted on 1 finding: extracted `tool_requests_provided_metadata(tool_source, outputs)` in `parser/output_objects.py`, used by both `AbstractTool._uses_tool_provided_metadata` and 26.2 advice; deleted upgrade-local `_requests_tool_provided_metadata` (commit on branch after 1b951469a3d). Tests green (206 passed), mypy parity with base on touched files.

## Not acted on

- `upgrade/` imports `InputReferences`/`writes_galaxy_json` from `linters/_util.py` (layer leak) - known; #23891/#23902 plan to move to `parser/output_references.py`. Don't relocate here.
- `validate_test_cases_for_tool_source` now has both `use_latest_profile` and `profile` - overlapping modes. Collapsing means touching lint/script/test callers outside scope; `profile` wins when given, so contract is clear.
- 26.1 test-validation diff zips before/after by index - relies on stable test ordering from the same tool_source; true by construction.
- 26.0 uses `tool_xml.findall` directly while others use `_find_all` - cosmetic; it already needs raw `xml_tree` for `InputReferences`.
- No file crosses 1k lines (upgrade/__init__.py ~400, output.py shrank).

<details><summary>Full review</summary>

Verdict: approve with one structural fix. Diff is mostly well-shaped: walker extraction shrinks output.py by ~100 lines, `output_uses_tool_provided_metadata` lifted from a nested closure into the canonical parser module, `writes_galaxy_json` shared between linter and advisor, and two latent bugs fixed (`_find_all` ignoring xpath, empty 21.09 code).

1. Duplicate opt-in logic (acted): `_requests_tool_provided_metadata` re-implemented `parse_provided_metadata_is_explicit() or any(output_uses_tool_provided_metadata ...)` already inside `AbstractTool._uses_tool_provided_metadata`. Two copies of "what counts as opting in" will drift when 26.2 semantics change. Extract one helper beside `output_uses_tool_provided_metadata`.
2. Layer leak (known): advisor depending on `linters._util` - canonical home is parser; planned elsewhere.
3. Mode overlap in `validate_test_cases_for_tool_source` (`use_latest_profile` + `profile`): a single `profile` param with callers passing `LATEST` would delete a boolean mode. Nit-level given caller spread.
4. Advice classes are flat, each focused; no spaghetti growth in shared flows. `<=` skip fix is a one-char semantic change with test coverage.
</details>
