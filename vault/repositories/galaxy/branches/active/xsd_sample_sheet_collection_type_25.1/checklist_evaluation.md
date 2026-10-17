# Fresh polish checklist — 2026-10-17

Independent read-only review at `5d35c8c7db348d5c9e2850876a7145ccb06976a8` against `release_25.1` at `2ae14b0eac33c47cc87cc8941cae6270a3c10a01`: no actionable failures. Reviewed full three-file diff, commit history, branch decisions, scope/implementation/review notes, runtime regex and lint runner. General checklist applies; workflow checklist does not, because no editor, scheduler, invocation, mapping or gxformat2 implementation changes.

## John's Checklist

- [ ] Did a human read every test and every comment? Requires human author to check.
- [x] What does the user see when it fails? XSD lint rejects valid sample-sheet declarations and exits nonzero; this fixes that rejection.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A; lint coverage validates the existing core tool declaration, per the requested testing scope.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A; no baseline tests added. The shell refactor is a separate leading commit.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? The libxml2 comments explain alternative ordering that prevents invalid sample-sheet nesting from passing lint.

The real sample_sheet_to_tabular tool is the regression input. CI selection includes plain core tools while excluding internal type-class declarations, which the XSD does not describe. No new unit tests or runtime expansion: John requested lint-only coverage. Retained leading shell refactor `fe374b41698` respects the explicit history decision. The converter change is declaration parity only; nested-record conversion is not implemented. Independent sh syntax and whitespace checks pass; fresh owner lint results are in polish_debrief.md.
