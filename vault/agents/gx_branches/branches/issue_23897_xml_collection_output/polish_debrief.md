# issue_23897_xml_collection_output polish debrief (2026-10-06)

Started at `79355838ae1` and ended at `2ae7d7908a8`.

## CI
Fork CI on `79355838ae1` was fully queued, with no reds. It needs a new run on `2ae7d7908a8`.

## Housekeeping
The implementation debrief had been written to `gx_branches/issue_23897_xml_collection_output/` and is now in `branches/`. The index link is fixed.

## Checklist (GENERAL only, since this isn't workflow-related)
Every item passed.
- The only fix, in `2ae7d7908a8`: the `structured_like` + discovered-datasets error case moved out of the parity test, which had `pytest.raises` and `continue` branches. It's now a case in `test_collection_output_rejects_invalid_structure`, which covers both spellings and asserts the source XML is unchanged.
- Red check on `dev`'s `xml.py`: 10 of 12 fail. That's all 8 parity cases (lxml `TypeError`), plus the 2 `<output>` rejection cases (a `TypeError`, and `dev` rewriting the element). Both `<collection>` cases pass on `dev`.
- `test_parsing.py`: 105 passed. Black, isort and pre-commit pass. Ruff's formatter only objects to code that was already in the file.
- The new framework tool validates against `galaxy.xsd`. CI's `validate_test_tools.sh` globs it automatically.
- Removing the rewrite changes nothing elsewhere. The output linters and the upgrade code only read `outputs/data` and `outputs/collection`.

## Strengthening (one round)
Applied to the description:
- **Corrected false claims.** "Never parsed" and "always crashed" were wrong.
  - The form arrived in 19.05 (`f5c93e868b7`), and that code had no `unicodify`.
  - stdlib ElementTree accepts a `None` attribute. Galaxy switched to lxml in `f219fa6d823`, first released in 20.05, and v20.01 still used stdlib.
  - So the form very likely worked from 19.05 to 20.01 (inferred, not run) and has crashed since 20.05.
  - The issue's title and body say "never" too.
- **Highlighted lines added:**
  - `<collection>` parsing is unchanged.
  - No tool uses the form, and nobody reported the crash in six years.
  - YAML tools aren't touched.
- **Risks:** changed from two-way to the one-way format, per GX_ASSESSING_RISK ("establishes behaviors for developer artifacts such as tools").
- **Test coverage wording:** fixed. There are 8 combinations, not 9.

## Left over (questions for John)
- The XSD `Output` type allows no static `<data>` child, although the parser and a unit test support one. Add it to the XSD, or drop the test case?
- `Output` uses the dataset-flavoured `discover_datasets`. Align it with the collection one?
- The "Cannot set both type and type_source" message uses the `<collection>` attribute names for the generic form.
- The output linters and `tool_util/upgrade` skip generic collection outputs.
- Correct #23897's "never parsed" title and body?
