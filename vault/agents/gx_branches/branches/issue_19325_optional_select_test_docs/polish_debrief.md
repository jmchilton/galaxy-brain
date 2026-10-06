# issue_19325_optional_select_test_docs — polish debrief

2026-10-06. Branch `43c808645f9` (on dev `253a4cb0b9c`, 0 behind). XSD docs only.

## CI
Fork CI on the original head all queued; nothing red. New head `43c808645f9` pushed.

## Checklist (GENERAL.md)
Subagent: every item pass or N/A; human-read item left for John. Claims probed by parsing a test tool at profiles 21.05 / 24.2 / 26.1 with `TestsCaseValidation` + `TestsMultipleSelectEmptyValue`. No factual errors; applied optional wording fixes in `43c808645f9`:
- why `value=""` fails (empty string is an option value, legal only with `<option value="">`);
- optional single select fails test validation from 24.2;
- "deprecated" → "linting flags it".
XSD still parses; `parse_gx_xsd.py` renders the new text.

## Strengthening
Description-only fixes:
- #19325's augustus `outputs` is a multiple select (`multiple="True"`), not single — reframed opener paragraph and table.
- Multiple-select `value=""`: lint is an *error* from 24.2 (`TestsCaseValidation` validates at latest profile), not just a warning.
- Table legend; audience line (tool-author reference); "not broken" line notes the pre-existing lint error.
- Context cites #22894 (introduced the pre-26.1 gate, commit `e009ce22616`).
- Manual test: needs Galaxy venv; concrete planemo lint recipe.

## Questions for John (scope)
- Opener: "Fix 🎯 #19325" vs "Toward" — issue's error-presentation complaint (param name not obvious) stays open.
- Separate PR: single-select validation error naming the param and suggesting `value_json="null"`?
- Should `TestsCaseValidation` validate at the tool's own profile? Today a pre-26.1 multiple select with `value=""` lint-errors from 24.2 though it runs fine.
