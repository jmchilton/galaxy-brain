# issue_23897_xml_collection_output polish debrief (2026-10-06)

Started at `79355838ae1` and ended at `b2f5b06642c`.

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

## Scope expansion (John, 2026-10-06: "address 1-3 in this branch")
- In `b2f5b06642c`, the XSD `Output` type now uses a new `OutputElement` group: the union of the data children plus `data` (`OutputCollectionData`). Its documentation says which children apply per `type`.
- Aligning `discover_datasets` isn't expressible. XSD 1.0 can't choose a content model by attribute, and Element Declarations Consistent forbids two `discover_datasets` types in one model. The dataset flavour (the superset) stays, and the documentation says `assign_primary_output` doesn't apply to collections. The parser already ignored it there.
- "Cannot set both" is now raised in `_parse_collection` with the attribute names the author wrote and the output name. The structure check in `output_objects.py` stays as the backstop for YAML.
- New `test_outputs_generic_collection_children` (XSD linter). It's red on `dev`'s XSD with `Element 'data': This element is not expected.`
- Local results: test_parsing + test_tool_linters 240 passed, and all 311 test tools pass `.ci/validate_test_tools.sh`.
- The human-read box was re-cleared because new tests and an XSD comment were added after John ticked it.
- A process slip: a `git checkout -- galaxy.xsd` during a red check threw away the uncommitted XSD edit. I re-applied it before committing. Red checks from now on swap files through scratch copies.

## Left over (questions for John)
- The output linters and `tool_util/upgrade` skip generic collection outputs.
- Correct #23897's "never parsed" title and body?
