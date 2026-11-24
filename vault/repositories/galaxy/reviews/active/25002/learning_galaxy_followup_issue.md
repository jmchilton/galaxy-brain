# Research follow-ups from PR #25002

Reviewed commit `8dd9549cab94b9b3568b098fcc02255faecfcead`, checked against the dev baseline `6864679ef0b0`.

## Stale against the baseline (fix now)

- `vault/research/Component - Galaxy Workflow Expression Context.md`
  - "Context Construction Flow" cites `evaluate_value_from_expressions()` at `modules.py:257-310`. At the baseline it is at `modules.py:468`, so the line refs are stale. Replace them with symbol references.

No other conflicts found. `Component - Post Job Actions`, `Component - Workflow Editor Terminals` and `Component - Format2 Workflows (gxformat2)` match the baseline for the touched code.

## Post-merge activities (if #25002 merges)

- `vault/research/Component - Post Job Actions.md`
  - RenameDatasetAction "Template Features" and "Template Substitution":
    - add `$(inputs.name)`, which takes the value of a connected step input
    - note that `#{}` and `$(inputs.)` are resolved in one regex pass (`RENAME_REFERENCE_PATTERN`) and `${…}` afterwards
  - Document the transient `action_arguments["step_input_values"]` (`STEP_INPUT_VALUES_ARGUMENT`) that the scheduler sets on a copy of the action and never stores. This is a second runtime channel into PJAs beside `replacement_dict`.
- `vault/research/Component - Workflow Editor Terminals.md`
  - Class tree and "The Terminal Factory": add `InputRenameReferenceTerminal` (a subclass of `InputParameterTerminal`, selected by `rename_reference: true`) and its acceptance rules: a single, non-multiple, non-collection `OutputParameterTerminal` of any type.
  - `validInputTerminals()`: it now scans `getCombinedStepInputs`, which includes the derived extra inputs (when gates and rename references), not only `step.inputs`.
- `vault/research/Component - Galaxy Workflow Expression Context.md`
  - `extra_step_state`: an unconnected extra step input now takes its `default_value` (or `None`) instead of indexing `connections[0]`.
  - Note that `$(inputs.x)` in rename text looks like CWL but is a plain regex substitution, not JS evaluation.
- `vault/research/Component - Format2 Workflows (gxformat2).md`
  - In the `out:` / `rename:` example, mention that `rename` may reference `$(inputs.name)` for any `in:` entry, including one that is not a tool parameter.
- `vault/research/Component - E2E Tests - Writing.md`
  - Mention `GALAXY_TEST_PLAYWRIGHT_VIDEO_DIRECTORY` and `GALAXY_TEST_PLAYWRIGHT_SLOW_MO` for recording Playwright runs. They are Playwright-only; `ConfiguredDriver` raises an error for the Selenium backend.
- When the research request `vault/agents/gx_research/todo/workflow_extra_step_inputs.md` is ingested, link the new note from the three component notes above.
