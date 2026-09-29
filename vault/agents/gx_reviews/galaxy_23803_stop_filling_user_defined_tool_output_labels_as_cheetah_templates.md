# galaxy #23803 - Stop filling user-defined tool output labels as Cheetah templates

- PR: https://github.com/galaxyproject/galaxy/pull/23803 (mvdbeek, `udt-labels-minimal` -> `release_26.1`, DRAFT)
- Reviewed head: `e17542dd937` (2 commits: `52f12b760c8` refactor, `e17542dd937` fix)
- Worktree: `~/projects/worktrees/galaxy/pr/23803/` (diffed against fresh `release_26.1`, merge-base `15f124e20ca`)
- Verdict: **approve after fixing the red CI test**. Security fix is correct and complete for the label paths; design is clean. One real test failure, one small simplification, one backport question.

## Change summary

UDT output `label` was passed to `fill_template` (full Cheetah = Python in the Galaxy process) at job
creation, at implicit-collection precreation, in the workflow editor (`build_module`), and on the job
parameters page. The PR:

1. Moves label rendering to `Tool.render_output_label()` (all four call sites now go through it).
2. Overrides it in `UserDefinedTool` with `render_user_tool_label()` (`lib/galaxy/tools/expressions/labels.py`):
   regex-only substitution of `$(inputs.<name>[.<key>...])` and `$(runtime.on_string)`. Datasets expose
   only `name` / `element_identifier` / `format`. Anything unrecognized stays as written. No Cheetah, no JS.
3. Base `Tool.render_output_label` raises `ConfigurationError` if `is_unprivileged_tool` (fail closed).
4. Save-time: `label` max 250 chars; `$(inputs.X)` refs in labels join the existing undeclared-input check
   (`_check_input_refs`); shared regex `USER_TOOL_LABEL_REFERENCE_RE` in `tool_util_models/tool_outputs.py`.
5. `ExecutionTracker.precreate_output_collections` builds a nested `label_state` (collections substituted
   through `visit_input_values`) gated by new `Tool.output_labels_read_tool_state` class flag.
6. Docs: authoring help "Output labels" section, schema text, usage example.

## Coverage audit (security)

Every label path I could find now goes through `render_output_label`:

- `DefaultToolAction.get_output_name` (`tools/actions/__init__.py:1095`) - data outputs (line 642) and HDCA outputs (line 1221). Only implementation of `get_output_name` besides the abstract one.
- `ExecutionTracker.output_name` (`tools/execute.py:567`) - implicit mapped collections.
- `ToolModule.get_all_outputs` (`workflow/modules.py:2659`) - editor.
- `managers/jobs.py:get_output_name` - parameters page.

Other Cheetah/eval of UDT-authored strings - checked, not reachable for UDTs:

- `change_format` / `filters`: `ToolOutput.from_dict` and YAML `_parse_output_collection` hard-code `[]`.
- Command/configfiles: `UserToolEvaluator` uses `do_eval` (sandboxed JS); `YamlTemplateConfigFile.eval_engine` is `Literal["ecmascript"]`.
- Version command, param file: no-ops in `UserToolEvaluator`.
- Expression (Python `eval`) validators: rejected by the UDT pydantic model (verified locally: `UserToolSource` refuses `{type: expression}` on a text input). Note though `YamlInputSource` is still built with `trusted=True` for UDTs (`get_input_source` docstring even says `trusted=False` "should be used for user-defined tools (in the future)") - so stored rows are only protected by save-time validation. Out of scope here; possible defense-in-depth follow-up.
- `GalaxyUserTool` class is reserved for `/api/unprivileged_tools` (`managers/tools.py:164`), so `UserDefinedTool` <=> unprivileged; the base-class guard is belt-and-braces and consistent.

XML / admin tools: behavior unchanged (same `fill_template` call, same `tool`/`on_string` context mutation).

## Findings

