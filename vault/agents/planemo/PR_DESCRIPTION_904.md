# Warn about input names reserved by Cheetah templates

Tools with a top-level input named `sleep` can fail during command rendering because
Cheetah resolves its template method instead of the input value. Add `InputsNameReserved`
to warn when a top-level parameter or input group uses a name in
`Template.Reserved_SearchList`. This also checks parameter names derived from `argument`.
Nested inputs are accessed through their parent group and remain allowed.

Planemo discovers this linter through galaxy-tool-util; no Planemo code change is needed.
The warning applies across tool profiles and can be skipped with `InputsNameReserved`.

Validation: 121 tests passed across the tool-linter and template suites; pre-commit checks
passed. Tests cover the original rendering crash, argument-derived names, group names,
nested fields, name precedence, and diagnostic XPath. A Planemo CLI smoke check with the
changed linter loaded into its installed runtime returned 1 for `sleep` and 0 for a safe name.

Fixes galaxyproject/planemo#904
