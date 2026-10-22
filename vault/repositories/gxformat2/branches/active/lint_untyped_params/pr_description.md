Match Galaxy's `${name}` semantics in untyped parameter lint

The best-practice lint flagged `${...}` in tool state and post-job actions, but only when the string *started* with `${`. That missed `Coverage track on ${on_string}`. It also flagged renames like `${Taxonomic abundance summary table name}`, which Galaxy fills from a declared parameter input.

What Galaxy does (`dev`):

- **Rename (`RenameDatasetAction.newname`)**: `${name}` is replaced anywhere in the string. Galaxy fills it from the run-time `replacement_params` or from a parameter input step with that label (`run_request.py`, `WorkflowProgress.effective_replacement_dict`). Any other name becomes an informal parameter: the run forms prompt for it, and an API run leaves it literal.
- **Other PJA arguments** (tags, etc.): never substituted.
- **Tool state**: only the expanded run form fills `${name}`, client-side. The API never does.

Changes:

- Search the whole string (was `re.match`), matching Galaxy and the TS port.
- Don't warn for a rename that references a declared parameter input label.
- One warning per reference, naming `${name}`, the action, the output, and the fix. The old sentence stays as the prefix, so planemo's substring assertions still match.
- Extract `format2_input_step_type()` from `_build_input_step` so the lint can find parameter inputs.
- New shared declarative fixtures (`synthetic-untyped-params.{ga,gxwf.yml}`): a declared label, a mid-string undeclared name, a data-input label, a non-rename action, `#{input}`, and tool state.

IWC sweep of `lint_best_practices_ga`: before, 2 warnings (mgnify renames that reference declared labels). After, 0.

TS port: jmchilton/galaxy-tool-util-ts branch `lint_untyped_params`.

Refs galaxyproject/foundry#677.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
