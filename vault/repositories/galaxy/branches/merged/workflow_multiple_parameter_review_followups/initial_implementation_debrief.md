# Initial implementation

Implements the bounded float and text follow-ups in [Marius's review](https://github.com/galaxyproject/galaxy/pull/23992), submitted 2026-10-12 on PR head `c8f9c40bae0`.

- Float: expose and persist the multiple checkbox, make the editor default field multiple, and verify runtime form defaults and submitted list conversion/range validation.
- Text: split scalar newline defaults into rows without trimming or splitting commas; correct error guidance for newline entries already in a list; normalize numeric list defaults to strings, including connected option preselection; reject boolean entries; make required `validate(None)` fail consistently.
- The numeric editor round-trip test failed for float on the base and passed after implementation. Module tests and basic.py doctests: 105 passed.

## Recommendations deliberately kept separate

- Restricted multi-selects with empty-string options: Marius offered documenting this limitation. Keep the list rule rejecting empty entries; connection-free run-request validation cannot reliably distinguish a valid empty option from an invalid blank text row. Selecting an empty-valued tool option through `restrictOnConnections` still returns 400. This rare compatibility limitation belongs in the eventual PR risk discussion.
- Default/subworkflow normalization: already queued in `vault/agents/gx_issues/to_file/workflow_multiple_parameter_default_not_normalized.md`; shared integer/text runtime follow-up, explicitly deferred by Marius.
- Static restriction default preselection: independent work exists on `issue_23980_static_restriction_default`; do not duplicate it here.

## Remaining validation

API, focused Vitest, normal review, test challenges, code quality review, scope evaluation and UI screenshot verification.
