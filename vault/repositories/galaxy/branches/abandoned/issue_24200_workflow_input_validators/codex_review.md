# Codex review debrief (re-harden)

Both Codex findings at `1066395348f` were acted on in `7f54a696daa`. Nothing was left unaddressed.

1. **P2, confirmed: the form round trip reordered validators.** Hidden validators were always appended after the editor-shown ones. `ToolParameter.validate` stops at the first failure, so the reported error changed: `[negated ^bad, ^good]` reported "must start with good" for "bad". A second hidden field, `extra_validator_positions`, now records each hidden validator's declared position. `validators_from_form` re-inserts them there and appends at the end when positions are missing or malformed. The first round and the re-scope review had documented this as a known limitation; it is now fixed.
   - Tests: order kept through import and editor re-save (regex and range), and the first declared validator reports the error.
   - E2E expectation updated from `[added, negated]` to `[negated, added]`: a row added in the editor goes after the declared hidden validator.
2. **P2, confirmed: malformed validator entries crashed import.** `validators: [null]` gave an `AttributeError` (500) in `_form_can_show`. `validators_to_form` now rejects a non-list or non-object entry with a 400, "Workflow parameter validators must be a list of objects." Tests cover `[None]`, `["regex"]` and `"regex"`.

<details><summary>Raw findings</summary>

- P2 correctness, workflow_parameter_input_definitions.py:112: "The form round-trip changes validator order and the reported error".
- P2 api-contract, workflow_parameter_input_definitions.py:149: "Malformed validator entries crash before import validation runs".

Coverage: the full diff plus the parser, validation, basic, managers/workflows, the workflows API, client FormGeneric.vue and utilities.js. Codex ran 46 unit tests and no API or Selenium tests.
</details>