### High - CI red: new authoring-help example fails its own validator
`client/src/components/Tool/authoringHelp.yml:317-324`. The "Output labels" YAML fragment references
`inputs.reads` and `inputs.num_lines` but declares no inputs, and `_supply_fragment_context` in
`test/unit/tool_util/test_user_tool_authoring_help.py` (symlinked into packages) only infers inputs from
`shell_command` / `configfiles` / tests. Now that label refs are checked, both
`test_documented_yaml_fragments_validate_and_lint[output-labels]` and
`test_documented_commands_and_configfiles_evaluate[output-labels]` fail (Test Galaxy packages, 3.8):

```
references inputs.num_lines but no input named 'num_lines' is declared; references inputs.reads ...
```

Fix: make the example self-contained (it also teaches authors that labels need declared inputs):

```yaml
inputs:
  - name: reads
    type: data
    format: [fastqsanger]
  - name: num_lines
    type: integer
    value: 400
outputs:
  - name: head
    type: data
    format: fastqsanger
    from_work_dir: head.fastq
    label: $(inputs.reads.element_identifier) (first $(inputs.num_lines) lines)
```

(Alternative: teach `_supply_fragment_context` to scan output labels with `USER_TOOL_LABEL_REFERENCE_RE`.)

### Medium - backport scope
`release_25.1` and `release_26.0` both have `UserDefinedTool` and the same
`fill_template(output.label, ...)` in `DefaultToolAction.get_output_name`. PR targets only `release_26.1`.
Worth confirming whether older releases get it (the feature is behind beta tool formats + a role, which
lowers exposure but doesn't remove it). Also note for John (not for the GH body): the PR is public and
describes the injection in plain terms - fine if that was the team's call, but check it's being handled
per the security process for already-released branches.

### Low - `managers/jobs.py:2106` duplicates the label branch
The new `if output.label: return tool.render_output_label(...)` repeats `DefaultToolAction.get_output_name`'s
own branch. The only reason it's needed is that the original call didn't pass `incoming`. Simpler, one
code path:

```python
def get_output_name(tool, output, params):
    try:
        return tool.tool_action.get_output_name(output, tool=tool, params=params, incoming=params)
    except Exception:
        pass
```

(`_get_default_data_name` ignores `incoming`, so no change for unlabeled outputs.)

### Low / optional - `output_labels_read_tool_state` flag
`tools/__init__.py:1001,3463`, `tools/execute.py:699`. A second per-class switch alongside the
`render_output_label` override; the two must be kept in sync by hand. `remap` + `visit_input_values` over
`example_params` is cheap and happens once per mapped submission, so building `label_state` unconditionally
and dropping the flag would leave just the one polymorphic hook. Not blocking.

### Low / optional - doc wording
`authoringHelp.yml:312-315`: "Anything else, such as `${ ... }` or a file path, is kept as written: an
input may not have been written yet when the job is created." The reason only applies to file paths; `${...}`
is kept because labels aren't evaluated. Suggest: "Anything else is kept as written - labels are never
evaluated as JavaScript, and file paths aren't available because an input may not exist yet when the job
is created."

## Design notes (no action required)

- Label syntax deliberately mimics the JS `$(...)` syntax but isn't JS (`$(inputs.n + 1)` works in
  `shell_command`, stays literal in a label). Documented; the PR chose "never fail a job" over save-time
  rejection. Save-time rejection of `$(`/`${` that don't match the grammar (next to
  `_validate_tool_templates` in `managers/tools.py:57`) would give authors earlier feedback - a question,
  not a request.
- Reuse is good: shared regex between model validation and rendering; label refs plug into the existing
  `_check_input_refs` validator instead of a parallel one; rendering hook is polymorphic on the tool class
  (same pattern as `requires_js_runtime`, `tool_type`).
- `_resolve` is tight: mapping-only traversal, `__`-prefixed keys refused, three whitelisted dataset attrs,
  only `str/int/float` rendered. No attribute access on arbitrary objects.
