Run via Claude Opus at medium effort.

- [x] What does the user see when it fails? Clear, parameter-named errors at load or run time.
  <details>

  - XML or classless YAML tool declaring `reference_data`: `Parameter 'reference': reference_data is only supported in GalaxyTool and GalaxyUserTool YAML tools` (Tool load, `ParameterValueError`); the parameter-model factory raises `ParameterDefinitionError` with the same text. The old text said "only supported in YAML tools", which was wrong for a classless YAML tool.
  - Definition the authoring model rejects (`filter`, `options`, non-bool `multiple`): pydantic `ValidationError` naming the field, raised at load.
  - User tool on a table closed to user tools: the build/form shows no options; running it returns 400 `Parameter 'reference': requires a value, but no legal values defined`. A table closed after submit fails the job with the same message.
  - Adapter path (runtime): `Data table <name> is not configured` / `Data table <name> is not available to user-defined tools`. Unchanged; the check is now `table.readable_by(trusted=...)`.
  </details>
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes.
  <details>

  Tests go through tool load (`create_tool_from_source`), `input_models_for_tool_source`, the user tool contract harness and the API. Parity tests compare the parser's output against each authoring model's `to_internal()` across 33 fixtures × tool class × dump mode, instead of pinning private helpers. Debrief records each non-baseline test going red at its own assertion against dev lib.
  </details>
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. The first five commits (`f65ce85596a`..`a610accbfa8`) are `Baseline tests:` and touch only tests and fixtures.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
