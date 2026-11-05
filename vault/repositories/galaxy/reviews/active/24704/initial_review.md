# PR #24704 initial review — default profile

- Profile: `default` (`_shared/reviewers/default.md`)
- Model: claude-opus-5-5, effort medium
- Reviewed commit: `8c28063331f1c0ed8e3bf9d37ddb10e265e385e1` (diff vs `origin/release_26.2`)
- Method: static reading of the diff and surrounding `basic.py` code; no tests run (no venv).

## Verdict

Approve-worthy. Small, targeted fix that extends #14998's list normalization from `from_json` to `to_python`, the path workflow step state takes. Opt-out flag for subclasses that parse separated strings is a reasonable, minimal abstraction. API tests cover both affected paths (editor output list via `ToolModule.get_all_outputs` and step scheduling) and the description says they are red on the base. No P1/P2 bugs found; two minor items below.

## Findings

### P3 1: Base `SelectToolParameter.from_json` also parses separated strings, so the new flag comment is incomplete

The new class-attribute comment says subclasses that parse separated strings in `from_json` opt out. But the base `_select_from_json` itself does so: in runtime context with no legal values (dynamic multiple select while building a workflow) it does `value.split()` on a string (`basic.py` ~L1257-1261, "Split on all whitespace ... browsers use \r\n"). `to_python` now runs first and turns stored `"A\nB"` into `["A\nB"]`, which that branch returns unchanged instead of `["A", "B"]`.

Only legacy step state stored by an old textarea-style editor (or hand-written whitespace-separated state) for a dynamic multiple select would hit this, so practical impact is small. Suggest either documenting the base-class whitespace case as intentionally dropped for stored state, or skipping the wrap when the string contains whitespace/newlines for dynamic selects. At minimum, adjust the comment so it doesn't imply only subclasses split strings. `DrillDownSelectToolParameter` (splits on `\n` in workflow building mode) is correctly opted out.

### P3 2: `group_tag` opt-out has no test

The last commit adds doctests showing `data_column` and `drill_down` keep stored strings, but `SelectTagParameter.stored_string_is_single_option = False` is untested. Its `from_json` splits via `multiple_select_value_split` (newline and comma), so a stored `"a,b"` would break the same way `data_column` did if the flag were dropped. A one-line check alongside the `ColumnListParameter` one would lock it in.

## Notes (no action)

- `""` and `"None"` left as strings is consistent with `_select_from_json`'s "nothing selected" handling; if `"None"` is a real legal option, `from_json` still wraps it.
- `GenomeBuildParameter` inherits the default `True`; dbkeys contain no separators, so wrapping is correct.
- Stored job params for multiple selects are lists since #14998 (`to_json` returns the value), so job rerun/`get_param_values` is unaffected for normal selects.
- Imports: no new imports. Comments are concise. Doctests are author-supplied, not something to request.