- Imports: all at module top. `labels.py` sits in `tools/expressions/`, which is the JS package - slightly
  odd home but fine.

## Tests

- Ran locally (main repo venv + worktree `lib`): `test_user_tool_labels.py`, `test_tool_render_output_label.py`, label cases in `test_yaml_parameters.py` - 13 passed.
- Red-to-green: `test_user_tool_label_reads_tool_state_not_cheetah_context` (`${1 + 1}` stays literal) and `KEPT_AS_WRITTEN` would fail on base - good.
- API tests (`test_unprivileged_tools_labels.py`) cover data, collection, mapped-over (element_identifier after rename - nice), nested conditional mapping, editor, parameters page. Not run locally (API suite).
- Gap: no API-level test of a Cheetah label on a real UDT run. One case like `"label": "${tool.name} #set x = 1"` in `LABELS`, asserting it's returned verbatim, makes the security property an end-to-end red-to-green test instead of relying on the unit test alone. Cheap to add to the existing `LABEL_TOOL`.
- `test_unprivileged_tool_label_never_cheetah_filled` flips a flag on an XML tool - a guard test, acceptable.
- Unit label tests are pure-function tests of the renderer; appropriate here (no integration substitute is cheaper).

## CI (at review time)

20 pass / 9 fail / 33 pending. Real failures: Test Galaxy packages (3.8, and 3.10 still in progress but
same job) - the authoring-help finding above. The 0s "Test"/"Startup test" failures are
"Canceling since a higher priority waiting request ... exists" (superseded runs), not real.

## Draft GitHub review body

> *Posted by Claude (AI assistant) on behalf of jmchilton - not written by them personally.*
>
> Thanks - this looks right to me. I checked every place a label gets filled (`DefaultToolAction.get_output_name` for datasets and HDCAs, `ExecutionTracker.output_name`, the workflow editor, and the job parameters page), and all four now go through `render_output_label`. I also checked the other ways a UDT string could reach Cheetah or `eval`: `change_format` and `filters` are always empty for YAML outputs, configfiles are ecmascript-only, and expression validators are rejected by the model. None of them is reachable. Putting the reference regex in one place for both save-time validation and rendering, and adding label refs to the existing undeclared-input check, is a nice fit.
>
> **Needs fixing**
>
> - **Test Galaxy packages is red.** The new "Output labels" example in `authoringHelp.yml` uses `inputs.reads` / `inputs.num_lines` but declares no inputs, and `_supply_fragment_context` only infers inputs from `shell_command`/configfiles. Both `test_documented_*[output-labels]` cases fail with `dynamic_tool.undeclared_input_ref`. The simplest fix is to add an `inputs:` block to the example (e.g. `reads` data fastqsanger and `num_lines` integer), which also shows authors that label refs must be declared.
>
> **Suggestions**
>
> - `managers/jobs.py:get_output_name`: the new `if output.label:` branch repeats `DefaultToolAction.get_output_name`. Passing `incoming=params` to the existing `tool.tool_action.get_output_name(...)` call gets the same result with a single code path.
> - Could we add one API-level case with a Cheetah label (e.g. `"${tool.name} #set x = 1"`) to `LABEL_TOOL`, asserting it comes back verbatim? That turns the security property into an end-to-end red-to-green test.
> - Optional: `output_labels_read_tool_state` is a second switch that has to match the `render_output_label` override. Building `label_state` unconditionally in `precreate_output_collections` looks cheap and would let the flag go.
> - Docs nit: "Anything else, such as `${ ... }` or a file path, is kept as written: an input may not have been written yet..." The reason given only covers file paths. `${...}` is kept because labels are never evaluated.
>
> **Question:** `release_25.1` and `release_26.0` have the same `fill_template(output.label, ...)` path for `UserDefinedTool`. Is a backport planned?
